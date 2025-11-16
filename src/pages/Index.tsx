import { useState, useEffect } from "react";
import { GameCanvas, Difficulty } from "@/components/GameCanvas";
import { DifficultySelection } from "@/components/DifficultySelection";
import { FBInstantLoading } from "@/components/FBInstantLoading";
import { BackdropShop, Backdrop } from "@/components/BackdropShop";
import { BallShop, BallSkin } from "@/components/BallShop";
import { Achievements, Achievement } from "@/components/Achievements";
import { fbInstant } from "@/lib/fbInstantManager";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showBallShop, setShowBallShop] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
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

  useEffect(() => {
    const initializeFBInstant = async () => {
      try {
        // Initialize FBInstant SDK
        await fbInstant.initializeAsync();
        
        // Simulate loading progress
        const progressInterval = setInterval(() => {
          setLoadingProgress((prev) => {
            const next = prev + 10;
            fbInstant.setLoadingProgress(next);
            
            if (next >= 100) {
              clearInterval(progressInterval);
            }
            return next;
          });
        }, 100);

        // Wait for loading to complete
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Start the game
        await fbInstant.startGameAsync();
        
        // Load backdrop, ball, and achievement data
        const data = await fbInstant.getPlayerDataAsync([
          'ownedBackdrops', 
          'currentBackdrop',
          'ownedBalls',
          'currentBall',
          'achievements',
          'coins_easy',
          'coins_medium', 
          'coins_hard'
        ]);
        if (data.ownedBackdrops) {
          setOwnedBackdrops(data.ownedBackdrops);
        }
        if (data.currentBackdrop) {
          setCurrentBackdrop(data.currentBackdrop);
        }
        if (data.ownedBalls) {
          setOwnedBalls(data.ownedBalls);
        }
        if (data.currentBall) {
          setCurrentBall(data.currentBall);
        }
        if (data.achievements) {
          setAchievements(data.achievements);
        }
        // Load coins from all difficulties (use easy as default)
        const totalCoins = (data.coins_easy || 0) + (data.coins_medium || 0) + (data.coins_hard || 0);
        setCurrentCoins(totalCoins);
        
        setIsLoading(false);
      } catch (error) {
        console.error('FBInstant initialization error:', error);
        // Continue to game even if FBInstant fails (web fallback)
        // Load from localStorage
        const savedBackdrops = localStorage.getItem('ownedBackdrops');
        const savedCurrent = localStorage.getItem('currentBackdrop');
        const savedBalls = localStorage.getItem('ownedBalls');
        const savedCurrentBall = localStorage.getItem('currentBall');
        const savedAchievements = localStorage.getItem('achievements');
        const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0');
        const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0');
        const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0');
        
        if (savedBackdrops) setOwnedBackdrops(JSON.parse(savedBackdrops));
        if (savedCurrent) setCurrentBackdrop(savedCurrent);
        if (savedBalls) setOwnedBalls(JSON.parse(savedBalls));
        if (savedCurrentBall) setCurrentBall(savedCurrentBall);
        if (savedAchievements) setAchievements(JSON.parse(savedAchievements));
        setCurrentCoins(coinsEasy + coinsMedium + coinsHard);
        setIsLoading(false);
      }
    };

    initializeFBInstant();
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <FBInstantLoading onComplete={handleLoadingComplete} />;
  }

  const handlePurchaseWithCoins = (backdrop: Backdrop) => {
    const newOwned = [...ownedBackdrops, backdrop.id];
    setOwnedBackdrops(newOwned);
    setCurrentCoins(prev => prev - backdrop.coinPrice);
    setCurrentBackdrop(backdrop.id);
    
    // Save to storage
    localStorage.setItem('ownedBackdrops', JSON.stringify(newOwned));
    localStorage.setItem('currentBackdrop', backdrop.id);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ ownedBackdrops: newOwned, currentBackdrop: backdrop.id });
    }
  };

  const handlePurchaseWithMoney = (backdrop: Backdrop) => {
    const newOwned = [...ownedBackdrops, backdrop.id];
    setOwnedBackdrops(newOwned);
    setCurrentBackdrop(backdrop.id);
    
    // Save to storage
    localStorage.setItem('ownedBackdrops', JSON.stringify(newOwned));
    localStorage.setItem('currentBackdrop', backdrop.id);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ ownedBackdrops: newOwned, currentBackdrop: backdrop.id });
    }
  };

  const handleSelectBackdrop = (backdropId: string) => {
    setCurrentBackdrop(backdropId);
    localStorage.setItem('currentBackdrop', backdropId);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ currentBackdrop: backdropId });
    }
  };

  const handleBallPurchaseWithCoins = (ball: BallSkin) => {
    const newOwned = [...ownedBalls, ball.id];
    setOwnedBalls(newOwned);
    setCurrentCoins(prev => prev - ball.coinPrice);
    setCurrentBall(ball.id);
    
    // Save to storage
    localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
    localStorage.setItem('currentBall', ball.id);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ ownedBalls: newOwned, currentBall: ball.id });
    }
  };

  const handleBallPurchaseWithMoney = (ball: BallSkin) => {
    const newOwned = [...ownedBalls, ball.id];
    setOwnedBalls(newOwned);
    setCurrentBall(ball.id);
    
    // Save to storage
    localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
    localStorage.setItem('currentBall', ball.id);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ ownedBalls: newOwned, currentBall: ball.id });
    }
  };

  const handleSelectBall = (ballId: string) => {
    setCurrentBall(ballId);
    // Auto-add to owned if it's an achievement ball
    if (!ownedBalls.includes(ballId)) {
      const newOwned = [...ownedBalls, ballId];
      setOwnedBalls(newOwned);
      localStorage.setItem('ownedBalls', JSON.stringify(newOwned));
      if (fbInstant.isFBInstant()) {
        fbInstant.setPlayerDataAsync({ ownedBalls: newOwned });
      }
    }
    localStorage.setItem('currentBall', ballId);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ currentBall: ballId });
    }
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
      if (fbInstant.isFBInstant()) {
        fbInstant.setPlayerDataAsync({ achievements: updated });
      }
      
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
    <div className="w-full h-screen bg-background">
      <GameCanvas 
        difficulty={difficulty} 
        onBackToDifficulty={handleBackToDifficulty}
        backdropImage={currentBackdrop}
        currentBall={currentBall}
        onCoinsChange={handleCoinsUpdate}
        onAchievementProgress={updateAchievementProgress}
      />
    </div>
  );
};

export default Index;
