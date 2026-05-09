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
import { SoundToggle } from "./SoundToggle";
import { saveScore } from "./LocalLeaderboard";
import { toast } from "sonner";
import { soundManager } from "@/lib/soundManager";

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
  // Y is bottom-% of full screen. Resting ball sits on near sidewalk (~8%),
  // far curb is around 58%, sky/backdrop above. See scene layout.
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 8 });
  const [ballHorizontalPosition, setBallHorizontalPosition] = useState(50); // 0-100 percentage
  const [isBallFlying, setIsBallFlying] = useState(false);
  const [ballPhase, setBallPhase] = useState<'ready' | 'flying' | 'hit' | 'bouncing' | 'missed'>('ready');
  
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [gameEnded, setGameEnded] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const obstacleIdRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const flightCancelRef = useRef(false);
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

  // Load player data from localStorage (difficulty-specific)
  useEffect(() => {
    const loadPlayerData = () => {
      const savedCoins = localStorage.getItem(`game-coins-${difficulty}`);
      const savedHighScore = localStorage.getItem(`game-highScore-${difficulty}`);
      const savedGamesPlayed = localStorage.getItem(`game-gamesplayed-${difficulty}`);
      setCoins(savedCoins ? parseInt(savedCoins) : 0);
      setHighScore(savedHighScore ? parseInt(savedHighScore) : 0);
      setGamesPlayed(savedGamesPlayed ? parseInt(savedGamesPlayed) : 0);
    };
    loadPlayerData();
  }, [difficulty]);

  // Save player data to localStorage (difficulty-specific)
  useEffect(() => {
    localStorage.setItem(`game-coins-${difficulty}`, coins.toString());
    localStorage.setItem(`game-highScore-${difficulty}`, highScore.toString());
    localStorage.setItem(`game-gamesplayed-${difficulty}`, gamesPlayed.toString());

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
      setObstacles((prev) => {
        const next = prev
          .map((obs) => ({ ...obs, position: obs.position + obs.speed }))
          .filter((obs) => obs.position < 110);
        obstaclesRef.current = next;
        return next;
      });
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

    // Continuous collision check during flight.
    // Ball Y is in screen-bottom-% (8 = near sidewalk, 58 = far curb).
    // Each obstacle's vertical position is derived the same way as in JSX:
    //   road container: bottom 14%, height 44%
    //   obstacle bottomPct (within road) = 6 + lane*70
    //   → global bottom% = 14 + (6 + lane*70) * 0.44
    const ROAD_BOTTOM = 14;
    const ROAD_HEIGHT = 44;
    const checkObstacleCollision = (ballX: number, ballY: number) => {
      return obstaclesRef.current.some((obs) => {
        const lane = ((obs.id * 37) % 100) / 100;
        const depthScale = 0.45 + lane * 0.75;
        const obsBottomGlobal =
          ROAD_BOTTOM + (6 + lane * 70) * (ROAD_HEIGHT / 100);

        // Hitbox sized roughly to the rendered car/bike, scaled by depth.
        const halfWidthPct = (obs.type === 'car' ? 7 : 4.5) * depthScale;
        const heightPct = (obs.type === 'car' ? 6 : 4) * depthScale;

        const obsCenterX = obs.position; // left:%; rendered with translateX(-50%) so position == center
        const dx = Math.abs(obsCenterX - ballX);
        const withinX = dx < halfWidthPct + 2; // +2% ball radius

        const ballAboveObs = ballY > obsBottomGlobal + heightPct + 2;
        const ballBelowObs = ballY < obsBottomGlobal - 2;
        const withinY = !ballAboveObs && !ballBelowObs;

        return withinX && withinY;
      });
    };

    // Phase 1: Ball flies from near sidewalk (y=8) up & away to far curb (y=58)
    // Weak throws fly slower with a smaller arc; strong throws are faster with a higher peak.

    const flightDuration = throwPower < 40 ? 1200 : throwPower < 70 ? 900 : 600; // ms
    const REST_Y = 8;       // near sidewalk (player's feet)
    const CURB_Y = 58;      // far curb (where bullseye lives)
    const peakBoost = throwPower < 40 ? 8 : throwPower < 70 ? 18 : 28; // extra height above curb at apex

    setBallPhase('flying');
    const startX = ballHorizontalPosition;
    setBallPosition({ x: startX, y: REST_Y });
    flightCancelRef.current = false;

    // Animate ball arc with horizontal movement based on angle
    const startTime = Date.now();
    const animateBallFlight = () => {
      if (flightCancelRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flightDuration, 1);

      // Linear travel from near sidewalk up to far curb, plus a sine-bump for the arc apex
      const baseY = REST_Y + (CURB_Y - REST_Y) * progress;
      const arcY = baseY + Math.sin(progress * Math.PI) * peakBoost;

      // Smooth horizontal movement from start to target
      const currentX = startX + (targetHorizontalPosition - startX) * progress;

      setBallPosition({ x: currentX, y: arcY });
      setBallHorizontalPosition(currentX);

      // Continuous collision check throughout the entire arc
      if (checkObstacleCollision(currentX, arcY)) {
        flightCancelRef.current = true;
        setBallPhase('missed');
        soundManager.playFail();
        setConsecutiveHits(0);
        toast.error("Hit an obstacle!", {
          description: "Ball was blocked! Streak reset!",
        });
        // Ball drops where it was hit, then resets
        setTimeout(() => {
          setBallPosition({ x: currentX, y: Math.max(REST_Y, arcY - 10) });
        }, 100);
        setTimeout(() => {
          setBallPosition({ x: targetHorizontalPosition, y: REST_Y });
          setBallPhase('ready');
          setIsBallFlying(false);
          setIsThrowing(false);
          setPower(0);
        }, 700);
        return;
      }

      if (progress < 1) {
        requestAnimationFrame(animateBallFlight);
      }
    };

    requestAnimationFrame(animateBallFlight);

    setTimeout(() => {
      if (flightCancelRef.current) return;
      setBallPosition({ x: targetHorizontalPosition, y: CURB_Y }); // Land on far curb
    }, flightDuration * 0.6);

    setTimeout(() => {
      if (flightCancelRef.current) return;
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
          setBallPosition({ x: targetHorizontalPosition, y: 8 }); // Bounce back to near sidewalk
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
          setBallPosition({ x: targetHorizontalPosition, y: -10 }); // Fall off-screen
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
            
            // Reset to near sidewalk
            setBallPosition({ x: targetHorizontalPosition, y: 8 });
            setBallPhase('ready');
            setIsBallFlying(false);
            setIsThrowing(false);
            setPower(0);
          }, 600);
        }
      }, 300);
    }, flightDuration * 0.6 + 800);
  };

  const restartGame = () => {
    soundManager.playClick();
    
    // Update high score
    if (score > highScore) {
      setHighScore(score);
    }
    
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    
    setScore(0);
    setLevel(1);
    setCoinsEarned(0);
    setConsecutiveHits(0);
    setBallHorizontalPosition(50);
    setCurbCoins([]);
    setGameEnded(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 8 });
    setGameStarted(false);
    setTimeRemaining(TIME_LIMIT);
    setShowLeaderboard(false);
    setFinalTime(0);
    toast.info("Game restarted! Good luck!");
  };

  const handleGameEnd = (finalScore: number, timeTaken: number) => {
    // Update high score
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    
    // Save to local leaderboard
    const newRank = saveScore(finalScore, difficulty);
    if (newRank && newRank <= 3) {
      toast.success(`🏆 New Top ${newRank} Score!`, {
        description: `You made it to the leaderboard!`,
      });
    }
    
    // Track games played
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    
    // Track achievement for games played
    if (onAchievementProgress) {
      onAchievementProgress('play_50', newGamesPlayed);
    }
    
    toast.success("Time's Up!", {
      description: `Final Score: ${finalScore} | Time: ${formatTime(timeTaken)} | Coins: ${coins}`,
    });
  };

  const handleRewardEarned = (amount: number) => {
    setCoins(coins + amount);
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
    if (ballId === 'default') {
      return null;
    }
    return `/balls/${ballId}.png`;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Sky + backdrop layer (top ~42% of screen, ends at far curb at 58%) */}
      <div
        className="absolute top-0 left-0 right-0 bg-cover bg-center"
        style={{
          height: '42%',
          backgroundImage: `url(${getBackdropUrl()})`,
        }}
      >
        {/* Soft fade into the curb */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />
      </div>
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
        {/* HUD — fluidly responsive across phone, tablet, desktop.
            Type sizes use clamp() so they scale smoothly without jumpy breakpoints. */}
        <div
          className="absolute left-2 right-2 sm:left-4 sm:right-4 top-2 sm:top-4 z-20 flex flex-wrap items-start justify-between gap-2"
        >
          {/* Left cluster: Back + (desktop) ThrowMeter */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDifficulty}
              className="bg-card/90 backdrop-blur-sm hover:bg-card px-2 sm:px-3"
              style={{ fontSize: 'clamp(10px, 2.4vw, 14px)' }}
            >
              ← Back
            </Button>

            {ballPhase === 'ready' && (
              <div className="hidden md:block">
                <ThrowMeter value={power} isCharging={isCharging} disabled={isThowing || isBallFlying} />
              </div>
            )}
          </div>

          {/* Right cluster: Score / Elapsed / Time / Coins — single fluid card */}
          <Card
            className="bg-card/90 backdrop-blur-sm border-2 border-primary flex-shrink"
            style={{
              padding: 'clamp(4px, 1.2vw, 12px) clamp(8px, 2vw, 24px)',
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: 'clamp(8px, 2.5vw, 28px)' }}
            >
              <div className="text-center leading-tight">
                <div
                  className="text-muted-foreground font-semibold uppercase tracking-wide"
                  style={{ fontSize: 'clamp(8px, 1.6vw, 12px)' }}
                >
                  Score
                </div>
                <div
                  className="font-bold text-primary tabular-nums"
                  style={{ fontSize: 'clamp(16px, 4.2vw, 30px)' }}
                >
                  {score}
                </div>
              </div>

              <div className="self-stretch w-px bg-border hidden xs:block sm:block" />

              <div className="text-center leading-tight hidden sm:block">
                <div
                  className="text-muted-foreground font-semibold uppercase tracking-wide"
                  style={{ fontSize: 'clamp(8px, 1.6vw, 12px)' }}
                >
                  Elapsed
                </div>
                <div
                  className="font-bold text-accent tabular-nums"
                  style={{ fontSize: 'clamp(14px, 3.4vw, 24px)' }}
                >
                  {formatTime(getElapsedTime())}
                </div>
              </div>

              <div className="self-stretch w-px bg-border hidden sm:block" />

              <div className="text-center leading-tight">
                <div
                  className="text-muted-foreground font-semibold uppercase tracking-wide"
                  style={{ fontSize: 'clamp(8px, 1.6vw, 12px)' }}
                >
                  Time
                </div>
                <div
                  className={`font-bold tabular-nums ${
                    timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'
                  }`}
                  style={{ fontSize: 'clamp(16px, 4.2vw, 30px)' }}
                >
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="self-stretch w-px bg-border" />

              <div className="text-center leading-tight">
                <div
                  className="text-muted-foreground font-semibold uppercase tracking-wide"
                  style={{ fontSize: 'clamp(8px, 1.6vw, 12px)' }}
                >
                  Coins
                </div>
                <div
                  className="font-bold text-yellow-500 tabular-nums"
                  style={{ fontSize: 'clamp(16px, 4.2vw, 30px)' }}
                >
                  {coins}
                </div>
              </div>
            </div>
          </Card>

          {/* Instructions strip — full-width row under the HUD, fluidly sized.
              Shows the active control hint based on game phase. */}
          <div
            className="basis-full flex justify-center pointer-events-none"
            style={{ marginTop: 'clamp(2px, 0.8vw, 8px)' }}
          >
            <div
              className="bg-card/70 backdrop-blur-sm border border-border/60 rounded-full text-foreground/80 font-medium text-center"
              style={{
                padding: 'clamp(2px, 0.8vw, 6px) clamp(8px, 2.4vw, 18px)',
                fontSize: 'clamp(10px, 2.2vw, 13px)',
                maxWidth: 'min(92vw, 560px)',
              }}
            >
              {ballPhase === 'ready'
                ? 'Use ← → to aim · Hold the throw button to charge · Release to launch'
                : ballPhase === 'flying'
                ? 'Ball in flight — dodge cars and bikes!'
                : ballPhase === 'hit'
                ? 'Nice hit! Watch the bounce…'
                : ballPhase === 'bouncing'
                ? 'Bouncing back to you'
                : 'Blocked! Resetting…'}
            </div>
          </div>
        </div>

        {/* Far curb strip — sits at the horizon, holds the bullseye + collectable coins */}
        <div
          className={`absolute left-0 right-0 z-10 transition-colors duration-1000 ${
            gameWon
              ? 'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700'
              : 'bg-gradient-to-b from-gray-300 via-gray-500 to-gray-700'
          } ${ballPhase === 'hit' ? 'animate-pulse' : ''}`}
          style={{
            bottom: '58%',
            height: '4%',
            boxShadow: ballPhase === 'hit'
              ? '0 4px 14px rgba(0,0,0,0.5), 0 0 40px rgba(255, 165, 0, 0.7)'
              : '0 4px 14px rgba(0,0,0,0.5)',
          }}
        >
          {/* Impact ring at landing position */}
          {ballPhase === 'hit' && (
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${ballPosition.x}%` }}
            >
              <div className="w-20 h-20 rounded-full bg-orange-500/40 animate-ping" />
            </div>
          )}

          {/* Hovering coins above the far curb */}
          {curbCoins.map((coin) => (
            <HoveringCoin
              key={coin.id}
              position={coin.position}
              value={coin.value}
              collected={coin.collected}
            />
          ))}

          {/* Bullseye target — moves along the far curb */}
          <div
            className="absolute top-0 -translate-y-1/2 transition-all duration-75"
            style={{ left: `${bullseyeTarget.position}%` }}
          >
            <div className="relative -translate-x-1/2">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-red-400/30 blur-md animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-lg" />
            </div>
          </div>
        </div>

        {/* Road — rectangular street running left↔right between the two curbs (~14%–58% of screen height).
            Cars drive horizontally across, so the road reads as a side-on street, not a vanishing-point road. */}
        <div
          className={`absolute left-0 right-0 transition-colors duration-1000 ${
            gameWon ? 'bg-gradient-to-b from-purple-900 to-purple-950' : ''
          }`}
          style={{
            bottom: '14%',
            height: '44%',
            background: gameWon ? undefined : `hsl(var(--game-street))`,
            boxShadow: 'inset 0 8px 16px rgba(0,0,0,0.35), inset 0 -8px 16px rgba(0,0,0,0.35)',
          }}
        >
          {/* Horizontal dashed yellow center line — runs full width across the middle of the road */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: '4px',
              background:
                'repeating-linear-gradient(to right, hsl(45 100% 54%) 0 28px, transparent 28px 56px)',
              opacity: 0.95,
              boxShadow: '0 0 6px rgba(0,0,0,0.4)',
            }}
          />

          {/* Obstacles — drive across the road, scaled by depth (their bottom %) */}
          {obstacles.map((obs) => {
            // Stable per-obstacle lane based on id (0..1 → top..bottom of road band)
            const lane = ((obs.id * 37) % 100) / 100; // pseudo-random but stable
            const depthScale = 0.45 + lane * 0.75; // far = small, near = bigger
            const bottomPct = 6 + lane * 70; // within the road band
            return (
              <div
                key={obs.id}
                className="absolute transition-all"
                style={{
                  left: `${obs.position}%`,
                  bottom: `${bottomPct}%`,
                  transform: `translateX(-50%) scale(${depthScale})`,
                  transformOrigin: 'center bottom',
                }}
              >
                <div
                  className={`${
                    obs.type === 'car'
                      ? 'w-24 h-12 bg-gradient-to-r from-red-600 to-red-800'
                      : 'w-14 h-8 bg-gradient-to-r from-blue-600 to-blue-800'
                  } rounded-lg shadow-lg`}
                />
              </div>
            );
          })}
        </div>

        {/* Near curb strip — the curb the player is standing on */}
        <div
          className={`absolute left-0 right-0 z-10 transition-colors duration-1000 ${
            gameWon
              ? 'bg-gradient-to-b from-yellow-400 to-yellow-700'
              : 'bg-gradient-to-b from-gray-400 to-gray-700'
          }`}
          style={{ bottom: '14%', height: '3%', boxShadow: '0 -2px 6px rgba(0,0,0,0.4)' }}
        />

        {/* Sidewalk — player POV, holds resting ball + lane markers */}
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{
            height: '14%',
            background:
              'repeating-linear-gradient(90deg, hsl(0 0% 78%) 0 14%, hsl(0 0% 72%) 14% 15%, hsl(0 0% 78%) 15% 29%, hsl(0 0% 72%) 29% 30%)',
          }}
        >
          {/* Lane / position markers across the sidewalk */}
          <div className="absolute top-2 left-0 right-0 flex justify-between px-6">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pos) => {
              const active = Math.abs(ballHorizontalPosition - pos) < 5 && ballPhase === 'ready';
              return (
                <div key={pos} className="flex flex-col items-center">
                  <div
                    className={`w-1 rounded-full transition-all ${
                      active
                        ? 'bg-green-400 h-7 shadow-[0_0_10px_rgba(74,222,128,0.9)]'
                        : 'bg-slate-700/60 h-3'
                    }`}
                  />
                  <div
                    className={`text-[9px] font-bold mt-0.5 transition-all ${
                      active ? 'text-green-500 scale-110' : 'text-slate-600'
                    }`}
                  >
                    {pos}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ball — positioned by bottom-% across the full scene */}
        <div
          className={`absolute z-20 ${
            ballPhase === 'flying' ? '' :
            ballPhase === 'hit' ? '' :
            ballPhase === 'bouncing' ? 'transition-all duration-[800ms] ease-in-out' :
            ballPhase === 'missed' ? 'transition-all duration-[600ms] ease-in opacity-50' :
            'transition-all duration-200'
          }`}
          style={{
            left: `${ballPosition.x}%`,
            bottom: `${ballPosition.y}%`,
            // Perspective scale: bigger near sidewalk (y≈8), smaller at far curb (y≈58)
            width: '4rem',
            height: '4rem',
            filter: ballPhase === 'hit'
              ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
              : 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
            transform: `translateX(-50%) scale(${
              Math.max(0.45, 1 - (ballPosition.y - 8) / 100)
            }) ${
              ballPhase === 'flying' ? 'rotateZ(360deg)' :
              ballPhase === 'hit' ? 'rotateZ(0deg)' :
              ballPhase === 'bouncing' ? 'rotateZ(-360deg)' :
              ballPhase === 'missed' ? 'rotateZ(180deg)' :
              'rotateZ(0deg)'
            }`,
          }}
        >
          {getBallImageUrl(currentBall) ? (
            currentBall === 'fire-ball' ? (
              // Fire ball: layered animated effects so it reads as a living flame, not a cut-out.
              <div className="relative w-full h-full">
                {/* Outer pulsing glow halo */}
                <div
                  className="absolute inset-[-30%] rounded-full animate-fire-glow pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,180,40,0.55) 0%, rgba(255,69,0,0.35) 40%, transparent 70%)',
                  }}
                />
                {/* Flame plume behind/above the ball, flickering */}
                <div
                  className="absolute left-1/2 -top-[55%] w-[110%] h-[110%] rounded-full animate-fire-flicker pointer-events-none mix-blend-screen"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 80%, #fff7c2 0%, #ffd24a 18%, #ff8a1a 45%, #ff3b00 70%, transparent 85%)',
                    transformOrigin: 'center bottom',
                  }}
                />
                {/* Secondary inner flame, faster flicker, offset phase */}
                <div
                  className="absolute left-1/2 -top-[35%] w-[75%] h-[90%] rounded-full animate-fire-flicker pointer-events-none mix-blend-screen"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 80%, #ffffff 0%, #fff0a0 25%, #ff9a2a 60%, transparent 85%)',
                    animationDuration: '0.3s',
                    transformOrigin: 'center bottom',
                  }}
                />
                {/* Embers floating up */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/4 w-1 h-1 rounded-full bg-orange-300 animate-ember-rise pointer-events-none"
                    style={{
                      // Stagger and randomize horizontal drift per ember
                      animationDelay: `${i * 0.18}s`,
                      ['--ember-x' as any]: `${(i % 2 === 0 ? 1 : -1) * (4 + i * 2)}px`,
                      boxShadow: '0 0 6px 2px rgba(255,160,40,0.9)',
                    } as React.CSSProperties}
                  />
                ))}
                {/* The ball image itself, gently wobbling so it doesn't look static */}
                <img
                  src={getBallImageUrl(currentBall)!}
                  alt="Fire Ball"
                  className={`relative w-full h-full object-contain animate-ball-wobble ${
                    ballPhase === 'hit' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    filter:
                      'drop-shadow(0 0 8px rgba(255,140,0,0.9)) drop-shadow(0 0 16px rgba(255,69,0,0.6))',
                  }}
                />
              </div>
            ) : (
              <img
                src={getBallImageUrl(currentBall)!}
                alt="Ball"
                className={`w-full h-full object-contain ${ballPhase === 'hit' ? 'animate-pulse' : ''}`}
              />
            )
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl">
              <div className={`w-full h-full rounded-full border-4 border-orange-900/30 ${
                ballPhase === 'hit' ? 'animate-pulse' : ''
              }`} />
            </div>
          )}
        </div>


        {/* Controls - Mobile Responsive */}
        <div className="absolute bottom-4 sm:bottom-8 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-20 flex flex-col items-center gap-2 sm:gap-4">
          
          {/* Movement controls */}
          {ballPhase === 'ready' && (
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="default"
                onClick={moveLeft}
                disabled={isThowing || isBallFlying}
                className="text-sm sm:text-lg font-bold px-3 sm:px-6 py-2 sm:py-3 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground flex-1 sm:flex-none max-w-[100px] sm:max-w-none"
              >
                ← LEFT
              </Button>
              
              <div className="text-xs sm:text-sm text-foreground/70 font-semibold min-w-[60px] sm:min-w-[120px] text-center">
                {Math.round(ballHorizontalPosition)}%
              </div>
              
              <Button
                variant="outline"
                size="default"
                onClick={moveRight}
                disabled={isThowing || isBallFlying}
                className="text-sm sm:text-lg font-bold px-3 sm:px-6 py-2 sm:py-3 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground flex-1 sm:flex-none max-w-[100px] sm:max-w-none"
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
            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl animate-pulse-glow select-none w-full sm:w-auto"
            style={{
              fontSize: 'clamp(13px, 3.2vw, 18px)',
              padding: 'clamp(10px, 2.6vw, 24px) clamp(18px, 5vw, 36px)',
            }}
          >
            {isBallFlying ? "THROWING..." : isCharging ? "RELEASE!" : "HOLD TO CHARGE"}
          </Button>

          {ballPhase === 'ready' && (
            <div className="text-xs sm:text-sm text-foreground/70 font-semibold flex items-center gap-2">
              <span>Streak: {consecutiveHits}</span>
              <span className="sm:hidden">• Coins: {coins}</span>
            </div>
          )}
        </div>

        {/* Sound toggle buttons */}
        <SoundToggle className="absolute bottom-2 sm:top-4 left-2 sm:right-24 sm:left-auto z-20" />

        {/* Restart button */}
        <Button
          variant="outline"
          size="sm"
          onClick={restartGame}
          className="absolute bottom-2 sm:top-4 right-2 sm:right-4 z-20 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground px-2 sm:px-3 py-1 text-[10px] sm:text-xs w-16 sm:w-20"
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
              <ShareButton score={score} coins={coinsEarned} />
              <Button
                size="lg"
                onClick={restartGame}
                className="text-lg font-bold px-8 bg-primary hover:bg-primary/90"
              >
                PLAY AGAIN
              </Button>
            </div>
          </Card>
          <ConfettiEffect />
        </div>
      )}

    </div>
  );
};
