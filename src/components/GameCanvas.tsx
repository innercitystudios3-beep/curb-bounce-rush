import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfettiEffect } from "./ConfettiEffect";
import { ThrowMeter } from "./ThrowMeter";
import { CoinDisplay } from "./CoinDisplay";
import { FloatingCoins } from "./FloatingCoins";
import { CoinParticle } from "./CoinParticle";
import { HoveringCoin } from "./HoveringCoin";
import { ShareButton } from "./ShareButton";
import { Leaderboard } from "./Leaderboard";
import { RewardedAdButton } from "./RewardedAdButton";
import { toast } from "sonner";
import { soundManager } from "@/lib/soundManager";
import { Volume2, VolumeX } from "lucide-react";
import { fbInstant } from "@/lib/fbInstantManager";

interface Obstacle {
  id: number;
  type: "car" | "bike";
  position: number;
  speed: number;
}

interface CurbCoin {
  id: number;
  position: number; // 0-100 percentage horizontal position
  value: number; // coin value (5, 10, or 15)
  collected: boolean;
  expiresAt: number; // timestamp when coin should disappear
}

interface BullseyeTarget {
  position: number; // 0-100 percentage horizontal position
  direction: 1 | -1; // 1 for right, -1 for left
}

export type Difficulty = "easy" | "medium" | "hard";

interface GameCanvasProps {
  difficulty: Difficulty;
  onBackToDifficulty?: () => void;
  backdropImage?: string;
  currentBall?: string;
  onCoinsChange?: (coins: number) => void;
  onAchievementProgress?: (achievementId: string, newProgress: number, maxScore?: number) => void;
  onChallengeProgress?: (challengeId: string, newProgress: number) => void;
}

