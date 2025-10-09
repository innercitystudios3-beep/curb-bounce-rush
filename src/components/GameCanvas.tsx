import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfettiEffect } from "./ConfettiEffect";
import { ThrowMeter } from "./ThrowMeter";
import { toast } from "sonner";

interface Obstacle {
  id: number;
  type: "car" | "bike";
  position: number;
  speed: number;
}

export const GameCanvas = () => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isThowing, setIsThrowing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 80 });
  const [isBallFlying, setIsBallFlying] = useState(false);
  const obstacleIdRef = useRef(0);
  const chargeIntervalRef = useRef<number | null>(null);

  const targetScore = 100;
  const baseSuccessChance = 45;
  const successChanceDecrease = 5;
  
  const currentSuccessChance = Math.max(30, baseSuccessChance - (level - 1) * successChanceDecrease);

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
    if (!isCharging) return;
    
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    
    throwBall(power);
  };

  const throwBall = (throwPower: number) => {
    if (isThowing || isBallFlying) return;

    setIsThrowing(true);
    setIsBallFlying(true);

    // Animate ball
    const success = calculateSuccess(throwPower);
    
    setTimeout(() => {
      if (success) {
        const newScore = score + 10;
        setScore(newScore);
        setShowConfetti(true);
        toast.success(`+10 Points! Great throw!`, {
          description: `Score: ${newScore}/${targetScore}`,
        });

        if (newScore >= targetScore) {
          setGameWon(true);
          toast.success("🎉 You Win! Champion!");
        } else if (newScore % 30 === 0) {
          setLevel((prev) => prev + 1);
          toast.info(`Level ${level + 1}! Difficulty increased!`);
        }

        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        toast.error("Miss! Ball didn't bounce back", {
          description: "Try adjusting your power",
        });
      }

      setIsBallFlying(false);
      setBallPosition({ x: 50, y: 80 });
      setIsThrowing(false);
      setPower(0);
    }, 1500);
  };

  const restartGame = () => {
    setScore(0);
    setLevel(1);
    setGameWon(false);
    setObstacles([]);
    setBallPosition({ x: 50, y: 80 });
    toast.info("Game restarted! Good luck!");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Sky background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary to-primary" />
      
      {/* Rain effect */}
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

      {/* Game area */}
      <div className="relative h-full flex flex-col">
        {/* HUD */}
        <Card className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-card/90 backdrop-blur-sm border-2 border-primary">
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
          </div>
        </Card>

        {/* Street and curb */}
        <div className="flex-1 flex items-end">
          <div className="w-full h-64 relative" style={{ background: "hsl(var(--game-street))" }}>
            {/* Curb */}
            <div
              className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-400 to-gray-600"
              style={{ boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}
            />
            
            {/* Street lines */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-yellow-400 opacity-80" />

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
              className={`absolute w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl transition-all duration-200 ${
                isBallFlying ? "animate-ball-throw" : ""
              }`}
              style={{
                left: `${ballPosition.x}%`,
                bottom: `${ballPosition.y}%`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset -5px -5px 10px rgba(0,0,0,0.3)",
              }}
            >
              <div className="w-full h-full rounded-full border-4 border-orange-900/30" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
          <ThrowMeter value={power} isCharging={isCharging} disabled={isThowing || isBallFlying} />
          
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

          <div className="text-sm text-foreground/70 font-semibold">
            Success Rate: {currentSuccessChance}% (Sweet spot: 60-80 power)
          </div>
        </div>

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
