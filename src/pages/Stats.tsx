import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Coins, Target, Timer, Award, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { soundManager } from "@/lib/soundManager";
import { toast } from "sonner";

interface DifficultyStats {
  coins: number;
  highScore: number;
  gamesPlayed: number;
}

interface AllStats {
  easy: DifficultyStats;
  medium: DifficultyStats;
  hard: DifficultyStats;
}

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AllStats>({
    easy: { coins: 0, highScore: 0, gamesPlayed: 0 },
    medium: { coins: 0, highScore: 0, gamesPlayed: 0 },
    hard: { coins: 0, highScore: 0, gamesPlayed: 0 },
  });
  const [playerName, setPlayerName] = useState("Player");
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllStats();
    loadUnlockedAchievements();
  }, []);

  const loadAllStats = () => {
    setIsLoading(true);
    
    // Load from localStorage
    setStats({
      easy: {
        coins: parseInt(localStorage.getItem('game-coins-easy') || '0'),
        highScore: parseInt(localStorage.getItem('game-highScore-easy') || '0'),
        gamesPlayed: parseInt(localStorage.getItem('game-gamesplayed-easy') || '0'),
      },
      medium: {
        coins: parseInt(localStorage.getItem('game-coins-medium') || '0'),
        highScore: parseInt(localStorage.getItem('game-highScore-medium') || '0'),
        gamesPlayed: parseInt(localStorage.getItem('game-gamesplayed-medium') || '0'),
      },
      hard: {
        coins: parseInt(localStorage.getItem('game-coins-hard') || '0'),
        highScore: parseInt(localStorage.getItem('game-highScore-hard') || '0'),
        gamesPlayed: parseInt(localStorage.getItem('game-gamesplayed-hard') || '0'),
      },
    });
    
    setIsLoading(false);
  };

  const getTotalCoins = () => {
    return stats.easy.coins + stats.medium.coins + stats.hard.coins;
  };

  const getTotalGamesPlayed = () => {
    return stats.easy.gamesPlayed + stats.medium.gamesPlayed + stats.hard.gamesPlayed;
  };

  const getOverallHighScore = () => {
    return Math.max(stats.easy.highScore, stats.medium.highScore, stats.hard.highScore);
  };

  const getDifficultyBadge = (difficulty: 'easy' | 'medium' | 'hard') => {
    const colors = {
      easy: 'bg-green-500/20 text-green-400 border-green-500/50',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      hard: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return colors[difficulty];
  };

  const totalGamesPlayed = getTotalGamesPlayed();
  const totalCoins = getTotalCoins();
  const overallHighScore = getOverallHighScore();

  const achievements = useMemo(() => [
    { id: 'games_10', name: 'Getting Started', description: 'Play 10 games', icon: Target, threshold: 10, current: totalGamesPlayed, type: 'games' },
    { id: 'games_25', name: 'Dedicated Player', description: 'Play 25 games', icon: Target, threshold: 25, current: totalGamesPlayed, type: 'games' },
    { id: 'games_50', name: 'Enthusiast', description: 'Play 50 games', icon: Target, threshold: 50, current: totalGamesPlayed, type: 'games' },
    { id: 'games_100', name: 'Century Club', description: 'Play 100 games', icon: Trophy, threshold: 100, current: totalGamesPlayed, type: 'games' },
    { id: 'coins_10000', name: 'Coin Collector', description: 'Earn 10,000 coins', icon: Coins, threshold: 10000, current: totalCoins, type: 'coins' },
    { id: 'score_500', name: 'High Scorer', description: 'Score 500 points', icon: Award, threshold: 500, current: overallHighScore, type: 'score' },
    { id: 'score_1000', name: 'Master Player', description: 'Score 1,000 points', icon: Trophy, threshold: 1000, current: overallHighScore, type: 'score' },
  ], [totalGamesPlayed, totalCoins, overallHighScore]);

  const isAchievementUnlocked = (achievement: { current: number; threshold: number }) => {
    return achievement.current >= achievement.threshold;
  };

  const loadUnlockedAchievements = () => {
    const stored = localStorage.getItem('unlockedAchievements');
    if (stored) {
      setUnlockedAchievements(new Set(JSON.parse(stored)));
    }
  };

  const checkNewAchievements = useCallback(() => {
    achievements.forEach((achievement) => {
      const isUnlocked = achievement.current >= achievement.threshold;
      const wasUnlocked = unlockedAchievements.has(achievement.id);

      if (isUnlocked && !wasUnlocked) {
        // New achievement unlocked — update state via functional form to avoid stale closure
        setUnlockedAchievements(prev => {
          const newUnlocked = new Set(prev);
          newUnlocked.add(achievement.id);
          localStorage.setItem('unlockedAchievements', JSON.stringify([...newUnlocked]));
          return newUnlocked;
        });
        soundManager.playAchievement();
        setShowConfetti(true);

        toast.success(`🏆 Achievement Unlocked!`, {
          description: achievement.name,
        });

        setTimeout(() => setShowConfetti(false), 4000);
      }
    });
  }, [achievements, unlockedAchievements]);

  // Check for new achievements when stats load
  useEffect(() => {
    if (!isLoading) {
      checkNewAchievements();
    }
  }, [stats, isLoading, checkNewAchievements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50">
          <p className="text-foreground">Loading stats...</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      {showConfetti && <ConfettiEffect />}
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Game
          </Button>
        </div>

        {/* Player Info */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{playerName}'s Stats</h1>
              <p className="text-muted-foreground">Your complete game statistics</p>
            </div>
          </div>
        </Card>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-foreground">Total Coins</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">{getTotalCoins().toLocaleString()}</p>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Games Played</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">{getTotalGamesPlayed()}</p>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground">Best Score</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">{getOverallHighScore()}</p>
          </Card>
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => {
              const unlocked = isAchievementUnlocked(achievement);
              const Icon = achievement.icon;
              return (
                <Card 
                  key={achievement.id} 
                  className={`p-6 bg-card/80 backdrop-blur-sm border-border/50 transition-all ${
                    unlocked ? 'border-primary/50' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      unlocked ? 'bg-primary/20' : 'bg-muted/20'
                    }`}>
                      {unlocked ? (
                        <Icon className="w-6 h-6 text-primary" />
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{achievement.name}</h3>
                        {unlocked && (
                          <Badge variant="default" className="text-xs">Unlocked</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (achievement.current / achievement.threshold) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {achievement.current.toLocaleString()} / {achievement.threshold.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Per-Difficulty Stats */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Stats by Difficulty</h2>
          
          {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
            <Card key={difficulty} className="p-6 bg-card/80 backdrop-blur-sm border-border/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border uppercase ${getDifficultyBadge(difficulty)}`}>
                    {difficulty}
                  </span>
                  <h3 className="text-xl font-bold text-foreground capitalize">{difficulty} Mode</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coins Earned</p>
                    <p className="text-2xl font-bold text-foreground">{stats[difficulty].coins.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">High Score</p>
                    <p className="text-2xl font-bold text-foreground">{stats[difficulty].highScore}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Games Played</p>
                    <p className="text-2xl font-bold text-foreground">{stats[difficulty].gamesPlayed}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
      </div>
    </>
  );
}
