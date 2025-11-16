import { useState, useEffect } from "react";
import { GameCanvas, Difficulty } from "@/components/GameCanvas";
import { DifficultySelection } from "@/components/DifficultySelection";
import { FBInstantLoading } from "@/components/FBInstantLoading";
import { BackdropShop, Backdrop } from "@/components/BackdropShop";
import { BallShop, BallSkin } from "@/components/BallShop";
import { fbInstant } from "@/lib/fbInstantManager";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showBallShop, setShowBallShop] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [ownedBackdrops, setOwnedBackdrops] = useState<string[]>(["default"]);
  const [currentBackdrop, setCurrentBackdrop] = useState("default");
  const [ownedBalls, setOwnedBalls] = useState<string[]>(["default"]);
  const [currentBall, setCurrentBall] = useState("default");

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
        
        // Load backdrop and ball data
        const data = await fbInstant.getPlayerDataAsync([
          'ownedBackdrops', 
          'currentBackdrop',
          'ownedBalls',
          'currentBall',
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
        const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0');
        const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0');
        const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0');
        
        if (savedBackdrops) setOwnedBackdrops(JSON.parse(savedBackdrops));
        if (savedCurrent) setCurrentBackdrop(savedCurrent);
        if (savedBalls) setOwnedBalls(JSON.parse(savedBalls));
        if (savedCurrentBall) setCurrentBall(savedCurrentBall);
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
    localStorage.setItem('currentBall', ballId);
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ currentBall: ballId });
    }
  };

  if (!difficulty) {
    return (
      <>
        <DifficultySelection 
          onSelectDifficulty={setDifficulty} 
        onOpenShop={() => setShowShop(true)}
        onOpenBallShop={() => setShowBallShop(true)}
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
      />
    </div>
  );
};

export default Index;
