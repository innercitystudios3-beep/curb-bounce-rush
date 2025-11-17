import { useState, useEffect } from "react";
import { GameCanvas, Difficulty } from "@/components/GameCanvas";
import { DifficultySelection } from "@/components/DifficultySelection";
import { FBInstantLoading } from "@/components/FBInstantLoading";
import { BackdropShop, Backdrop } from "@/components/BackdropShop";
import { BallShop, BallSkin } from "@/components/BallShop";
import { Achievements, Achievement } from "@/components/Achievements";
import { DailyChallenges, DailyChallenge } from "@/components/DailyChallenges";
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
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [ownedBackdrops, setOwnedBackdrops] = useState<string[]>(["default"]);
  const [currentBackdrop, setCurrentBackdrop] = useState("default");
  const [ownedBalls, setOwnedBalls] = useState<string[]>(["basketball"]);
  const [currentBall, setCurrentBall] = useState("basketball");
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
        
        // Load backdrop, ball, achievement, and daily challenge data
        const data = await fbInstant.getPlayerDataAsync([
          'ownedBackdrops', 
          'currentBackdrop',
          'ownedBalls',
          'currentBall',
          'achievements',
          'dailyChallenges',
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
          let balls = data.ownedBalls;
          // Remove mystery ball if owned
          if (balls.includes('mystery-ball')) {
            balls = balls.filter((b: string) => b !== 'mystery-ball');
          }
          setOwnedBalls(balls);
        }
        let selectedBall = data.currentBall || 'basketball';
        // Switch to default if using mystery ball
        if (selectedBall === 'mystery-ball') {
          selectedBall = 'basketball';
        }
        setCurrentBall(selectedBall);
        
        // Save the cleaned data back
        if (data.currentBall === 'mystery-ball' || (data.ownedBalls && data.ownedBalls.includes('mystery-ball'))) {
          await fbInstant.setPlayerDataAsync({
            currentBall: selectedBall,
            ownedBalls: data.ownedBalls ? data.ownedBalls.filter((b: string) => b !== 'mystery-ball') : ['basketball']
          });
        }
        if (data.achievements) {
          setAchievements(data.achievements);
        }
        if (data.dailyChallenges) {
          // Check if challenges have expired
          const now = Date.now();
          const loadedChallenges = data.dailyChallenges as DailyChallenge[];
          if (loadedChallenges[0]?.expiresAt < now) {
            // Reset challenges if expired
            const newChallenges = initializeDailyChallenges();
            setDailyChallenges(newChallenges);
            await fbInstant.setPlayerDataAsync({ dailyChallenges: newChallenges });
          } else {
            setDailyChallenges(loadedChallenges);
          }
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
        const storedChallenges = localStorage.getItem('curbball_dailyChallenges');
        const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0');
        const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0');
        const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0');
        
        if (savedBackdrops) setOwnedBackdrops(JSON.parse(savedBackdrops));
        if (savedCurrent) setCurrentBackdrop(savedCurrent);
        if (savedBalls) {
          let balls = JSON.parse(savedBalls);
          // Remove mystery ball if owned
          if (balls.includes('mystery-ball')) {
            balls = balls.filter((b: string) => b !== 'mystery-ball');
            localStorage.setItem('ownedBalls', JSON.stringify(balls));
          }
          setOwnedBalls(balls);
        }
        if (savedCurrentBall) {
          let selectedBall = savedCurrentBall;
          // Switch to default if using mystery ball
          if (selectedBall === 'mystery-ball') {
            selectedBall = 'basketball';
            localStorage.setItem('currentBall', selectedBall);
          }
          setCurrentBall(selectedBall);
        }
        if (savedAchievements) setAchievements(JSON.parse(savedAchievements));
        
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

  const updateChallengeProgress = (challengeId: string, newProgress: number) => {
    setDailyChallenges(prev => {
      const updated = prev.map(challenge => {
        if (challenge.id === challengeId && !challenge.completed) {
          const progress = Math.max(challenge.progress, newProgress);
          const completed = progress >= challenge.goal;
          
          // Check if newly completed
          if (completed && !challenge.completed) {
            setCurrentCoins(prev => prev + challenge.coinReward);
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
      if (fbInstant.isFBInstant()) {
        fbInstant.setPlayerDataAsync({ dailyChallenges: updated });
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
        onOpenDailyChallenges={() => setShowDailyChallenges(true)}
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
    <div className="w-full h-screen bg-background">
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
