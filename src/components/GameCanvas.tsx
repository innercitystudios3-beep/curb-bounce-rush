import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfettiEffect } from "./ConfettiEffect";
import { ThrowMeter } from "./ThrowMeter";
import { CoinDisplay } from "./CoinDisplay";
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

const MOBILE_LAYOUT = {
  HUD_BOTTOM_PERCENT: 16,
  FAR_CURB_PERCENT: 60,
  ROAD_TOP_PERCENT: 61,
  ROAD_BOTTOM_PERCENT: 88,
  CONTROLS_TOP_PERCENT: 88,
  PLAYER_START_X: 72,
  TARGET_START_X: 25,
} as const;

const ROAD_HEIGHT_PERCENT = MOBILE_LAYOUT.ROAD_BOTTOM_PERCENT - MOBILE_LAYOUT.ROAD_TOP_PERCENT;
const PLAYER_START_Y_PERCENT = MOBILE_LAYOUT.ROAD_BOTTOM_PERCENT - ROAD_HEIGHT_PERCENT * 0.22;
const TARGET_Y_PERCENT = MOBILE_LAYOUT.ROAD_TOP_PERCENT + ROAD_HEIGHT_PERCENT * 0.18;

type PlayState = "IDLE" | "AIMING" | "THROWING" | "BALL_IN_PLAY" | "RESOLVING" | "SCORED" | "MISSED" | "RESET";

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
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [showFloatingCoins, setShowFloatingCoins] = useState(false);
  const [floatingCoinAmount, setFloatingCoinAmount] = useState(0);
  const [coinParticles, setCoinParticles] = useState<Array<{ id: number }>>([]);
  const [consecutiveHits, setConsecutiveHits] = useState(0);
  const [isThrowing, setIsThrowing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const isChargingRef = useRef(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [curbCoins, setCurbCoins] = useState<CurbCoin[]>([]);
  const [bullseyeTarget, setBullseyeTarget] = useState<BullseyeTarget>({ position: MOBILE_LAYOUT.TARGET_START_X, direction: 1 });
  const [ballPosition, setBallPosition] = useState({ x: MOBILE_LAYOUT.PLAYER_START_X, y: PLAYER_START_Y_PERCENT });
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
  useEffect(() => { return () => { if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current); }; }, []);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const bullseyeHitsRef = useRef(0);
  const ballFlightRafRef = useRef<number | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const scoreRef = useRef(0);
  const gameStartedRef = useRef(false);
  const gameEndedRef = useRef(false);
  const [swipeAngle, setSwipeAngle] = useState(0);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const ROAD_TOP_PERCENT = MOBILE_LAYOUT.ROAD_TOP_PERCENT;
  const ROAD_BOTTOM_PERCENT = MOBILE_LAYOUT.ROAD_BOTTOM_PERCENT;
  const CURB_Y_PERCENT = MOBILE_LAYOUT.FAR_CURB_PERCENT;
  const PLAYER_START_Y = PLAYER_START_Y_PERCENT;
  const TARGET_Y = TARGET_Y_PERCENT;
  const isPausedRef = useRef(false);
  const powerRef = useRef(0);
  const attemptResolvedRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { powerRef.current = power; }, [power]);
  const lastFrameRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const curbCoinsRef = useRef<CurbCoin[]>([]);
  const bullseyeRef = useRef<BullseyeTarget>({ position: MOBILE_LAYOUT.TARGET_START_X, direction: 1 });
  const playStateRef = useRef<PlayState>("IDLE");
  const ballPhysicsRef = useRef({
    x: MOBILE_LAYOUT.PLAYER_START_X,
    y: PLAYER_START_Y_PERCENT,
    vx: 0,
    vy: 0,
    spin: 0,
    hasBounced: false,
    hitType: "none" as "none" | "target" | "curb",
  });

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);
  useEffect(() => {
    curbCoinsRef.current = curbCoins;
  }, [curbCoins]);

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
      obstacleSpawnChance: 0.7,
      obstacleSpeed: { min: 1, max: 2 },
      bullseyeSpeed: 0.5,
    },
    medium: {
      obstacleSpawnChance: 0.6,
      obstacleSpeed: { min: 1.5, max: 3 },
      bullseyeSpeed: 1.0,
    },
    hard: {
      obstacleSpawnChance: 0.5,
      obstacleSpeed: { min: 2, max: 4 },
      bullseyeSpeed: 1.8,
    }
  };

  const currentDifficultySettings = difficultySettings[difficulty];

  // Keep refs in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { isChargingRef.current = isCharging; }, [isCharging]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
  useEffect(() => { gameEndedRef.current = gameEnded; }, [gameEnded]);

  // Load player data from localStorage (difficulty-specific)
  useEffect(() => {
    const parseSafe = (val: string | null, fallback = 0) => {
      const n = parseInt(val ?? '', 10);
      return isNaN(n) || n < 0 ? fallback : n;
    };
    setCoins(parseSafe(localStorage.getItem(`game-coins-${difficulty}`)));
    setHighScore(parseSafe(localStorage.getItem(`game-highScore-${difficulty}`)));
    setGamesPlayed(parseSafe(localStorage.getItem(`game-gamesplayed-${difficulty}`)));
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

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  // Trigger win effect at 100 points
  useEffect(() => {
    if (score >= 100 && !gameWon && gameStarted && !gameEnded) {
      setGameWon(true);
    }
  }, [score, gameWon, gameStarted, gameEnded]);

  // Timer countdown — recreates when pause state changes so it truly stops
  useEffect(() => {
    if (!gameStarted || gameEnded || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameEnded(true);
          setFinalTime(TIME_LIMIT);
          soundManager.playSuccess();
          handleGameEnd(scoreRef.current, TIME_LIMIT);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameEnded, isPaused]);

  // Screen wake lock — prevent device from sleeping during active game
  useEffect(() => {
    if (!gameStarted || gameEnded) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock.request('screen');
        }
      } catch { /* unsupported or permission denied */ }
    };
    acquire();
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [gameStarted, gameEnded, isPaused]);

  // Page visibility — release charge when user switches tabs/apps
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isChargingRef.current) {
        setIsCharging(false);
        isChargingRef.current = false;
        if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Prevent passive touchmove (allows e.preventDefault() for scroll blocking)
  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => { e.preventDefault(); };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (ballFlightRafRef.current) cancelAnimationFrame(ballFlightRafRef.current);
    };
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isThrowing || isBallFlying || ballPhase !== 'ready') return;

      if (e.key === 'ArrowLeft') {
        setBallHorizontalPosition(prev => Math.max(10, prev - 5));
      } else if (e.key === 'ArrowRight') {
        setBallHorizontalPosition(prev => Math.min(90, prev + 5));
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        startCharging();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        releaseThrow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isThrowing, isBallFlying, ballPhase, isCharging, gameStarted]);

  const moveLeft = () => {
    if (isThrowing || isBallFlying || ballPhase !== 'ready') return;
    setBallHorizontalPosition(prev => Math.max(10, prev - 10));
    soundManager.playClick();
  };

  const moveRight = () => {
    if (isThrowing || isBallFlying || ballPhase !== 'ready') return;
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

  const setPlayStateSafe = (nextState: PlayState) => {
    playStateRef.current = nextState;
    setPlayState(nextState);
  };

  const resetBallToStart = () => {
    ballPhysicsRef.current = {
      x: MOBILE_LAYOUT.PLAYER_START_X,
      y: PLAYER_START_Y,
      vx: 0,
      vy: 0,
      spin: 0,
      hasBounced: false,
      hitType: "none",
    };
    setBallPosition({ x: MOBILE_LAYOUT.PLAYER_START_X, y: PLAYER_START_Y });
    setBallHorizontalPosition(MOBILE_LAYOUT.PLAYER_START_X);
    setIsBallFlying(false);
    setIsThrowing(false);
    setPower(0);
    powerRef.current = 0;
    setBallPhase("ready");
  };

  const scheduleResetToReady = (delayMs = 700) => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = window.setTimeout(() => {
      resetBallToStart();
      setShowConfetti(false);
      setPlayStateSafe("IDLE");
      attemptResolvedRef.current = true;
      resetTimeoutRef.current = null;
    }, delayMs);
  };

  const resolveAttempt = ({
    hitType,
    attemptsDelta = 0,
    success = false,
    delayMs = 700,
  }: {
    hitType: "target" | "curb" | "obstacle" | "miss";
    attemptsDelta?: number;
    success?: boolean;
    delayMs?: number;
  }) => {
    if (attemptResolvedRef.current) return;
    attemptResolvedRef.current = true;
    setPlayStateSafe("RESOLVING");
    if (attemptsDelta !== 0) {
      setAttempts((prev) => Math.max(prev + attemptsDelta, 0));
    }
    if (success) {
      setBallPhase("bouncing");
      soundManager.playSuccess();
    } else {
      setBallPhase("missed");
      setConsecutiveHits(0);
      onChallengeProgress?.("perfect_streak", 0);
      if (hitType === "obstacle" || hitType === "miss") {
        soundManager.playFail();
      }
    }
    scheduleResetToReady(delayMs);
  };

  const beginThrow = () => {
    attemptResolvedRef.current = false;
    setPlayStateSafe("BALL_IN_PLAY");
  };

  useEffect(() => {
    if (!gameStarted || gameEnded || isPaused) return;

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
  }, [currentDifficultySettings, gameStarted, gameEnded, isPaused]);

  useEffect(() => {
    if (!gameStarted || gameEnded || isPaused) return;

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
  }, [gameStarted, gameEnded, isPaused]);

  useEffect(() => {
    if (!gameStarted || gameEnded || isPaused) return;

    // Remove expired coins
    const checkExpiredCoins = setInterval(() => {
      const now = Date.now();
      setCurbCoins((prev) => prev.filter(coin => coin.expiresAt > now));
    }, 500); // Check every 500ms

    return () => clearInterval(checkExpiredCoins);
  }, [gameStarted, gameEnded, isPaused]);

  useEffect(() => {
    if (!gameStarted || gameEnded || isPaused) return;

    const friction = 0.992;
    const farCurbBounce = 0.85;
    const edgeBounce = 0.8;
    const ballRadiusPx = viewport.width * 0.035;
    const targetRadiusPx = viewport.width * 0.055;
    const ballRadiusYPercent = (ballRadiusPx / viewport.height) * 100;
    let cancelled = false;

    const checkCoinCollisions = (ball: { x: number; y: number }) => {
      let bonus = 0;
      const ballPx = {
        x: (ball.x / 100) * viewport.width,
        y: (ball.y / 100) * viewport.height,
      };
      const nextCoins = curbCoinsRef.current.map((coin) => {
        if (coin.collected) return coin;
        const coinPx = {
          x: (coin.position / 100) * viewport.width,
          y: (TARGET_Y / 100) * viewport.height,
        };
        const dist = Math.hypot(ballPx.x - coinPx.x, ballPx.y - coinPx.y);
        if (dist > ballRadiusPx + targetRadiusPx * 0.45) return coin;
        bonus += coin.value;
        soundManager.playCoinCollect();
        return { ...coin, collected: true };
      });
      if (bonus > 0) {
        curbCoinsRef.current = nextCoins;
        setCurbCoins(nextCoins);
        setCoins((prev) => prev + bonus);
        setCoinsEarned((prev) => prev + bonus);
        window.setTimeout(() => {
          setCurbCoins((prev) => prev.filter((coin) => !coin.collected));
        }, 450);
      }
    };

    const loop = (timestamp: number) => {
      if (cancelled) return;
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const last = lastFrameTimeRef.current ?? timestamp;
      const delta = Math.min((timestamp - last) / 1000, 0.033);
      lastFrameTimeRef.current = timestamp;
      lastFrameRef.current = timestamp;

      setObstacles((prev) =>
        prev
          .map((obs) => ({ ...obs, position: obs.position + obs.speed * delta * 20 }))
          .filter((obs) => obs.position < 110)
      );

      setBullseyeTarget((prev) => {
        let newPosition = prev.position + prev.direction * currentDifficultySettings.bullseyeSpeed * delta * 20;
        let newDirection = prev.direction;
        if (newPosition >= 42) {
          newPosition = 42;
          newDirection = -1;
        } else if (newPosition <= 18) {
          newPosition = 18;
          newDirection = 1;
        }
        return { position: newPosition, direction: newDirection };
      });

      if (playStateRef.current === "BALL_IN_PLAY" && !attemptResolvedRef.current) {
        const b = ballPhysicsRef.current;
        b.x += b.vx * delta;
        b.y += b.vy * delta;
        const frictionStep = Math.pow(friction, delta * 60);
        b.vx *= frictionStep;
        b.vy *= frictionStep;

        if (b.x <= 0 || b.x >= 100) {
          b.x = Math.max(0, Math.min(100, b.x));
          b.vx *= -edgeBounce;
        }

        const obstacleHit = obstaclesRef.current.some(
          (obs) => Math.abs((obs.position + 6) - b.x) < 7 && b.y >= ROAD_TOP_PERCENT + 2 && b.y <= ROAD_BOTTOM_PERCENT + 2
        );

        if (obstacleHit) {
          b.hitType = "none";
          b.hasBounced = false;
          b.vx = 0;
          b.vy = 0;
          b.y = PLAYER_START_Y;
          setBallPosition({ x: b.x, y: b.y });
          setBallHorizontalPosition(Math.min(90, Math.max(10, b.x)));
          resolveAttempt({ hitType: "obstacle", attemptsDelta: -1, success: false, delayMs: 650 });
          animationFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        checkCoinCollisions(b);

        const outOfBounds = b.y < ROAD_TOP_PERCENT - 10 || b.y > ROAD_BOTTOM_PERCENT + 20 || b.x < -5 || b.x > 105;
        if (outOfBounds) {
          resolveAttempt({ hitType: "miss", attemptsDelta: -1, success: false, delayMs: 650 });
          setBallPosition({ x: b.x, y: b.y });
          setBallHorizontalPosition(Math.min(90, Math.max(10, b.x)));
          animationFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        const dxPx = ((b.x - bullseyeRef.current.position) * viewport.width) / 100;
        const dyPx = ((b.y - TARGET_Y) * viewport.height) / 100;
        const distToTarget = Math.hypot(dxPx, dyPx);

        if (distToTarget <= ballRadiusPx + targetRadiusPx && b.hitType !== "target" && !attemptResolvedRef.current) {
          const norm = distToTarget === 0 ? { x: 1, y: 0 } : { x: dxPx / distToTarget, y: dyPx / distToTarget };
          const velPx = {
            x: (b.vx * viewport.width) / 100,
            y: (b.vy * viewport.height) / 100,
          };
          const dot = velPx.x * norm.x + velPx.y * norm.y;
          const reflectX = velPx.x - 2 * dot * norm.x;
          const reflectY = velPx.y - 2 * dot * norm.y;
          b.vx = (reflectX / viewport.width) * 100;
          b.vy = (reflectY / viewport.height) * 100;
          b.hasBounced = true;
          b.hitType = "target";
          setBallPhase("hit");
          soundManager.playImpact();

          const pointsEarned = Math.abs(bullseyeRef.current.position - b.x) < 6 ? 60 : 10;
          const coinsGained = calculateCoinsEarned(powerRef.current, true);
          setScore((prev) => {
            const newScore = prev + pointsEarned;
            onAchievementProgress?.("first_1000", newScore);
            onChallengeProgress?.("score_500", newScore);
            return newScore;
          });
          setConsecutiveHits((prev) => {
            const newStreak = prev + 1;
            onAchievementProgress?.("streak_10", newStreak);
            onChallengeProgress?.("perfect_streak", newStreak);
            return newStreak;
          });
          setCoins((prev) => prev + coinsGained);
          setCoinsEarned((prev) => prev + coinsGained);
          bullseyeHitsRef.current += 1;
          onChallengeProgress?.("bullseye_5", bullseyeHitsRef.current);
          setShowConfetti(true);
        }

        if (b.y <= ROAD_TOP_PERCENT + ballRadiusYPercent) {
          b.y = ROAD_TOP_PERCENT + ballRadiusYPercent;
          b.vy = Math.abs(b.vy) * farCurbBounce;
          b.vx *= 0.95;
          b.hasBounced = true;
          if (b.hitType === "none") b.hitType = "curb";
          setBallPhase("bouncing");
          soundManager.playImpact();
        }

        if (b.y >= PLAYER_START_Y && b.hasBounced) {
          b.y = PLAYER_START_Y;
          b.vx *= 0.8;
          b.vy *= -0.2;
        }

        const speedPx = Math.hypot((b.vx * viewport.width) / 100, (b.vy * viewport.height) / 100);
        if (speedPx < 8 && b.hasBounced) {
          if (b.hitType === "target") {
            resolveAttempt({ hitType: "target", success: true, delayMs: 750 });
          } else {
            resolveAttempt({ hitType: b.hitType === "curb" ? "curb" : "miss", attemptsDelta: -1, success: false, delayMs: 700 });
          }
        }

        setBallPosition({ x: b.x, y: b.y });
        setBallHorizontalPosition(Math.min(90, Math.max(10, b.x)));
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      lastFrameTimeRef.current = null;
      lastFrameRef.current = 0;
    };
  }, [PLAYER_START_Y, ROAD_BOTTOM_PERCENT, ROAD_TOP_PERCENT, TARGET_Y, currentDifficultySettings.bullseyeSpeed, gameEnded, gameStarted, isPaused, onAchievementProgress, onChallengeProgress, viewport.height, viewport.width]);

  const startCharging = () => {
    if (isThrowing || isBallFlying) return;
    
    setIsCharging(true);
    isChargingRef.current = true;
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
        powerRef.current = next;
        return next;
      });

      if (isChargingRef.current) {
        chargeIntervalRef.current = requestAnimationFrame(chargeLoop);
      }
    };

    if (isChargingRef.current) {
      chargeIntervalRef.current = requestAnimationFrame(chargeLoop);
    }
  };

  const releaseThrow = () => {
    if (!isCharging || !gameStarted) return;
    
    setIsCharging(false);
    isChargingRef.current = false;
    if (chargeIntervalRef.current) {
      cancelAnimationFrame(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    
    throwBall(powerRef.current, swipeAngle);
  };

  // Pointer handlers for unified desktop/mobile input
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isThrowing || isBallFlying || ballPhase !== 'ready') return;

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
    if (isThrowing || isBallFlying || ballPhase !== 'ready') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;

    setBallHorizontalPosition(Math.min(90, Math.max(10, (localX / rect.width) * 100)));

    if (touchStartRef.current) {
      const localY = e.clientY - rect.top;
      const deltaX = localX - touchStartRef.current.x;
      const deltaY = localY - touchStartRef.current.y;
      const angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
      setSwipeAngle(angle);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || isThrowing || isBallFlying || ballPhase !== 'ready' || !gameStarted) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const deltaX = localX - touchStartRef.current.x;
    const deltaY = localY - touchStartRef.current.y;
    const duration = Math.max((performance.now() - touchStartRef.current.time) / 1000, 0.03);
    const velocityX = deltaX / duration;
    const velocityY = deltaY / duration;

    if (Math.hypot(deltaX, deltaY) > 20) {
      throwBallFromGesture(velocityX, velocityY);
    }

    touchStartRef.current = null;
    setSwipeAngle(0);
  };

  const throwBall = (throwPower: number, angle: number = 0) => {
    if (isThrowing || isBallFlying || !gameStarted || isPausedRef.current) return;
    const targetDx = bullseyeRef.current.position - ballHorizontalPosition;
    const targetDy = TARGET_Y - PLAYER_START_Y;
    const baseAngle = Math.atan2(targetDy, targetDx);
    const aimAngle = baseAngle + ((angle * Math.PI) / 180) * 0.25;
    const launchSpeedPx = 460 + Math.min(throwPower, 100) * 5.8;
    throwBallFromVelocity(aimAngle, launchSpeedPx);
  };

  const throwBallFromGesture = (velocityX: number, velocityY: number) => {
    const aimAngle = Math.atan2(velocityY, velocityX);
    const launchSpeedPx = Math.max(420, Math.min(980, Math.hypot(velocityX, velocityY) * 0.16));
    throwBallFromVelocity(aimAngle, launchSpeedPx);
  };

  const throwBallFromVelocity = (aimAngle: number, launchSpeedPx: number) => {
    if (isThrowing || isBallFlying || !gameStarted) return;
    setIsThrowing(true);
    setIsBallFlying(true);
    setBallPhase("flying");
    beginThrow();
    setShowConfetti(false);
    soundManager.playThrow();
    const vxPercent = (Math.cos(aimAngle) * launchSpeedPx / viewport.width) * 100;
    const vyPercent = (Math.sin(aimAngle) * launchSpeedPx / viewport.height) * 100;
    ballPhysicsRef.current = {
      x: ballHorizontalPosition,
      y: PLAYER_START_Y,
      vx: vxPercent,
      vy: vyPercent,
      spin: vxPercent * 0.0015,
      hasBounced: false,
      hitType: "none",
    };
    setBallPosition({ x: ballHorizontalPosition, y: PLAYER_START_Y });
  };

  const restartGame = () => {
    soundManager.playClick();
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    // Update high score
    if (score > highScore) {
      setHighScore(score);
    }

    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);

    setScore(0);
    setCoinsEarned(0);
    setConsecutiveHits(0);
    bullseyeHitsRef.current = 0;
    setBallHorizontalPosition(MOBILE_LAYOUT.PLAYER_START_X);
    setCurbCoins([]);
    setGameEnded(false);
    setGameWon(false);
    setObstacles([]);
    setBallPosition({ x: MOBILE_LAYOUT.PLAYER_START_X, y: PLAYER_START_Y });
    setGameStarted(false);
    setTimeRemaining(TIME_LIMIT);
    setFinalTime(0);
    setAttempts(5);
    attemptResolvedRef.current = true;
    setPlayStateSafe("IDLE");
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
      className="fixed inset-0 m-0 block w-screen overflow-hidden bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${getBackdropUrl()})`, backgroundSize: "cover", backgroundPosition: "center 18%", height: "100dvh" }}
    >
      {/* Starting Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-4 border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-6 text-center">Curb Ball Challenge</h1>
            
            <div className="space-y-4 text-white/90 mb-8">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="font-semibold text-lg">Aim & Throw</h3>
                  <p className="text-sm">Move your <strong>finger</strong> (mobile) or <strong>mouse</strong> (desktop) to aim. Hold the throw button or press <strong>Space</strong> to charge power, then release to throw!</p>
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
        role="main"
        aria-label="Curb Ball game — aim with the left and right buttons, hold Charge to throw"
        className="relative h-full w-full touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* HUD - Mobile Responsive */}
        <div className="absolute left-2 right-2 z-20 flex flex-wrap justify-between items-start gap-1.5" style={{ top: "max(0.4rem, env(safe-area-inset-top))", maxHeight: `${MOBILE_LAYOUT.HUD_BOTTOM_PERCENT}dvh` }}>
          <div className="flex items-center gap-1.5 sm:gap-3">
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

            {gameStarted && !gameEnded && (
              <Button
                variant="outline"
                size="sm"
                aria-label={isPaused ? 'Resume game' : 'Pause game'}
                onClick={() => setIsPaused(p => !p)}
                className="bg-card/90 backdrop-blur-sm hover:bg-card text-xs sm:text-sm px-2 sm:px-4 min-w-[44px] min-h-[44px]"
              >
                {isPaused ? '▶' : '⏸'}
              </Button>
            )}
            
            {ballPhase === 'ready' && (
              <div>
                <ThrowMeter value={power} isCharging={isCharging} disabled={isThrowing || isBallFlying} />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 w-full sm:w-auto justify-end">
            <Card className="px-2 py-1.5 bg-card/90 backdrop-blur-sm border border-primary flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">SCORE</div>
                  <div className="text-base sm:text-2xl font-bold text-primary">{score}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border hidden sm:block" />
                <div className="text-center hidden md:block">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">ELAPSED</div>
                  <div className="text-base sm:text-2xl font-bold text-accent">{formatTime(getElapsedTime())}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold">TIME</div>
                  <div className={`text-base sm:text-2xl font-bold ${
                    timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'
                  }`}>{formatTime(timeRemaining)}</div>
                </div>
                <div className="h-6 sm:h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold whitespace-nowrap"><span className="sm:hidden">LIVES</span><span className="hidden sm:inline">LIVES/ATTEMPTS</span></div>
                  <div className="text-base sm:text-2xl font-bold text-orange-400">{attempts}</div>
                </div>
              </div>
            </Card>
            
            <div>
              <CoinDisplay coins={coins} />
            </div>
          </div>
        </div>

        {/* Scene layers: full background -> road -> gameplay objects */}
        <div
          className={`absolute left-0 right-0 transition-all duration-700 ${
            gameWon ? "bg-gradient-to-b from-purple-800 to-purple-950" : ""
          }`}
          style={{
            top: `${ROAD_TOP_PERCENT}%`,
            bottom: `${100 - ROAD_BOTTOM_PERCENT}%`,
            background: gameWon ? undefined : "hsl(var(--game-street))",
          }}
        >
          <div className={`absolute top-0 left-0 right-0 h-4 ${gameWon ? "bg-gradient-to-b from-yellow-400 to-yellow-600" : "bg-gradient-to-b from-gray-400 to-gray-600"}`} />
          <div className={`absolute top-[42%] left-0 right-0 h-1 opacity-80 ${gameWon ? "bg-purple-400" : "bg-yellow-400"}`} />

          {obstacles.map((obs) => (
            <div key={obs.id} className="absolute transition-all" style={{ left: `${obs.position}%`, bottom: "14%" }}>
              <div className={`${obs.type === "car" ? "w-16 h-10 bg-gradient-to-r from-red-600 to-red-800" : "w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-800"} rounded-lg shadow-lg`} />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 h-1 bg-gray-300/90 shadow-md pointer-events-none" style={{ top: `${CURB_Y_PERCENT}%` }} />

        <div className="absolute inset-0 pointer-events-none">
          {curbCoins.map((coin) => (
            <HoveringCoin key={coin.id} position={coin.position} value={coin.value} collected={coin.collected} />
          ))}

          <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75" style={{ left: `${bullseyeTarget.position}%`, top: `${TARGET_Y}%` }}>
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg" />
            </div>
          </div>

          {ballPhase === "ready" && gameStarted && difficulty !== "hard" && (
            <svg className="absolute inset-0 w-full h-full opacity-75" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#facc15" />
                </marker>
              </defs>
              <line x1={ballPosition.x} y1={ballPosition.y} x2={bullseyeTarget.position} y2={TARGET_Y} stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowhead)" />
            </svg>
          )}

          <div
            className={`absolute ${ballPhase === "missed" ? "opacity-60" : ""}`}
            style={{
              width: `${Math.max(42, 72 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
              height: `${Math.max(42, 72 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
              left: `${ballPosition.x}%`,
              top: `${ballPosition.y}%`,
              transform: "translate(-50%, -50%)",
              filter: ballPhase === "hit" ? "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))" : "drop-shadow(0 10px 15px rgba(0,0,0,0.5))",
            }}
          >
            {getBallImageUrl(currentBall) ? (
              <img src={getBallImageUrl(currentBall)!} alt="Ball" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl" />
            )}
          </div>
        </div>


        {/* Controls - single bottom overlay for mobile */}
        <div className="absolute left-0 right-0 z-20 flex flex-col items-center gap-2 bg-black/30 px-2 py-2 backdrop-blur-sm" style={{ top: `${MOBILE_LAYOUT.CONTROLS_TOP_PERCENT}%`, height: "min(12dvh, 112px)", paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}>
          {ballPhase === "ready" && (
            <div className="flex items-center gap-2 w-full justify-center">
              <Button variant="outline" size="sm" onClick={moveLeft} disabled={isThrowing || isBallFlying} className="min-h-[44px] px-3">←</Button>
              <div className="text-xs text-white/80 font-semibold min-w-[52px] text-center">{Math.round(ballHorizontalPosition)}%</div>
              <Button variant="outline" size="sm" onClick={moveRight} disabled={isThrowing || isBallFlying} className="min-h-[44px] px-3">→</Button>
            </div>
          )}
          <div className="flex items-center gap-2 w-full justify-center">
            <SoundToggle className="flex-none" />
            <Button
              size="lg"
              onPointerDown={(e) => { e.stopPropagation(); startCharging(); }}
              onPointerUp={(e) => { e.stopPropagation(); releaseThrow(); }}
              onPointerLeave={() => { if (isCharging) releaseThrow(); }}
              disabled={isThrowing || isBallFlying}
              className="text-sm font-bold px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl animate-pulse-glow select-none flex-1 max-w-[320px]"
            >
              {isBallFlying ? "THROWING..." : isCharging ? "RELEASE!" : "HOLD TO CHARGE"}
            </Button>
            <Button variant="outline" size="sm" onClick={restartGame} aria-label="Restart game" className="min-h-[44px] px-3">
              Restart
            </Button>
          </div>
        </div>
      </div>

      {/* Pause overlay */}
      {isPaused && gameStarted && !gameEnded && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card/95 rounded-2xl p-8 text-center shadow-2xl border border-border">
            <div className="text-5xl mb-4">⏸</div>
            <h2 className="text-3xl font-bold text-foreground mb-6">Paused</h2>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setIsPaused(false)} className="text-lg font-bold px-10 bg-primary hover:bg-primary/90 min-h-[52px]">
                ▶ Resume
              </Button>
              <Button variant="outline" size="sm" onClick={restartGame} className="border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground min-h-[44px]">
                Restart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti */}
      {showConfetti && <ConfettiEffect />}
      
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
