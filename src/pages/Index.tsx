import { useState, useEffect } from "react";
import { GameCanvas, Difficulty } from "@/components/GameCanvas";
import { DifficultySelection } from "@/components/DifficultySelection";
import { BackdropShop, Backdrop } from "@/components/BackdropShop";
import { BallShop, BallSkin } from "@/components/BallShop";
import { Achievements, Achievement } from "@/components/Achievements";
import { DailyChallenges, DailyChallenge } from "@/components/DailyChallenges";
import { RestorePurchases } from "@/components/RestorePurchases";
import { useToast } from "@/hooks/use-toast";
import { checkPurchaseRedirect, clearPurchaseParams, verifyPurchase } from "@/lib/stripePayments";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showBallShop, setShowBallShop] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [showRestorePurchases, setShowRestorePurchases] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [ownedBackdrops, setOwnedBackdrops] = useState<string[]>(["default"]);
  const [currentBackdrop, setCurrentBackdrop] = useState("default");
  const [ownedBalls, setOwnedBalls] = useState<string[]>(["default"]);
  const [currentBall, setCurrentBall] = useState("default");
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "first_1000",
      name: "Score Master",
      description: "Score 1000 points in a single game",
      requirement: 1000,
      progress: 0,
      unlocked: false,
      reward: "golden-ball",
      icon: "trophy"
    },
    {
      id: "play_50",
      name: "Marathon Player",
      description: "Play 50 games",
      requirement: 50,
      progress: 0,
      unlocked: false,
      reward: "platinum-ball",
      icon: "star"
    },
    {
      id: "streak_10",
      name: "On Fire",
      description: "Hit 10 consecutive throws",
      requirement: 10,
      progress: 0,
      unlocked: false,
      reward: "fire-ball",
      icon: "flame"
    },
  ]);

  // Initialize daily challenges
  const initializeDailyChallenges = (): DailyChallenge[] => {
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now
    
    return [
      {
        id: "bullseye_5",
        title: "Bullseye Master",
        description: "Hit 5 bullseyes in any game today",
        goal: 5,
        progress: 0,
        completed: false,
        coinReward: 500,
        expiresAt
      },
      {
        id: "score_500",
        title: "High Scorer",
        description: "Score 500 points in a single game",
        goal: 500,
        progress: 0,
        completed: false,
        coinReward: 300,
        expiresAt
      },
      {
        id: "perfect_streak",
        title: "Perfection",
        description: "Hit 5 consecutive throws without missing",
        goal: 5,
        progress: 0,
        completed: false,
        coinReward: 400,
        expiresAt
      }
    ];
  };

  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>(initializeDailyChallenges());

  useEffect(() => {
    const initializeGame = () => {
      // Load from localStorage
      const storedBackdrops = localStorage.getItem('ownedBackdrops');
      if (storedBackdrops) {
        setOwnedBackdrops(JSON.parse(storedBackdrops));
      }
      const storedCurrentBackdrop = localStorage.getItem('currentBackdrop');
      if (storedCurrentBackdrop) {
        setCurrentBackdrop(storedCurrentBackdrop);
      }
      
      const storedBalls = localStorage.getItem('ownedBalls');
      if (storedBalls) {
        setOwnedBalls(JSON.parse(storedBalls));
      }
      const storedCurrentBall = localStorage.getItem('currentBall');
      if (storedCurrentBall) {
        setCurrentBall(storedCurrentBall);
      }
      
      const storedAchievements = localStorage.getItem('achievements');
      if (storedAchievements) {
        setAchievements(JSON.parse(storedAchievements));
      }
      
      const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0', 10);
      const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0', 10);
      const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0', 10);
      const coinsBonus = parseInt(localStorage.getItem('game-coins-bonus') || '0', 10);
      const coinsSpent = parseInt(localStorage.getItem('game-coins-spent') || '0', 10);

      const storedChallenges = localStorage.getItem('curbball_dailyChallenges');
      if (storedChallenges) {
        const parsedChallenges = JSON.parse(storedChallenges) as DailyChallenge[];
        const now = Date.now();
        if (parsedChallenges[0]?.expiresAt < now) {
          const newChallenges = initializeDailyChallenges();
          setDailyChallenges(newChallenges);
          localStorage.setItem('curbball_dailyChallenges', JSON.stringify(newChallenges));
        } else {
          setDailyChallenges(parsedChallenges);
        }
      }
      
      setCurrentCoins(coinsEasy + coinsMedium + coinsHard + coinsBonus - coinsSpent);
      setIsLoading(false);
    };

    initializeGame();
  }, []);

  // Handle Stripe purchase redirect
  useEffect(() => {
    const handlePurchaseRedirect = async () => {
      const { isPurchaseSuccess, isPurchaseCancelled, itemId, itemType, sessionId } = checkPurchaseRedirect();
      
      if (isPurchaseCancelled) {
        toast({
          title: "Purchase Cancelled",
          description: "Your purchase was cancelled.",
        });
        clearPurchaseParams();
        return;
      }
      
      if (isPurchaseSuccess && sessionId && itemId && itemType) {
        // Verify the purchase with Stripe
        const result = await verifyPurchase(sessionId);
        
        if (result.success && result.itemId) {
          // Unlock the purchased item
          if (result.itemType === 'ball') {
            const newOwned = [...ownedBalls, result.itemId];
            setOwnedBalls(newOwned);
            setCurrentBall(result.itemId);
            localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
            localStorage.setItem('currentBall', result.itemId);
            toast({
              title: "🎉 Ball Skin Unlocked!",
              description: `Your new ball skin is now available!`,
              duration: 5000,
            });
          } else if (result.itemType === 'backdrop') {
            const newOwned = [...ownedBackdrops, result.itemId];
            setOwnedBackdrops(newOwned);
            setCurrentBackdrop(result.itemId);
            localStorage.setItem('ownedBackdrops', JSON.stringify(newOwned));
            localStorage.setItem('currentBackdrop', result.itemId);
            toast({
              title: "🎉 Backdrop Unlocked!",
              description: `Your new backdrop is now available!`,
              duration: 5000,
            });
          }
        } else {
          toast({
            title: "Purchase Verification Failed",
            description: "Please contact support if you were charged.",
            variant: "destructive",
          });
        }
        
        clearPurchaseParams();
      }
    };
    
    handlePurchaseRedirect();
  }, [ownedBalls, ownedBackdrops, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
        <div className="text-center">
          <img 
            src="/curbball-logo.png" 
            alt="Curb Ball" 
            className="w-full max-w-sm mx-auto drop-shadow-2xl animate-pulse"
          />
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const handlePurchaseWithCoins = (backdrop: Backdrop) => {
    const newOwned = [...ownedBackdrops, backdrop.id];
    setOwnedBackdrops(newOwned);
    setCurrentCoins(prev => Math.max(0, prev - backdrop.coinPrice));
    setCurrentBackdrop(backdrop.id);

    // Persist the deduction so coins don't reappear on reload
    const prevSpent = parseInt(localStorage.getItem('game-coins-spent') || '0', 10);
    localStorage.setItem('game-coins-spent', (prevSpent + backdrop.coinPrice).toString());
    localStorage.setItem('ownedBackdrops', JSON.stringify(newOwned));
    localStorage.setItem('currentBackdrop', backdrop.id);
  };

  const handlePurchaseWithMoney = (backdrop: Backdrop) => {
    const newOwned = [...ownedBackdrops, backdrop.id];
    setOwnedBackdrops(newOwned);
    setCurrentBackdrop(backdrop.id);
    
    // Save to storage
    localStorage.setItem('ownedBackdrops', JSON.stringify(newOwned));
    localStorage.setItem('currentBackdrop', backdrop.id);
  };

  const handleSelectBackdrop = (backdropId: string) => {
    setCurrentBackdrop(backdropId);
    localStorage.setItem('currentBackdrop', backdropId);
  };

  const handleBallPurchaseWithCoins = (ball: BallSkin) => {
    const newOwned = [...ownedBalls, ball.id];
    setOwnedBalls(newOwned);
    setCurrentCoins(prev => Math.max(0, prev - ball.coinPrice));
    setCurrentBall(ball.id);

    // Persist the deduction so coins don't reappear on reload
    const prevSpent = parseInt(localStorage.getItem('game-coins-spent') || '0', 10);
    localStorage.setItem('game-coins-spent', (prevSpent + ball.coinPrice).toString());
    localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
    localStorage.setItem('currentBall', ball.id);
  };

  const handleBallPurchaseWithMoney = (ball: BallSkin) => {
    const newOwned = [...ownedBalls, ball.id];
    setOwnedBalls(newOwned);
    setCurrentBall(ball.id);
    
    // Save to storage
    localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
    localStorage.setItem('currentBall', ball.id);
  };

  const handleSelectBall = (ballId: string) => {
    setCurrentBall(ballId);
    // Auto-add to owned if it's an achievement ball
    if (!ownedBalls.includes(ballId)) {
      const newOwned = [...ownedBalls, ballId];
      setOwnedBalls(newOwned);
      localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
    }
    localStorage.setItem('currentBall', ballId);
  };

  const updateAchievementProgress = (achievementId: string, newProgress: number, maxScore?: number) => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (achievement.id === achievementId) {
          const progress = Math.max(achievement.progress, newProgress);
          const unlocked = progress >= achievement.requirement;
          
          // Check if newly unlocked
          if (unlocked && !achievement.unlocked) {
            toast({
              title: "🏆 Achievement Unlocked!",
              description: `${achievement.name} - ${achievement.reward.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Ball unlocked!`,
              duration: 5000,
            });
          }
          
          return { ...achievement, progress, unlocked };
        }
        return achievement;
      });
      
      // Save to storage
      localStorage.setItem('achievements', JSON.stringify(updated));
      
      return updated;
    });
  };

  const updateChallengeProgress = (challengeId: string, newProgress: number) => {
    setDailyChallenges(prev => {
      const updated = prev.map(challenge => {
        if (challenge.id === challengeId && !challenge.completed) {
          const progress = Math.max(challenge.progress, newProgress);
          const completed = progress >= challenge.goal;
          
          // Check if newly completed
          if (completed && !challenge.completed) {
            setCurrentCoins(prev => prev + challenge.coinReward);
            // Persist bonus coins so they survive a page reload
            const prevBonus = parseInt(localStorage.getItem('game-coins-bonus') || '0', 10);
            localStorage.setItem('game-coins-bonus', (prevBonus + challenge.coinReward).toString());
            toast({
              title: "🎯 Daily Challenge Complete!",
              description: `${challenge.title} - Earned ${challenge.coinReward} coins!`,
              duration: 5000,
            });
          }
          
          return { ...challenge, progress, completed };
        }
        return challenge;
      });
      
      // Save to storage
      localStorage.setItem('curbball_dailyChallenges', JSON.stringify(updated));
      
      return updated;
    });
  };

  if (!difficulty) {
    return (
      <>
        <DifficultySelection 
          onSelectDifficulty={setDifficulty} 
          onOpenShop={() => setShowShop(true)}
          onOpenBallShop={() => setShowBallShop(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenDailyChallenges={() => setShowDailyChallenges(true)}
          onOpenRestorePurchases={() => setShowRestorePurchases(true)}
        />

        <RestorePurchases
          isOpen={showRestorePurchases}
          onClose={() => setShowRestorePurchases(false)}
          ownedBalls={ownedBalls}
          ownedBackdrops={ownedBackdrops}
          onRestoreBalls={(balls) => {
            setOwnedBalls(balls);
            localStorage.setItem('ownedBalls', JSON.stringify(balls));
          }}
          onRestoreBackdrops={(backdrops) => {
            setOwnedBackdrops(backdrops);
            localStorage.setItem('ownedBackdrops', JSON.stringify(backdrops));
          }}
        />

      {showShop && (
        <BackdropShop
          onClose={() => setShowShop(false)}
          currentCoins={currentCoins}
          onPurchaseWithCoins={handlePurchaseWithCoins}
          onPurchaseWithMoney={handlePurchaseWithMoney}
          ownedBackdrops={ownedBackdrops}
          onSelectBackdrop={handleSelectBackdrop}
          currentBackdrop={currentBackdrop}
        />
      )}

      {showBallShop && (
        <BallShop
          onClose={() => setShowBallShop(false)}
          currentCoins={currentCoins}
          onPurchaseWithCoins={handleBallPurchaseWithCoins}
          onPurchaseWithMoney={handleBallPurchaseWithMoney}
          ownedBalls={ownedBalls}
          onSelectBall={handleSelectBall}
          currentBall={currentBall}
          unlockedAchievements={achievements.filter(a => a.unlocked).map(a => a.id)}
        />
      )}

      {showAchievements && (
        <Achievements
          isOpen={showAchievements}
          onClose={() => setShowAchievements(false)}
          achievements={achievements}
        />
      )}

      {showDailyChallenges && (
        <DailyChallenges
          onClose={() => setShowDailyChallenges(false)}
          challenges={dailyChallenges}
        />
      )}
      </>
    );
  }

  const handleBackToDifficulty = () => {
    setDifficulty(null);
  };

  const handleCoinsUpdate = (newCoins: number) => {
    setCurrentCoins(newCoins);
  };

  return (
    <div className="w-full h-screen">
      <GameCanvas
        difficulty={difficulty} 
        onBackToDifficulty={handleBackToDifficulty}
        backdropImage={currentBackdrop}
        currentBall={currentBall}
        onCoinsChange={handleCoinsUpdate}
        onAchievementProgress={updateAchievementProgress}
        onChallengeProgress={updateChallengeProgress}
      />
    </div>
  );
};

export default Index;
