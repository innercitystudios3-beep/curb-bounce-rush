import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfettiEffect } from "./ConfettiEffect";
import { ThrowMeter } from "./ThrowMeter";
import { CoinDisplay } from "./CoinDisplay";
import { FloatingCoins } from "./FloatingCoins";
import { CoinParticle } from "./CoinParticle";
import { HoveringCoin } from "./HoveringCoin";
import { toast } from "sonner";
import { soundManager } from "@/lib/soundManager";
import { Volume2, VolumeX } from "lucide-react";

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

export const GameCanvas = () => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('game-coins');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [coinsEarned, setCoinsEarned] = useState(0);
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
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 80 });
  const [ballHorizontalPosition, setBallHorizontalPosition] = useState(50); // 0-100 percentage
  const [isBallFlying, setIsBallFlying] = useState(false);
  const [ballPhase, setBallPhase] = useState<'ready' | 'flying' | 'hit' | 'bouncing' | 'missed'>('ready');
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [gameStarted, setGameStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const obstacleIdRef = useRef(0);
  const curbCoinIdRef = useRef(0);
  const chargeIntervalRef = useRef<number | null>(null);
  const chargeSoundIntervalRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  const targetScore = 100;
  const baseSuccessChance = 45;
  const successChanceDecrease = 5;
  
  const currentSuccessChance = Math.max(30, baseSuccessChance - (level - 1) * successChanceDecrease);

  // Persist coins to localStorage
  useEffect(() => {
    localStorage.setItem('game-coins', coins.toString());
  }, [coins]);

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameWon || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.error("⏰ Time's up! Game Over!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameWon, timeRemaining]);

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
      if (Math.random() > 0.7) {
        const newObstacle: Obstacle = {
          id: obstacleIdRef.current++,
          type: Math.random() > 0.5 ? "car" : "bike",
          position: -10,
          speed: 1 + Math.random() * 2,
        };
        setObstacles((prev) => [...prev, newObstacle]);
      }
    }, 2000);

    return () => clearInterval(spawnInterval);
  }, []);

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
    
    throwBall(power);
  };

  const throwBall = (throwPower: number) => {
    if (isThowing || isBallFlying || !gameStarted) return;

    setIsThrowing(true);
    setIsBallFlying(true);
    const success = calculateSuccess(throwPower);

    // Play throw sound
    soundManager.playThrow();

    // Phase 1: Ball flies to curb (0.8s)
    setBallPhase('flying');
    setBallPosition({ x: ballHorizontalPosition, y: 80 });
    
    setTimeout(() => {
      setBallPosition({ x: ballHorizontalPosition, y: 5 }); // Move to curb at current horizontal position
    }, 50);

    setTimeout(() => {
      // Phase 2: Ball hits curb (0.3s)
      setBallPhase('hit');
      soundManager.playImpact();
      
      // Check for coin collection
      const collectedCoin = curbCoins.find(
        coin => !coin.collected && Math.abs(coin.position - ballHorizontalPosition) < 8
      );
      
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
          setBallPosition({ x: ballHorizontalPosition, y: 80 }); // Bounce back to start position
          soundManager.playSuccess();
          
          setTimeout(() => {
            const newScore = score + 10;
            setScore(newScore);
            
            // Calculate and award coins (including coin bonus)
            const earnedCoins = calculateCoinsEarned(throwPower, true) + coinBonus;
            setCoins(prev => prev + earnedCoins);
            setCoinsEarned(prev => prev + earnedCoins);
            
            // Show floating coins animation
            setFloatingCoinAmount(earnedCoins);
            setShowFloatingCoins(true);
            spawnCoinParticles(earnedCoins);
            
            // Update streak
            setConsecutiveHits(prev => prev + 1);
            
            setShowConfetti(true);
            
            const coinMessage = coinBonus > 0 ? ` +${coinBonus} Bonus Coins!` : '';
            toast.success(`+10 Points! +${earnedCoins} Coins!${coinMessage}`, {
              description: `Score: ${newScore}/${targetScore} | Streak: ${consecutiveHits + 1}`,
            });

            if (newScore >= targetScore) {
              const completionBonus = 20;
              setCoins(prev => prev + completionBonus);
              setGameWon(true);
              setLevel(2); // Advance to level 2 on win
              soundManager.playWin();
              toast.success(`🎉 You Win! +${completionBonus} Bonus Coins!`);
            }

            setTimeout(() => setShowConfetti(false), 3000);
            
            // Reset
            setBallPhase('ready');
            setIsBallFlying(false);
            setIsThrowing(false);
            setPower(0);
          }, 800);
          
        } else {
          // Phase 3: Ball misses and falls (0.6s)
          setBallPhase('missed');
          setBallPosition({ x: ballHorizontalPosition, y: -20 }); // Fall down at current position
          soundManager.playFail();
          
          // Reset streak on miss
          setConsecutiveHits(0);
          
          setTimeout(() => {
            toast.error("Miss! Ball didn't bounce back", {
              description: "Try timing your power better. Streak reset!",
            });
            
            // Reset
            setBallPosition({ x: ballHorizontalPosition, y: 80 });
            setBallPhase('ready');
            setIsBallFlying(false);
            setIsThrowing(false);
            setPower(0);
          }, 600);
        }
      }, 300);
    }, 800);
  };

  const restartGame = () => {
    soundManager.playClick();
    setScore(0);
    setLevel(1);
    setCoinsEarned(0);
    setConsecutiveHits(0);
    setBallHorizontalPosition(50); // Reset to center
    setCurbCoins([]); // Clear all curb coins
    setGameWon(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 80 });
    setGameStarted(false);
    setTimeRemaining(180);
    toast.info("Game restarted! Good luck!");
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
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

      {/* Sky background - changes when game is won */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        gameWon 
          ? 'bg-gradient-to-b from-purple-900 via-pink-600 to-orange-500' 
          : 'bg-gradient-to-b from-secondary to-primary'
      }`} />
      
      {/* Rain effect - only show when not won */}
      {!gameWon && (
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-8 bg-blue-200"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `confetti-fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
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
      <div className="relative h-full flex flex-col">
        {/* HUD */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <Card className="px-6 py-3 bg-card/90 backdrop-blur-sm border-2 border-primary">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-xs text-muted-foreground font-semibold">SCORE</div>
                <div className="text-3xl font-bold text-primary">{score}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground font-semibold">LEVEL</div>
                <div className="text-3xl font-bold text-accent">{level}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground font-semibold">TARGET</div>
                <div className="text-3xl font-bold text-foreground">{targetScore}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground font-semibold">TIME</div>
                <div className={`text-3xl font-bold ${
                  timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'
                }`}>{formatTime(timeRemaining)}</div>
              </div>
            </div>
          </Card>
          
          <CoinDisplay coins={coins} />
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
            </div>
            
            {/* Street lines */}
            <div className={`absolute top-1/2 left-0 right-0 h-1 opacity-80 transition-all duration-1000 ${
              gameWon ? 'bg-purple-400' : 'bg-yellow-400'
            }`} />

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
              className={`absolute w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl ${
                ballPhase === 'flying' ? 'transition-all duration-[800ms] ease-out' :
                ballPhase === 'hit' ? 'scale-90' :
                ballPhase === 'bouncing' ? 'transition-all duration-[800ms] ease-in-out' :
                ballPhase === 'missed' ? 'transition-all duration-[600ms] ease-in opacity-50' :
                'transition-all duration-200'
              }`}
              style={{
                left: `${ballPosition.x}%`,
                bottom: `${ballPosition.y}%`,
                boxShadow: ballPhase === 'hit' 
                  ? "0 0 40px rgba(255, 165, 0, 0.8), 0 10px 30px rgba(0,0,0,0.5)"
                  : "0 10px 30px rgba(0,0,0,0.5), inset -5px -5px 10px rgba(0,0,0,0.3)",
                transform: `translateX(-50%) ${
                  ballPhase === 'flying' ? 'scale(0.8) rotateZ(360deg)' :
                  ballPhase === 'hit' ? 'scale(1.3)' :
                  ballPhase === 'bouncing' ? 'scale(1.1) rotateZ(-360deg)' :
                  ballPhase === 'missed' ? 'scale(0.6) rotateZ(180deg)' :
                  'scale(1)'
                }`,
              }}
            >
              <div className={`w-full h-full rounded-full border-4 border-orange-900/30 ${
                ballPhase === 'hit' ? 'animate-pulse' : ''
              }`} />
            </div>
          </div>
        </div>

        {/* Throw Meter - Top Left */}
        {ballPhase === 'ready' && (
          <div className="absolute top-4 left-4 z-20">
            <ThrowMeter value={power} isCharging={isCharging} disabled={isThowing || isBallFlying} />
          </div>
        )}

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
              Success Rate: {currentSuccessChance}% | Streak: {consecutiveHits}
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
          onClick={restartGame}
          className="absolute top-4 right-4 z-20 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
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
      {gameWon && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-8 text-center space-y-6 animate-bounce-in border-4 border-primary bg-card">
            <div className="text-6xl">🏆</div>
            <h2 className="text-4xl font-bold text-primary">YOU WIN!</h2>
            <p className="text-xl text-foreground">
              Final Score: <span className="font-bold text-accent">{score}</span>
            </p>
            <p className="text-lg text-muted-foreground">
              Completed at Level {level}
            </p>
            <p className="text-xl text-yellow-500 font-bold">
              Session Coins Earned: {coinsEarned}
            </p>
            <p className="text-lg text-yellow-400">
              Total Coins: {coins}
            </p>
            <Button
              size="lg"
              onClick={restartGame}
              className="text-lg font-bold px-8 bg-primary hover:bg-primary/90"
            >
              PLAY AGAIN
            </Button>
          </Card>
          <ConfettiEffect />
        </div>
      )}
    </div>
  );
};
