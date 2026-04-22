import { useState, useEffect, useRef, useMemo } from "react";
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

type PlayState = "IDLE" | "AIMING" | "THROWING" | "BALL_IN_PLAY" | "SCORED" | "MISSED" | "RESET";

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
  const [preloadedInterstitial, setPreloadedInterstitial] = useState<unknown>(null);
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
  const [playState, setPlayState] = useState<PlayState>("IDLE");
  const [attempts, setAttempts] = useState(5);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scaleX: window.innerWidth / 1280,
    scaleY: window.innerHeight / 720,
  }));
  
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
  const bullseyeHitsRef = useRef(0); // Dedicated counter for bullseye challenge
  const [swipeAngle, setSwipeAngle] = useState(0);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const lastFrameRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const bullseyeRef = useRef<BullseyeTarget>({ position: 50, direction: 1 });
  const playStateRef = useRef<PlayState>("IDLE");
  const ballPhysicsRef = useRef({
    x: 50,
    y: 80,
    vx: 0,
    vy: 0,
    spin: 0,
    hasBounced: false,
  });

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    bullseyeRef.current = bullseyeTarget;
  }, [bullseyeTarget]);

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  const TIME_LIMIT = 180; // 3 minutes in seconds

  // Memoised star positions so they don't re-randomise on every render
  const starPositions = useMemo(() =>
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      opacity: 0.3 + Math.random() * 0.7,
    })), []);
  
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

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        scaleX: window.innerWidth / 1280,
        scaleY: window.innerHeight / 720,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!gameStarted || gameEnded) return;

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
  }, [currentDifficultySettings, gameStarted, gameEnded]);

  useEffect(() => {
    if (!gameStarted || gameEnded) return;

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
  }, [gameStarted, gameEnded]);

  useEffect(() => {
    if (!gameStarted || gameEnded) return;

    // Remove expired coins
    const checkExpiredCoins = setInterval(() => {
      const now = Date.now();
      setCurbCoins((prev) => prev.filter(coin => coin.expiresAt > now));
    }, 500); // Check every 500ms

    return () => clearInterval(checkExpiredCoins);
  }, [gameStarted, gameEnded]);

  useEffect(() => {
    if (!gameStarted || gameEnded) return;

    const curbY = 5;
    const gravity = 900 * viewport.scaleY;
    const restitution = 0.7;
    let resetTimeout: number | null = null;

    const loop = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      setObstacles((prev) =>
        prev
          .map((obs) => ({ ...obs, position: obs.position + obs.speed * delta * 20 }))
          .filter((obs) => obs.position < 110)
      );

      setBullseyeTarget((prev) => {
        let newPosition = prev.position + prev.direction * currentDifficultySettings.bullseyeSpeed * delta * 20;
        let newDirection = prev.direction;
        if (newPosition >= 85) {
          newPosition = 85;
          newDirection = -1;
        } else if (newPosition <= 15) {
          newPosition = 15;
          newDirection = 1;
        }
        return { position: newPosition, direction: newDirection };
      });

      if (playStateRef.current === "BALL_IN_PLAY") {
        const b = ballPhysicsRef.current;
        b.vy -= gravity * delta;
        b.vx += b.spin * delta * 60;
        b.x += b.vx * delta;
        b.y += b.vy * delta;

        const ballRadius = 2;
        if (b.y <= curbY + ballRadius && b.vy < 0 && !b.hasBounced) {
          b.y = curbY + ballRadius;
          b.vy = Math.abs(b.vy) * restitution;
          b.vx += (Math.random() * 20 - 10);
          b.hasBounced = true;
          setBallPhase("hit");
          soundManager.playImpact();
        }

        const obstacleHit = obstaclesRef.current.some((obs) => Math.abs((obs.position + 5) - b.x) < 6 && b.y < 25);
        if (obstacleHit) {
          setBallPhase("missed");
          setPlayState("MISSED");
        } else if (b.hasBounced && b.vy <= 0) {
          const bullseyeHit = Math.abs(bullseyeRef.current.position - b.x) < 6;
          const hitCurbZone = b.x >= 15 && b.x <= 85;
          if (hitCurbZone) {
            const pointsEarned = bullseyeHit ? 60 : 10;
            setScore((prev) => prev + pointsEarned);
            setConsecutiveHits((prev) => prev + 1);
            setCoins((prev) => prev + calculateCoinsEarned(70, true));
            setShowConfetti(true);
            if (bullseyeHit) bullseyeHitsRef.current += 1;
            setPlayState("SCORED");
            setBallPhase("bouncing");
            soundManager.playSuccess();
          } else {
            setPlayState("MISSED");
            setBallPhase("missed");
            soundManager.playFail();
            setConsecutiveHits(0);
            setAttempts((prev) => Math.max(prev - 1, 0));
          }
        } else if (b.y < -25 || b.x < -10 || b.x > 110) {
          setPlayState("MISSED");
          setBallPhase("missed");
          setConsecutiveHits(0);
          setAttempts((prev) => Math.max(prev - 1, 0));
        }

        setBallPosition({ x: b.x, y: b.y });
        setBallHorizontalPosition(Math.min(90, Math.max(10, b.x)));
      }

      if ((playStateRef.current === "SCORED" || playStateRef.current === "MISSED") && !resetTimeout) {
        setPlayState("RESET");
        resetTimeout = window.setTimeout(() => {
          ballPhysicsRef.current = { x: 50, y: 80, vx: 0, vy: 0, spin: 0, hasBounced: false };
          setBallPosition({ x: 50, y: 80 });
          setBallHorizontalPosition(50);
          setIsBallFlying(false);
          setIsThrowing(false);
          setPower(0);
          setBallPhase("ready");
          setPlayState("IDLE");
          setShowConfetti(false);
        }, 1500);
      }

      requestAnimationFrame(loop);
    };

    const frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      if (resetTimeout) clearTimeout(resetTimeout);
      lastFrameRef.current = 0;
    };
  }, [gameStarted, gameEnded, currentDifficultySettings.bullseyeSpeed, viewport.scaleY]);

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
    
    let lastTime = performance.now();
    let soundTimer = 0;

    const chargeLoop = (timestamp: number) => {
      const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      soundTimer += delta;

      if (soundTimer >= 0.2) {
        soundManager.playCharging();
        soundTimer = 0;
      }

      setPower((prev) => {
        let next = prev + 40 * delta; // 40 units per second, takes 2.5s to 100
        if (next >= 100) next -= 100;
        return next;
      });

      chargeIntervalRef.current = requestAnimationFrame(chargeLoop);
    };

    chargeIntervalRef.current = requestAnimationFrame(chargeLoop);
  };

  const releaseThrow = () => {
    if (!isCharging || !gameStarted) return;
    
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      cancelAnimationFrame(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    
    throwBall(power, swipeAngle);
  };

  // Pointer handlers for unified desktop/mobile flicking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isThowing || isBallFlying || ballPhase !== 'ready') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    setPlayState("AIMING");
    setBallHorizontalPosition(Math.min(90, Math.max(10, (localX / rect.width) * 100)));
    touchStartRef.current = {
      x: localX,
      y: localY,
      time: performance.now()
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || isThowing || isBallFlying || ballPhase !== 'ready') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const deltaX = localX - touchStartRef.current.x;
    const deltaY = localY - touchStartRef.current.y;
    
    // Calculate angle from swipe direction (left/right)
    const angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
    setSwipeAngle(angle);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || isThowing || isBallFlying || ballPhase !== 'ready' || !gameStarted) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const deltaX = localX - touchStartRef.current.x;
    const deltaY = localY - touchStartRef.current.y;
    const duration = Math.max((performance.now() - touchStartRef.current.time) / 1000, 0.03);
    const velocityX = deltaX / duration;
    const velocityY = deltaY / duration;

    if (Math.hypot(deltaX, deltaY) > 20) {
      throwBallFromGesture(velocityX, velocityY, rect);
    }

    touchStartRef.current = null;
    setSwipeAngle(0);
    setPlayState("THROWING");
  };

  const throwBall = (throwPower: number, angle: number = 0) => {
    const speed = (300 + Math.min(throwPower, 100) * 1.1) * Math.max(0.8, viewport.scaleY);
    const vx = Math.sin((angle * Math.PI) / 180) * speed * 0.55;
    const vy = speed;
    throwBallFromVelocity(vx, vy);
  };

  const throwBallFromGesture = (velocityX: number, velocityY: number, rect: DOMRect) => {
    const mappedVx = Math.max(-520, Math.min(520, (velocityX / rect.width) * 700));
    const mappedVy = Math.max(260, Math.min(420, (-velocityY / rect.height) * 900));
    throwBallFromVelocity(mappedVx, mappedVy);
  };

  const throwBallFromVelocity = (vx: number, vy: number) => {
    if (isThowing || isBallFlying || !gameStarted) return;
    setIsThrowing(true);
    setIsBallFlying(true);
    setBallPhase("flying");
    setPlayState("BALL_IN_PLAY");
    soundManager.playThrow();

    ballPhysicsRef.current = {
      x: ballHorizontalPosition,
      y: 80,
      vx,
      vy,
      spin: vx * 0.0015,
      hasBounced: false,
    };
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
    bullseyeHitsRef.current = 0;
    setBallHorizontalPosition(50);
    setCurbCoins([]);
    setGameEnded(false);
    setGameWon(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 80 });
    setGameStarted(false);
    setTimeRemaining(TIME_LIMIT);
    setShowLeaderboard(false);
    setFinalTime(0);
    setAttempts(5);
    setPlayState("IDLE");
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
      "dispatch-building": "/backgrounds/dispatch-building.png",
      "linden-mckinley-school": "/backgrounds/linden-mckinley-school.png",
      "backdrop-3": "/backgrounds/backdrop-3.png",
      "backdrop-4": "/backgrounds/backdrop-4.png",
      "backdrop-5": "/backgrounds/backdrop-5.png",
      "backdrop-6": "/backgrounds/backdrop-6.png",
      "poindexter-village": "/backgrounds/poindexter-village.png",
      "lincoln-theatre": "/backgrounds/lincoln-theatre.png",
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
    <div 
      className="fixed inset-0 m-0 p-0 block w-screen h-screen bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${getBackdropUrl()})`, backgroundSize: 'cover' }}
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
                  <h3 className="font-semibold text-lg">Aim & Throw</h3>
                  <p className="text-sm">Use ← / → buttons (or arrow keys) to aim, then <strong>hold the throw button</strong> to charge power and release to throw. On mobile, swipe up to throw!</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h3 className="font-semibold text-lg">Perfect Power</h3>
                  <p className="text-sm">Release in the <strong>green zone (60–80)</strong> for the best chance of a successful bounce. Watch the power meter!</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">💰</div>
                <div>
                  <h3 className="font-semibold text-lg">Collect Coins</h3>
                  <p className="text-sm">Hit the glowing coins on the curb for bonus points and currency to spend in the shop.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">⏱️</div>
                <div>
                  <h3 className="font-semibold text-lg">Beat the Clock</h3>
                  <p className="text-sm">Score as many points as possible in 3 minutes. Hit 100 points to unlock the <strong>Win Effect</strong>!</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">🚗</div>
                <div>
                  <h3 className="font-semibold text-lg">Avoid Obstacles</h3>
                  <p className="text-sm">Watch out for moving cars and bikes that block your throws. The game gets harder every 100 points!</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setGameStarted(true);
                setPlayState("IDLE");
              }}
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
          {starPositions.map((star) => (
            <div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                opacity: star.opacity,
              }}
            />
          ))}
        </div>
      )}

      {/* Game area */}
      <div 
        ref={gameAreaRef}
        className="relative h-full w-full flex flex-col"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* HUD - Mobile Responsive */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            {showBackConfirm ? (
              <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1">
                <span className="text-xs text-foreground font-medium">Quit?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBackToDifficulty}
                  className="h-6 px-2 text-xs"
                >
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBackConfirm(false)}
                  className="h-6 px-2 text-xs"
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => gameStarted && !gameEnded ? setShowBackConfirm(true) : onBackToDifficulty?.()}
                className="bg-card/90 backdrop-blur-sm hover:bg-card text-xs sm:text-sm px-2 sm:px-4"
              >
                ← Menu
              </Button>
            )}
            
            {ballPhase === 'ready' && (
              <div>
                <ThrowMeter value={power} isCharging={isCharging} disabled={isThowing || isBallFlying} />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            <Card className="px-2 sm:px-6 py-1.5 sm:py-3 bg-card/90 backdrop-blur-sm border-2 border-primary flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-8">
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">SCORE</div>
                  <div className="text-lg sm:text-3xl font-bold text-primary">{score}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border hidden sm:block" />
                <div className="text-center hidden md:block">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">ELAPSED</div>
                  <div className="text-base sm:text-2xl font-bold text-accent">{formatTime(getElapsedTime())}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">TIME</div>
                  <div className={`text-lg sm:text-3xl font-bold ${
                    timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'
                  }`}>{formatTime(timeRemaining)}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">LIVES/ATTEMPTS</div>
                  <div className="text-lg sm:text-3xl font-bold text-orange-400">{attempts}</div>
                </div>
              </div>
            </Card>
            
            <div>
              <CoinDisplay coins={coins} />
            </div>
          </div>
        </div>

        {/* Street and curb */}
        <div className="flex-1 flex items-end">
          <div className={`w-full relative transition-all duration-1000 ${
            gameWon ? 'bg-gradient-to-b from-purple-800 to-purple-950' : ''
          }`} style={{ 
            background: gameWon ? undefined : "hsl(var(--game-street))",
            height: `${Math.max(220, viewport.height * 0.38)}px`,
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
              className={`absolute ${
                ballPhase === 'flying' ? 'transition-all [transition-duration:800ms] ease-out' :
                ballPhase === 'hit' ? 'scale-90' :
                ballPhase === 'bouncing' ? 'transition-all [transition-duration:800ms] ease-in-out' :
                ballPhase === 'missed' ? 'transition-all [transition-duration:600ms] ease-in opacity-50' :
                'transition-all duration-200'
              }`}
              style={{
                width: `${Math.max(36, 64 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
                height: `${Math.max(36, 64 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
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
              {getBallImageUrl(currentBall) ? (
                <img 
                  src={getBallImageUrl(currentBall)!} 
                  alt="Ball" 
                  className={`w-full h-full object-contain ${ballPhase === 'hit' ? 'animate-pulse' : ''}`}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl">
                  <div className={`w-full h-full rounded-full border-4 border-orange-900/30 ${
                    ballPhase === 'hit' ? 'animate-pulse' : ''
                  }`} />
                </div>
              )}
            </div>
          </div>
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
            onPointerDown={startCharging}
            onPointerUp={releaseThrow}
            onPointerLeave={() => {
              if (isCharging) releaseThrow();
            }}
            disabled={isThowing || isBallFlying}
            className="text-base sm:text-lg font-bold px-6 sm:px-8 py-4 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl animate-pulse-glow select-none w-full sm:w-auto"
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
