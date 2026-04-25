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
  const [bullseyeTarget, setBullseyeTarget] = useState<BullseyeTarget>({ position: 50, direction: 1 });
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 30 });
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
  const isPausedRef = useRef(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  const lastFrameRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const bullseyeRef = useRef<BullseyeTarget>({ position: 50, direction: 1 });
  const playStateRef = useRef<PlayState>("IDLE");
  const ballPhysicsRef = useRef({
    x: 50,
    y: 30,
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
        if (chargeSoundIntervalRef.current) clearInterval(chargeSoundIntervalRef.current);
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

    // Curb is at the TOP of the street div (bottom: 88% in the coordinate system).
    // Ball starts near the bottom (y=15) and flies upward toward the curb (y=88).
    const curbY = 90;
    const gravity = 500 * viewport.scaleY;
    const restitution = 0.65;
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

      // Move bullseye target slowly
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
        b.vy -= gravity * delta; // gravity pulls down (reduces upward velocity)
        b.vx += b.spin * delta * 60;
        b.x += b.vx * delta;
        b.y += b.vy * delta;

        const ballRadius = 2;

        // Ball reaches the curb (top of street) on the way UP
        if (b.y >= curbY - ballRadius && b.vy > 0 && !b.hasBounced) {
          b.y = curbY - ballRadius;
          b.vy = -Math.abs(b.vy) * restitution; // bounce back down
          b.vx += (Math.random() * 20 - 10);
          b.hasBounced = true;
          setBallPhase("hit");
          soundManager.playImpact();

          // Score immediately at the moment of curb contact
          const bullseyeHit = Math.abs(bullseyeRef.current.position - b.x) < 6;
          const hitCurbZone = b.x >= 15 && b.x <= 85;
          if (hitCurbZone) {
            const coinsGained = calculateCoinsEarned(70, true);
            const pointsEarned = bullseyeHit ? 60 : 10;
            setScore((prev) => prev + pointsEarned);
            setConsecutiveHits((prev) => prev + 1);
            setCoins((prev) => prev + coinsGained);
            setCoinsEarned((prev) => prev + coinsGained);
            setShowConfetti(true);
            if (bullseyeHit) bullseyeHitsRef.current += 1;
            setPlayState("SCORED");
            playStateRef.current = "SCORED";
            setBallPhase("bouncing");
            soundManager.playSuccess();
          } else {
            setPlayState("MISSED");
            playStateRef.current = "MISSED";
            setBallPhase("missed");
            soundManager.playFail();
            setConsecutiveHits(0);
            setAttempts((prev) => Math.max(prev - 1, 0));
          }
        }

        // Obstacles are in the lower portion of the street (y 25–65)
        const obstacleHit = obstaclesRef.current.some(
          (obs) => Math.abs((obs.position + 5) - b.x) < 6 && b.y >= 25 && b.y <= 65
        );
        if (obstacleHit && playStateRef.current === "BALL_IN_PLAY") {
          setBallPhase("missed");
          setPlayState("MISSED");
          playStateRef.current = "MISSED";
        }

        // Off-screen or fell back without bouncing
        if (
          playStateRef.current === "BALL_IN_PLAY" &&
          (b.y < -10 || b.y > 130 || b.x < -10 || b.x > 110)
        ) {
          setPlayState("MISSED");
          playStateRef.current = "MISSED";
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
          ballPhysicsRef.current = { x: 50, y: 30, vx: 0, vy: 0, spin: 0, hasBounced: false };
          setBallPosition({ x: 50, y: 30 });
          setBallHorizontalPosition(50);
          setIsBallFlying(false);
          setIsThrowing(false);
          setPower(0);
          setBallPhase("ready");
          setPlayState("IDLE");
          playStateRef.current = "IDLE";
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
    
    throwBall(power, swipeAngle);
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
      throwBallFromGesture(velocityX, velocityY, rect);
    }

    touchStartRef.current = null;
    setSwipeAngle(0);
    setPlayState("THROWING");
  };

  const throwBall = (throwPower: number, angle: number = 0) => {
    if (isThrowing || isBallFlying || !gameStarted || isPausedRef.current) return;
    const speed = (320 + Math.min(throwPower, 100) * 1.1) * Math.max(0.8, viewport.scaleY);
    const vx = Math.sin((angle * Math.PI) / 180) * speed * 0.55 * 0.045;
    const vy = speed;
    throwBallFromVelocity(vx, vy);
  };

  const throwBallFromGesture = (velocityX: number, velocityY: number, rect: DOMRect) => {
    const mappedVx = Math.max(-520, Math.min(520, (velocityX / rect.width) * 700)) * 0.045;
    const mappedVy = Math.max(320, Math.min(460, (-velocityY / rect.height) * 900));
    throwBallFromVelocity(mappedVx, mappedVy);
  };

  const throwBallFromVelocity = (vx: number, vy: number) => {
    if (isThrowing || isBallFlying || !gameStarted) return;
    setIsThrowing(true);
    setIsBallFlying(true);
    setBallPhase("flying");
    setPlayState("BALL_IN_PLAY");
    soundManager.playThrow();

    // Check for collision with obstacles during flight
    const checkObstacleCollision = () => {
      return obstacles.some(obs => {
        const obstacleCenterX = obs.position + (obs.type === 'car' ? 10 : 6); // Approximate center
        const ballX = targetHorizontalPosition; // Use landing position, not starting position
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
      
      // Clean parabolic arc: starts at y=80, peaks at arcHeight, lands at y=5
      const arcY = 80 + (5 - 80) * progress - Math.sin(progress * Math.PI) * (arcHeight - 42);
      
      // Smooth horizontal movement from start to target
      const currentX = startX + (targetHorizontalPosition - startX) * progress;
      
      setBallPosition({ x: currentX, y: arcY });
      setBallHorizontalPosition(currentX);
      
      if (progress < 1) {
        ballFlightRafRef.current = requestAnimationFrame(animateBallFlight);
      }
    };
    
    ballFlightRafRef.current = requestAnimationFrame(animateBallFlight);
    
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

              // Track challenge progress for bullseye hits (dedicated counter)
              bullseyeHitsRef.current++;
              if (onChallengeProgress) {
                onChallengeProgress('bullseye_5', bullseyeHitsRef.current);
              }
            }
            
            const newScore = score + pointsEarned;
            setScore(newScore);

            // Progress level every 100 points — increases difficulty within the game
            const newLevel = Math.floor(newScore / 100) + 1;
            if (newLevel > level) {
              setLevel(newLevel);
              toast.success(`Level ${newLevel}!`, { description: "The challenge intensifies!" });
            }

            // Track achievement progress for high score
            if (onAchievementProgress) {
              onAchievementProgress('first_1000', newScore);
            }
            
            // Track challenge progress for score
            if (onChallengeProgress) {
              onChallengeProgress('score_500', newScore);
            }
            
            // Trigger win effect when player first hits 100 points
            if (newScore >= 100 && !gameWon) {
              setGameWon(true);
              soundManager.playMilestone();
              toast.success("🏆 Win Effect Unlocked!", {
                description: "You hit 100 points! Keep going for a high score!",
              });
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
    ballPhysicsRef.current = {
      x: ballHorizontalPosition,
      y: 30,
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
    setCoinsEarned(0);
    setConsecutiveHits(0);
    bullseyeHitsRef.current = 0;
    setBallHorizontalPosition(50);
    setCurbCoins([]);
    setGameEnded(false);
    setGameWon(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 30 });
    setGameStarted(false);
    setTimeRemaining(TIME_LIMIT);
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
        className="relative h-full w-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* HUD - Mobile Responsive */}
        <div className="absolute left-2 sm:left-4 right-2 sm:right-4 z-20 flex flex-col sm:flex-row justify-between items-start gap-2" style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}>
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
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold whitespace-nowrap"><span className="sm:hidden">LIVES</span><span className="hidden sm:inline">LIVES/ATTEMPTS</span></div>
                  <div className="text-lg sm:text-3xl font-bold text-orange-400">{attempts}</div>
                </div>
              </div>
            </Card>
            
            <div>
              <CoinDisplay coins={coins} />
            </div>
          </div>
        </div>

        {/* Street — absolute at bottom so backdrop fills screen above */}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${
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
                className="absolute transition-all"
                style={{ left: `${obs.position}%`, bottom: '12%' }}
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

            {/* Aiming guide — easy/medium only, before throw */}
            {ballPhase === 'ready' && gameStarted && difficulty !== 'hard' && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-70 animate-pulse"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#facc15" />
                  </marker>
                </defs>
                <line
                  x1={ballHorizontalPosition}
                  y1={100 - ballPosition.y}
                  x2={bullseyeTarget.position}
                  y2="10"
                  stroke="#facc15"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            )}

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
                width: `${Math.max(44, 80 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
                height: `${Math.max(44, 80 * Math.min(viewport.scaleX, viewport.scaleY))}px`,
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
        <div className="absolute left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-20 flex flex-col items-center gap-2 sm:gap-4" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          
          {/* Movement controls */}
          {ballPhase === 'ready' && (
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="default"
                onClick={moveLeft}
                disabled={isThrowing || isBallFlying}
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
                disabled={isThrowing || isBallFlying}
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
            disabled={isThrowing || isBallFlying}
            className="text-base sm:text-lg font-bold px-6 sm:px-8 py-4 sm:py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl animate-pulse-glow select-none w-full sm:w-auto"
          >
            {isBallFlying ? "THROWING..." : isCharging ? "RELEASE!" : "HOLD TO CHARGE"}
          </Button>
        {/* Controls overlay — sits on top of the street at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-2 pt-1 px-2 flex flex-col items-center gap-1 bg-black/25 backdrop-blur-sm">
          {/* Throw button + utility buttons row */}
          <div className="flex items-center gap-2 w-full justify-center">
            <SoundToggle className="flex-none z-20" />

            <Button
              size="lg"
              onPointerDown={(e) => { e.stopPropagation(); startCharging(); }}
              onPointerUp={(e) => { e.stopPropagation(); releaseThrow(); }}
              onPointerLeave={() => { if (isCharging) releaseThrow(); }}
              disabled={isThrowing || isBallFlying}
              className="text-base sm:text-lg font-bold px-6 sm:px-8 py-4 sm:py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl animate-pulse-glow select-none flex-1 sm:flex-none"
            >
              {isBallFlying ? "THROWING..." : isCharging ? "RELEASE!" : "HOLD TO CHARGE"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={restartGame}
              className="flex-none border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground px-2 sm:px-3 py-1 text-[10px] sm:text-xs w-16 sm:w-20"
            >
              RESTART
            </Button>
          </div>

          {/* Charge + utility row */}
          <div className="flex items-center gap-2 w-full justify-center">
            <SoundToggle className="flex-none" />
            <Button
              variant="outline"
              size="sm"
              onClick={restartGame}
              aria-label="Restart game"
              className="flex-none border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs min-w-[44px] min-h-[44px] px-3"
            >
              Restart
            </Button>
          </div>

          {ballPhase === 'ready' && (
            <div className="text-xs text-foreground/60 font-semibold flex items-center gap-3">
              <span>Streak: {consecutiveHits}</span>
              <span>• {Math.round(ballHorizontalPosition)}%</span>
              <span>•</span>
              <span>{Math.round(ballHorizontalPosition)}%</span>
            </div>
          )}
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