export const GameCanvas = ({ 
  difficulty = "easy", 
  onBackToDifficulty,
  backdropImage = "default",
  currentBall = "default",
  onCoinsChange,
  onAchievementProgress,
  onChallengeProgress
}: GameCanvasProps) => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [preloadedInterstitial, setPreloadedInterstitial] = useState<any>(null);
  const [showFloatingCoins, setShowFloatingCoins] = useState(false);
  const [floatingCoinAmount, setFloatingCoinAmount] = useState(0);
  const [coinParticles, setCoinParticles] = useState<Array<{ id: number }>>([]);
  const [consecutiveHits, setConsecutiveHits] = useState(0);
  const [isThowing, setIsThrowing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [curbCoins, setCurbCoins] = useState<CurbCoin[]>([]);
  const [bullseyeTarget, setBullseyeTarget] = useState<BullseyeTarget>({ position: 50, direction: 1 });
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 80 });
  const [ballHorizontalPosition, setBallHorizontalPosition] = useState(50); // 0-100 percentage
  const [isBallFlying, setIsBallFlying] = useState(false);
  const [ballPhase, setBallPhase] = useState<'ready' | 'flying' | 'hit' | 'bouncing' | 'missed'>('ready');
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [gameEnded, setGameEnded] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const obstacleIdRef = useRef(0);
  const curbCoinIdRef = useRef(0);
  const chargeIntervalRef = useRef<number | null>(null);
  const chargeSoundIntervalRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeAngle, setSwipeAngle] = useState(0);

  const TIME_LIMIT = 180; // 3 minutes in seconds
  
  // Difficulty settings
  const difficultySettings = {
    easy: {
      baseSuccessChance: 45,
      successChanceDecrease: 5,
      obstacleSpawnChance: 0.7,
      obstacleSpeed: { min: 1, max: 2 },
      bullseyeSpeed: 0.5,
    },
    medium: {
      baseSuccessChance: 35,
      successChanceDecrease: 7,
      obstacleSpawnChance: 0.6,
      obstacleSpeed: { min: 1.5, max: 3 },
      bullseyeSpeed: 1.0,
    },
    hard: {
      baseSuccessChance: 25,
      successChanceDecrease: 10,
      obstacleSpawnChance: 0.5,
      obstacleSpeed: { min: 2, max: 4 },
      bullseyeSpeed: 1.8,
    }
  };

  const currentDifficultySettings = difficultySettings[difficulty];
  const baseSuccessChance = currentDifficultySettings.baseSuccessChance;
  const successChanceDecrease = currentDifficultySettings.successChanceDecrease;
  
  const currentSuccessChance = Math.max(20, baseSuccessChance - (level - 1) * successChanceDecrease);

  // Load player data from FBInstant or localStorage (difficulty-specific)
  useEffect(() => {
    const loadPlayerData = async () => {
      if (fbInstant.isFBInstant()) {
        const data = await fbInstant.getPlayerDataAsync([
          `coins_${difficulty}`, 
          `highScore_${difficulty}`, 
          `gamesPlayed_${difficulty}`
        ]);
        setCoins(data[`coins_${difficulty}`] || 0);
        setHighScore(data[`highScore_${difficulty}`] || 0);
        setGamesPlayed(data[`gamesPlayed_${difficulty}`] || 0);
        
        // Preload first interstitial ad
        const interstitial = await fbInstant.preloadInterstitialAdAsync();
        setPreloadedInterstitial(interstitial);
      } else {
        // Fallback to localStorage (difficulty-specific)
        const savedCoins = localStorage.getItem(`game-coins-${difficulty}`);
        const savedHighScore = localStorage.getItem(`game-highScore-${difficulty}`);
        const savedGamesPlayed = localStorage.getItem(`game-gamesplayed-${difficulty}`);
        setCoins(savedCoins ? parseInt(savedCoins) : 0);
        setHighScore(savedHighScore ? parseInt(savedHighScore) : 0);
        setGamesPlayed(savedGamesPlayed ? parseInt(savedGamesPlayed) : 0);
      }
    };
    loadPlayerData();
  }, [difficulty]);

  // Save player data to both localStorage and FBInstant (difficulty-specific)
  useEffect(() => {
    localStorage.setItem(`game-coins-${difficulty}`, coins.toString());
    localStorage.setItem(`game-highScore-${difficulty}`, highScore.toString());
    localStorage.setItem(`game-gamesplayed-${difficulty}`, gamesPlayed.toString());
    
    if (fbInstant.isFBInstant()) {
      fbInstant.setPlayerDataAsync({ 
        [`coins_${difficulty}`]: coins, 
        [`highScore_${difficulty}`]: highScore, 
        [`gamesPlayed_${difficulty}`]: gamesPlayed 
      });
    }

    // Notify parent about coin changes
    if (onCoinsChange) {
      onCoinsChange(coins);
    }
  }, [coins, highScore, gamesPlayed, difficulty, onCoinsChange]);

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameEnded || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameEnded(true);
          setFinalTime(TIME_LIMIT);
          soundManager.playSuccess();
          handleGameEnd(score, TIME_LIMIT);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameEnded, timeRemaining, score]);

  // Handle keyboard controls for horizontal movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isThowing || isBallFlying || ballPhase !== 'ready') return;
      
      if (e.key === 'ArrowLeft') {
        setBallHorizontalPosition(prev => Math.max(10, prev - 5));
      } else if (e.key === 'ArrowRight') {
        setBallHorizontalPosition(prev => Math.min(90, prev + 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThowing, isBallFlying, ballPhase]);

  const moveLeft = () => {
    if (isThowing || isBallFlying || ballPhase !== 'ready') return;
    setBallHorizontalPosition(prev => Math.max(10, prev - 10));
    soundManager.playClick();
  };

  const moveRight = () => {
    if (isThowing || isBallFlying || ballPhase !== 'ready') return;
    setBallHorizontalPosition(prev => Math.min(90, prev + 10));
    soundManager.playClick();
  };

  const calculateCoinsEarned = (throwPower: number, isSuccess: boolean) => {
    if (!isSuccess) return 0;

    const isPerfectTiming = throwPower >= 60 && throwPower <= 80;
    let baseCoins = 2; // Base coins for any successful throw

    // Power-based bonus (1-5 coins based on how close to sweet spot)
    if (isPerfectTiming) {
      baseCoins = 5; // Perfect timing gives maximum coins
    } else if (throwPower >= 50 && throwPower <= 90) {
      baseCoins = 3; // Good timing gives medium coins
    }

    // Streak bonus
    const streakBonus = Math.floor(consecutiveHits / 3); // +1 coin every 3 consecutive hits
    
    return baseCoins + streakBonus;
  };

  const spawnCoinParticles = (amount: number) => {
    const newParticles = Array.from({ length: Math.min(amount, 8) }, () => ({
      id: particleIdRef.current++,
    }));
    setCoinParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => {
      setCoinParticles([]);
    }, 2000);
  };

  useEffect(() => {
    // Spawn obstacles randomly
    const spawnInterval = setInterval(() => {
      if (Math.random() > currentDifficultySettings.obstacleSpawnChance) {
        const newObstacle: Obstacle = {
          id: obstacleIdRef.current++,
          type: Math.random() > 0.5 ? "car" : "bike",
          position: -10,
          speed: currentDifficultySettings.obstacleSpeed.min + 
                 Math.random() * (currentDifficultySettings.obstacleSpeed.max - currentDifficultySettings.obstacleSpeed.min),
        };
        setObstacles((prev) => [...prev, newObstacle]);
      }
    }, 2000);

    return () => clearInterval(spawnInterval);
  }, [currentDifficultySettings]);

  useEffect(() => {
    // Spawn curb coins randomly
    const spawnCoinInterval = setInterval(() => {
      // Spawn coin if there are less than 3 coins on the curb
      setCurbCoins((prev) => {
        if (prev.filter(c => !c.collected).length >= 3) return prev;
        
        if (Math.random() > 0.6) {
          const coinValues = [5, 10, 15]; // Different coin values
          const value = coinValues[Math.floor(Math.random() * coinValues.length)];
          const lifetime = 5000 + Math.random() * 5000; // 5-10 seconds
          
          const newCoin: CurbCoin = {
            id: curbCoinIdRef.current++,
            position: 15 + Math.random() * 70, // Random position between 15-85%
            value: value,
            collected: false,
            expiresAt: Date.now() + lifetime,
          };
          return [...prev, newCoin];
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(spawnCoinInterval);
  }, []);

  useEffect(() => {
    // Remove expired coins
    const checkExpiredCoins = setInterval(() => {
      const now = Date.now();
      setCurbCoins((prev) => prev.filter(coin => coin.expiresAt > now));
    }, 500); // Check every 500ms

    return () => clearInterval(checkExpiredCoins);
  }, []);

  useEffect(() => {
    // Move obstacles
    const moveInterval = setInterval(() => {
      setObstacles((prev) =>
        prev
          .map((obs) => ({ ...obs, position: obs.position + obs.speed }))
          .filter((obs) => obs.position < 110)
      );
    }, 50);

    return () => clearInterval(moveInterval);
  }, []);

  useEffect(() => {
    // Move bullseye target slowly
    const moveInterval = setInterval(() => {
      setBullseyeTarget((prev) => {
        let newPosition = prev.position + (prev.direction * currentDifficultySettings.bullseyeSpeed);
        let newDirection = prev.direction;
        
        // Bounce at edges
        if (newPosition >= 85) {
          newPosition = 85;
          newDirection = -1;
        } else if (newPosition <= 15) {
          newPosition = 15;
          newDirection = 1;
        }
        
        return { position: newPosition, direction: newDirection };
      });
    }, 50);

    return () => clearInterval(moveInterval);
  }, [currentDifficultySettings]);

  const calculateSuccess = (throwPower: number) => {
    // Success rate increases if power is between 60-80 (sweet spot)
    const isPerfectTiming = throwPower >= 60 && throwPower <= 80;
    const adjustedChance = isPerfectTiming ? Math.min(75, currentSuccessChance + 30) : currentSuccessChance;
    
    return Math.random() * 100 < adjustedChance;
  };

  const startCharging = () => {
    if (isThowing || isBallFlying) return;
    
    setIsCharging(true);
    setPower(0);
    
    // Play charging sound periodically
    chargeSoundIntervalRef.current = window.setInterval(() => {
      soundManager.playCharging();
    }, 200);
    
    // Charge power over time
    chargeIntervalRef.current = window.setInterval(() => {
      setPower((prev) => {
        if (prev >= 100) {
          return 0; // Loop back to 0 when reaching 100
        }
        return prev + 2; // Increase by 2 every interval
      });
    }, 50);
  };

  const releaseThrow = () => {
    if (!isCharging || !gameStarted) return;
    
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    if (chargeSoundIntervalRef.current) {
      clearInterval(chargeSoundIntervalRef.current);
      chargeSoundIntervalRef.current = null;
    }
    
    throwBall(power, swipeAngle);
  };

  // Touch handlers for ping pong flicking
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isThowing || isBallFlying || ballPhase !== 'ready') return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isThowing || isBallFlying || ballPhase !== 'ready') return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Calculate angle from swipe direction (left/right)
    const angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
    setSwipeAngle(angle);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isThowing || isBallFlying || ballPhase !== 'ready' || !gameStarted) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Calculate swipe velocity
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime; // pixels per millisecond
    
    // Convert velocity to power (0-100)
    // Fast swipes = more power
    const swipePower = Math.min(100, Math.max(10, velocity * 50));
    
    // Calculate angle from swipe direction
    const angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
    
    // Only throw if swipe is significant (minimum distance)
    if (distance > 30) {
      soundManager.playThrow();
      throwBall(swipePower, angle);
    }
    
    touchStartRef.current = null;
    setSwipeAngle(0);
  };

  const throwBall = (throwPower: number, angle: number = 0) => {
    if (isThowing || isBallFlying || !gameStarted) return;

    setIsThrowing(true);
    setIsBallFlying(true);
    const success = calculateSuccess(throwPower);
    
    // Apply horizontal movement based on angle
    const angleInfluence = Math.sin(angle * Math.PI / 180) * 15;
    const targetHorizontalPosition = Math.max(10, Math.min(90, ballHorizontalPosition + angleInfluence));

    // Play throw sound
    soundManager.playThrow();

    // Check for collision with obstacles during flight
    const checkObstacleCollision = () => {
      return obstacles.some(obs => {
        const obstacleCenterX = obs.position + (obs.type === 'car' ? 10 : 6); // Approximate center
        const ballX = ballHorizontalPosition;
        const distance = Math.abs(obstacleCenterX - ballX);
        return distance < 8; // Collision threshold
      });
    };

    // Phase 1: Ball flies to curb - speed based on power
    // Weak throws (0-40): slower, lower arc
    // Medium throws (40-70): moderate speed
    // Strong throws (70-100): faster, higher arc
    
    const flightDuration = throwPower < 40 ? 1200 : throwPower < 70 ? 900 : 600; // ms
    const arcHeight = throwPower < 40 ? 60 : throwPower < 70 ? 75 : 85; // max y position during arc
    
    setBallPhase('flying');
    const startX = ballHorizontalPosition;
    setBallPosition({ x: startX, y: 80 });
    
    // Animate ball arc with horizontal movement based on angle
    const startTime = Date.now();
    const animateBallFlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flightDuration, 1);
      
      // Parabolic arc calculation
      const yProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad for y
      const arcY = 80 - (yProgress * 75) + (Math.sin(progress * Math.PI) * (arcHeight - 80));
      
      // Smooth horizontal movement from start to target
      const currentX = startX + (targetHorizontalPosition - startX) * progress;
      
      setBallPosition({ x: currentX, y: arcY });
      setBallHorizontalPosition(currentX);
      
      if (progress < 1) {
        requestAnimationFrame(animateBallFlight);
      }
    };
    
    requestAnimationFrame(animateBallFlight);
    
    setTimeout(() => {
      // Check for collision mid-flight
      if (checkObstacleCollision()) {
        // Ball hits obstacle
        setBallPhase('missed');
        soundManager.playFail();
        setConsecutiveHits(0);
        toast.error("Hit an obstacle!", {
          description: "Ball was blocked! Streak reset!",
        });
        
        setTimeout(() => {
          setBallPosition({ x: targetHorizontalPosition, y: 80 });
          setBallPhase('ready');
          setIsBallFlying(false);
          setIsThrowing(false);
          setPower(0);
        }, 600);
        return;
      }
      
      setBallPosition({ x: targetHorizontalPosition, y: 5 }); // Move to curb at target horizontal position
    }, flightDuration * 0.6);

    setTimeout(() => {
      // Phase 2: Ball hits curb (0.3s)
      setBallPhase('hit');
      soundManager.playImpact();
      
      // Check for coin collection at target position
      const collectedCoin = curbCoins.find(
        coin => !coin.collected && Math.abs(coin.position - targetHorizontalPosition) < 8
      );
      
      // Check for bullseye target hit
      const bullseyeHit = Math.abs(bullseyeTarget.position - targetHorizontalPosition) < 6;
      
      let coinBonus = 0;
      if (collectedCoin) {
        coinBonus = collectedCoin.value;
        soundManager.playCoinCollect(); // Play coin collection sound
        setCurbCoins(prev => 
          prev.map(c => c.id === collectedCoin.id ? { ...c, collected: true } : c)
        );
        
        // Remove collected coin after animation
        setTimeout(() => {
          setCurbCoins(prev => prev.filter(c => c.id !== collectedCoin.id));
        }, 500);
      }
      
      setTimeout(() => {
        if (success) {
          // Phase 3: Ball bounces back successfully (0.8s)
          setBallPhase('bouncing');
          setBallPosition({ x: targetHorizontalPosition, y: 80 }); // Bounce back to target position
          soundManager.playSuccess();
          
          setTimeout(() => {
            let pointsEarned = 10;
            let bullseyeBonus = 0;
            
            // Award bullseye bonus
            if (bullseyeHit) {
              bullseyeBonus = 50;
              pointsEarned += bullseyeBonus;
              soundManager.playLevelUp(); // Play special sound for bullseye
              
              // Track challenge progress for bullseye hits
              if (onChallengeProgress) {
                onChallengeProgress('bullseye_5', consecutiveHits + 1);
              }
            }
            
            const newScore = score + pointsEarned;
            setScore(newScore);
            
            // Track achievement progress for high score
            if (onAchievementProgress) {
              onAchievementProgress('first_1000', newScore);
            }
            
            // Track challenge progress for score
            if (onChallengeProgress) {
              onChallengeProgress('score_500', newScore);
            }
            
            // Check for 100 point milestone celebration
            const previousHundred = Math.floor(score / 100);
            const currentHundred = Math.floor(newScore / 100);
            const reachedMilestone = currentHundred > previousHundred;
            
            // Calculate and award coins (including coin bonus)
            const earnedCoins = calculateCoinsEarned(throwPower, true) + coinBonus;
            setCoins(prev => prev + earnedCoins);
            setCoinsEarned(prev => prev + earnedCoins);
            
            // Show floating coins animation
            setFloatingCoinAmount(earnedCoins);
            setShowFloatingCoins(true);
            spawnCoinParticles(earnedCoins);
            
            // Update streak
            const newStreak = consecutiveHits + 1;
            setConsecutiveHits(newStreak);
            
            // Track achievement and challenge progress for streak
            if (onAchievementProgress) {
              onAchievementProgress('streak_10', newStreak);
            }
            if (onChallengeProgress) {
              onChallengeProgress('perfect_streak', newStreak);
            }
            
            setShowConfetti(true);
            
            // Play milestone celebration if reached 100, 200, 300, etc.
            if (reachedMilestone) {
              soundManager.playMilestone();
              toast.success(`🎉 ${currentHundred * 100} Points Milestone!`, {
                description: `Amazing progress! Keep it up!`,
              });
              setTimeout(() => setShowConfetti(true), 100);
            }
            
            const coinMessage = coinBonus > 0 ? ` +${coinBonus} Bonus Coins!` : '';
            const bullseyeMessage = bullseyeHit ? ` 🎯 BULLSEYE! +${bullseyeBonus} Points!` : '';
            toast.success(`+${pointsEarned} Points! +${earnedCoins} Coins!${coinMessage}${bullseyeMessage}`, {
              description: `Score: ${newScore} | Streak: ${consecutiveHits + 1}`,
            });

            setTimeout(() => setShowConfetti(false), reachedMilestone ? 4000 : 3000);
            
            // Reset
            setBallPhase('ready');
            setIsBallFlying(false);
            setIsThrowing(false);
            setPower(0);
          }, 800);
          
        } else {
          // Phase 3: Ball misses and falls (0.6s)
          setBallPhase('missed');
          setBallPosition({ x: targetHorizontalPosition, y: -20 }); // Fall down at target position
          soundManager.playFail();
          
          // Reset streak on miss
          setConsecutiveHits(0);
          
          // Reset challenge progress for streak on miss
          if (onChallengeProgress) {
            onChallengeProgress('perfect_streak', 0);
          }
          
          setTimeout(() => {
            toast.error("Miss! Ball didn't bounce back", {
              description: "Try timing your power better. Streak reset!",
            });
            
            // Reset
            setBallPosition({ x: targetHorizontalPosition, y: 80 });
            setBallPhase('ready');
            setIsBallFlying(false);
            setIsThrowing(false);
            setPower(0);
          }, 600);
        }
      }, 300);
    }, flightDuration * 0.6 + 800);
  };

  const restartGame = async () => {
    soundManager.playClick();
    
    // Update high score and submit to leaderboard only if it's a new high score
    if (score > highScore) {
      setHighScore(score);
      
      // Update leaderboard ONLY with high score if in Facebook (difficulty-specific)
      if (fbInstant.isFBInstant()) {
        await fbInstant.setLeaderboardScore(`leaderboard_${difficulty}`, score);
      }
    }
    
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    
    // Show interstitial ad every 3rd game (frequency cap)
    if (fbInstant.isFBInstant() && newGamesPlayed % 3 === 0) {
      try {
        if (preloadedInterstitial) {
          await preloadedInterstitial.showAsync();
          console.log('Interstitial ad shown');
        } else {
          await fbInstant.showInterstitialAdAsync();
        }
        
        // Preload next interstitial
        const nextInterstitial = await fbInstant.preloadInterstitialAdAsync();
        setPreloadedInterstitial(nextInterstitial);
      } catch (error) {
        console.error('Error showing interstitial:', error);
      }
    }
    
    setScore(0);
    setLevel(1);
    setCoinsEarned(0);
    setConsecutiveHits(0);
    setBallHorizontalPosition(50);
    setCurbCoins([]);
    setGameEnded(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 80 });
    setGameStarted(false);
    setTimeRemaining(TIME_LIMIT);
    setShowLeaderboard(false);
    setFinalTime(0);
    toast.info("Game restarted! Good luck!");
  };

  const handleGameEnd = (finalScore: number, timeTaken: number) => {
    // Update high score and submit to leaderboard only if it's a new high score
    if (finalScore > highScore) {
      setHighScore(finalScore);
      
      // Submit ONLY high score to leaderboard with time as extra data (difficulty-specific)
      if (fbInstant.isFBInstant()) {
        fbInstant.setLeaderboardScore(`leaderboard_${difficulty}`, finalScore, timeTaken.toString());
      }
    }
    
    // Track games played and prepare to show ad
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    
    // Track achievement for games played
    if (onAchievementProgress) {
      onAchievementProgress('play_50', newGamesPlayed);
    }
    
    toast.success("Time's Up!", {
      description: `Final Score: ${finalScore} | Time: ${formatTime(timeTaken)} | Coins: ${coins}`,
    });
    
    // Show interstitial ad every 3 games
    if (newGamesPlayed % 3 === 0) {
      if (preloadedInterstitial) {
        setTimeout(async () => {
          try {
            await preloadedInterstitial.showAsync();
            // Preload next ad
            const nextAd = await fbInstant.preloadInterstitialAdAsync();
            setPreloadedInterstitial(nextAd);
          } catch (error) {
            console.error('Failed to show interstitial:', error);
          }
        }, 2000);
      }
    }
  };

  const handleRewardEarned = (amount: number) => {
    setCoins(coins + amount);
  };

  const toggleMute = () => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
    soundManager.playClick();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getElapsedTime = () => {
    return TIME_LIMIT - timeRemaining;
  };

  // Get backdrop URL based on selected backdrop
  const getBackdropUrl = () => {
    const backdropMap: Record<string, string> = {
      "default": "/backgrounds/east-high-school.png",
      "linden-mural": "/backgrounds/linden-mural.png",
      "ohio-tower": "/backgrounds/ohio-tower.png",
    };
    return backdropMap[backdropImage] || backdropMap["default"];
  };

  const getBallImageUrl = (ballId: string): string | null => {
    return `/balls/${ballId}.png`;
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-top bg-no-repeat" 
      style={{ backgroundImage: `url(${getBackdropUrl()})`, backgroundSize: '70%' }}
    >
      {/* Starting Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-4 border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-6 text-center">Curb Ball Challenge</h1>
            
            <div className="space-y-4 text-white/90 mb-8">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="font-semibold text-lg">How to Play</h3>
                  <p className="text-sm">Click and drag to aim, then release to throw the ball at the curb</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">💰</div>
                <div>
                  <h3 className="font-semibold text-lg">Collect Coins</h3>
                  <p className="text-sm">Hit the glowing coins on the curb for bonus points</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">⏱️</div>
                <div>
                  <h3 className="font-semibold text-lg">Beat the Clock</h3>
                  <p className="text-sm">Score 100 points in 3 minutes to win!</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎪</div>
                <div>
                  <h3 className="font-semibold text-lg">Avoid Obstacles</h3>
                  <p className="text-sm">Watch out for moving obstacles that block your shots</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setGameStarted(true)}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      
      
      
      {/* Stars effect - only show when won */}
      {gameWon && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* Game area */}
      <div 
        className="relative h-full flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onBackToDifficulty}
              className="bg-card/90 backdrop-blur-sm hover:bg-card"
            >
              ← Back
            </Button>
            
            {ballPhase === 'ready' && (
              <ThrowMeter value={power} isCharging={isCharging} disabled={isThowing || isBallFlying} />
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Card className="px-6 py-3 bg-card/90 backdrop-blur-sm border-2 border-primary">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-semibold">SCORE</div>
                  <div className="text-3xl font-bold text-primary">{score}</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-semibold">ELAPSED</div>
                  <div className="text-2xl font-bold text-accent">{formatTime(getElapsedTime())}</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-semibold">TIME LEFT</div>
                  <div className={`text-3xl font-bold ${
                    timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'
                  }`}>{formatTime(timeRemaining)}</div>
                </div>
              </div>
            </Card>
            
            <CoinDisplay coins={coins} />
          </div>
        </div>

        {/* Street and curb */}
        <div className="flex-1 flex items-end">
          <div className={`w-full h-64 relative transition-all duration-1000 ${
            gameWon ? 'bg-gradient-to-b from-purple-800 to-purple-950' : ''
          }`} style={{ 
            background: gameWon ? undefined : "hsl(var(--game-street))" 
          }}>
            {/* Curb */}
            <div
              className={`absolute top-0 left-0 right-0 h-4 transition-all duration-1000 ${
                ballPhase === 'hit' ? 'animate-pulse' : ''
              } ${
                gameWon 
                  ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' 
                  : 'bg-gradient-to-b from-gray-400 to-gray-600'
              }`}
              style={{ 
                boxShadow: ballPhase === 'hit' 
                  ? "0 4px 10px rgba(0,0,0,0.5), 0 0 30px rgba(255, 165, 0, 0.6)"
                  : "0 4px 10px rgba(0,0,0,0.5)" 
              }}
            >
              {/* Impact effect at ball position */}
              {ballPhase === 'hit' && (
                <div 
                  className="absolute top-0 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${ballPosition.x}%` }}
                >
                  <div className="w-16 h-16 rounded-full bg-orange-500/40 animate-ping" />
                </div>
              )}
              
              {/* Hovering coins over curb */}
              {curbCoins.map((coin) => (
                <HoveringCoin
                  key={coin.id}
                  position={coin.position}
                  value={coin.value}
                  collected={coin.collected}
                />
              ))}
              
              {/* Bullseye Target */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-75"
                style={{ left: `${bullseyeTarget.position}%` }}
              >
                <div className="relative -translate-x-1/2">
                  {/* Outer ring - red */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-500 animate-pulse" />
                  {/* Middle ring - white */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white" />
                  {/* Inner ring - red */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500" />
                  {/* Center dot - white */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg" />
                  {/* Glow effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-red-400/30 blur-md animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Street lines */}
            <div className={`absolute top-1/2 left-0 right-0 h-1 opacity-80 transition-all duration-1000 ${
              gameWon ? 'bg-purple-400' : 'bg-yellow-400'
            }`} />
            
            {/* Position markers on opposite side of street */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-around px-8">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pos) => (
                <div
                  key={pos}
                  className="relative flex flex-col items-center"
                  style={{ left: `${pos - 50}%` }}
                >
                  <div className={`w-1 h-3 rounded-full transition-all ${
                    Math.abs(ballHorizontalPosition - pos) < 5 && ballPhase === 'ready'
                      ? 'bg-green-400 h-6 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
                      : 'bg-white/40'
                  }`} />
                  <div className={`text-[8px] font-bold mt-0.5 transition-all ${
                    Math.abs(ballHorizontalPosition - pos) < 5 && ballPhase === 'ready'
                      ? 'text-green-400 scale-110'
                      : 'text-white/50'
                  }`}>
                    {pos}
                  </div>
                </div>
              ))}
            </div>

            {/* Obstacles */}
            {obstacles.map((obs) => (
              <div
                key={obs.id}
                className="absolute bottom-16 transition-all"
                style={{ left: `${obs.position}%` }}
              >
                <div
                  className={`${
                    obs.type === "car"
                      ? "w-20 h-12 bg-gradient-to-r from-red-600 to-red-800"
                      : "w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800"
                  } rounded-lg shadow-lg`}
                />
              </div>
            ))}

            {/* Ball */}
            <div
              className={`absolute w-16 h-16 ${
                ballPhase === 'flying' ? 'transition-all duration-[800ms] ease-out' :
                ballPhase === 'hit' ? 'scale-90' :
                ballPhase === 'bouncing' ? 'transition-all duration-[800ms] ease-in-out' :
                ballPhase === 'missed' ? 'transition-all duration-[600ms] ease-in opacity-50' :
                'transition-all duration-200'
              }`}
              style={{
                left: `${ballPosition.x}%`,
                bottom: `${ballPosition.y}%`,
                filter: ballPhase === 'hit' ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
                transform: `translateX(-50%) ${
                  ballPhase === 'flying' ? 'scale(0.8) rotateZ(360deg)' :
                  ballPhase === 'hit' ? 'scale(1.3)' :
                  ballPhase === 'bouncing' ? 'scale(1.1) rotateZ(-360deg)' :
                  ballPhase === 'missed' ? 'scale(0.6) rotateZ(180deg)' :
                  'scale(1)'
                }`,
              }}
            >
              <img 
                src={getBallImageUrl(currentBall)!} 
                alt="Ball" 
                className={`w-full h-full object-contain ${ballPhase === 'hit' ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>
        </div>


        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
          
          {/* Movement controls */}
          {ballPhase === 'ready' && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={moveLeft}
                disabled={isThowing || isBallFlying}
                className="text-lg font-bold px-6 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                ← LEFT
              </Button>
              
              <div className="text-sm text-foreground/70 font-semibold min-w-[120px] text-center">
                Position: {Math.round(ballHorizontalPosition)}%
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={moveRight}
                disabled={isThowing || isBallFlying}
                className="text-lg font-bold px-6 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                RIGHT →
              </Button>
            </div>
          )}
          
          <Button
            size="lg"
            onMouseDown={startCharging}
            onMouseUp={releaseThrow}
            onMouseLeave={() => {
              if (isCharging) releaseThrow();
            }}
            onTouchStart={startCharging}
            onTouchEnd={releaseThrow}
            disabled={isThowing || isBallFlying}
            className="text-lg font-bold px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl animate-pulse-glow select-none"
          >
            {isBallFlying ? "THROWING..." : isCharging ? "RELEASE!" : "HOLD TO CHARGE"}
          </Button>

          {ballPhase === 'ready' && (
            <div className="text-sm text-foreground/70 font-semibold">
              Streak: {consecutiveHits}
            </div>
          )}
        </div>

        {/* Sound toggle button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className="absolute top-4 right-24 z-20 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>

        {/* Restart button */}
        <Button
          variant="outline"
          size="sm"
          onClick={restartGame}
          className="absolute top-4 right-4 z-20 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground px-3 py-1 text-xs w-20"
        >
          RESTART
        </Button>
      </div>

      {/* Confetti */}
      {showConfetti && <ConfettiEffect />}
      
      {/* Floating coins animation */}
      {showFloatingCoins && (
        <FloatingCoins 
          amount={floatingCoinAmount} 
          onComplete={() => setShowFloatingCoins(false)}
        />
      )}
      
      {/* Coin particles */}
      {coinParticles.map((particle, index) => (
        <CoinParticle
          key={particle.id}
          startX={window.innerWidth / 2}
          startY={window.innerHeight * 0.2}
          targetX={window.innerWidth / 2 + 200}
          targetY={40}
          delay={index * 100}
          onComplete={() => {
            setCoinParticles(prev => prev.filter(p => p.id !== particle.id));
          }}
        />
      ))}

      {/* Win modal */}
      {gameEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-8 text-center space-y-6 animate-bounce-in border-4 border-primary bg-card max-w-md">
            <div className="text-6xl">⏰</div>
            <h2 className="text-4xl font-bold text-primary">TIME'S UP!</h2>
            <p className="text-xl text-foreground">
              Final Score: <span className="font-bold text-accent">{score}</span>
            </p>
            <p className="text-lg text-muted-foreground">
              Time: <span className="font-bold">{formatTime(finalTime)}</span>
            </p>
            {score > highScore && (
              <p className="text-lg font-bold text-green-500">New High Score! 🎉</p>
            )}
            <p className="text-lg text-muted-foreground">
              High Score: {highScore}
            </p>
            <p className="text-xl text-yellow-500 font-bold">
              Session Coins Earned: {coinsEarned}
            </p>
            <p className="text-lg text-yellow-400">
              Total Coins: {coins}
            </p>
            
            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  size="lg"
                  onClick={restartGame}
                  className="text-lg font-bold px-8 bg-primary hover:bg-primary/90"
                >
                  PLAY AGAIN
                </Button>
                {fbInstant.isFBInstant() && (
                  <ShareButton score={score} coins={coinsEarned} />
                )}
              </div>
              
              {fbInstant.isFBInstant() && (
                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="text-primary underline mt-2"
                >
                  {showLeaderboard ? "Hide" : "Show"} Leaderboard
                </button>
              )}
              
              <RewardedAdButton onRewardEarned={handleRewardEarned} />
            </div>
          </Card>
          <ConfettiEffect />
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && gameEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-[60] p-4">
          <div className="relative">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-destructive/90 z-10"
            >
              ✕
            </button>
            <Leaderboard difficulty={difficulty} />
          </div>
        </div>
      )}
    </div>
  );
};
