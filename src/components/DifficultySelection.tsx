import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap, Flame, ShoppingBag, Coins, Sparkles, BarChart3, Circle, Trophy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { fbInstant } from "@/lib/fbInstantManager";
import { useNavigate } from "react-router-dom";
import { ShareButton } from "./ShareButton";
import { RewardedAdButton } from "./RewardedAdButton";

const isFBInstantEnabled = import.meta.env.VITE_FB_INSTANT === 'true';

export type Difficulty = "easy" | "medium" | "hard";

interface DifficultySelectionProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onOpenShop?: () => void;
  onOpenBallShop?: () => void;
  onOpenAchievements?: () => void;
  onOpenDailyChallenges?: () => void;
  onOpenRestorePurchases?: () => void;
}

export const DifficultySelection = ({ onSelectDifficulty, onOpenShop, onOpenBallShop, onOpenAchievements, onOpenDailyChallenges, onOpenRestorePurchases }: DifficultySelectionProps) => {
  const navigate = useNavigate();
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    const loadCoins = async () => {
      if (fbInstant.isFBInstant()) {
        const data = await fbInstant.getPlayerDataAsync(['coins_easy', 'coins_medium', 'coins_hard']);
        const total = (data.coins_easy || 0) + (data.coins_medium || 0) + (data.coins_hard || 0);
        setTotalCoins(total);
      } else {
        const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0');
        const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0');
        const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0');
        setTotalCoins(coinsEasy + coinsMedium + coinsHard);
      }
    };
    loadCoins();
  }, []);

  const difficulties = [
    {
      id: "easy" as Difficulty,
      name: "Easy",
      icon: Target,
      description: "Perfect for beginners",
      color: "text-green-500",
      bgColor: "bg-green-500/10 hover:bg-green-500/20",
      borderColor: "border-green-500/50",
      details: ["Higher success rate", "Slower obstacles", "More time to aim"]
    },
    {
      id: "medium" as Difficulty,
      name: "Medium",
      icon: Zap,
      description: "A balanced challenge",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10 hover:bg-yellow-500/20",
      borderColor: "border-yellow-500/50",
      details: ["Moderate success rate", "Normal obstacles", "Standard gameplay"]
    },
    {
      id: "hard" as Difficulty,
      name: "Hard",
      icon: Flame,
      description: "For expert players",
      color: "text-red-500",
      bgColor: "bg-red-500/10 hover:bg-red-500/20",
      borderColor: "border-red-500/50",
      details: ["Lower success rate", "Fast obstacles", "Maximum challenge"]
    }
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          {/* Stats Button */}
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => navigate('/stats')}
              variant="outline"
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View Stats
            </Button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
            Select Difficulty
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Choose your challenge level
          </p>
          
          {/* Prominent Shop Buttons */}
          {(onOpenShop || onOpenBallShop) && (
            <div className="flex flex-col items-center gap-3 mb-4">
              {/* Coin Balance Display */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/40 backdrop-blur-sm">
                <Coins className="w-5 h-5 text-yellow-500 animate-pulse" />
                <span className="font-bold text-lg text-foreground">{totalCoins.toLocaleString()} Coins</span>
              </div>

              {/* Shop Buttons Container */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
                {/* Backdrop Shop Button */}
                {onOpenShop && (
                  <Button
                    onClick={onOpenShop}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-pink-400/20 to-purple-400/20 animate-shimmer" />
                    <ShoppingBag className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Backdrop Shop</span>
                    <Sparkles className="w-5 h-5 relative z-10 animate-spin" />
                  </Button>
                )}

                {/* Ball Skins Shop Button */}
                {onOpenBallShop && (
                  <Button
                    onClick={onOpenBallShop}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-teal-400/20 animate-shimmer" />
                    <Circle className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Ball Skins</span>
                    <Sparkles className="w-5 h-5 relative z-10 animate-spin" />
                  </Button>
                )}

                {/* Achievements Button */}
                {onOpenAchievements && (
                  <Button
                    onClick={onOpenAchievements}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 hover:from-amber-700 hover:via-yellow-700 hover:to-orange-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-orange-400/20 animate-shimmer" />
                    <Trophy className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Achievements</span>
                    <Sparkles className="w-5 h-5 relative z-10 animate-spin" />
                  </Button>
                )}

                {/* Daily Challenges Button */}
                {onOpenDailyChallenges && (
                  <Button
                    onClick={onOpenDailyChallenges}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-teal-400/20 animate-shimmer" />
                    <Target className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">Daily Challenges</span>
                    <Sparkles className="w-5 h-5 relative z-10 animate-spin" />
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                Unlock exclusive rewards and track your progress!
              </p>

              {/* Restore Purchases Button */}
              {onOpenRestorePurchases && (
                <Button
                  onClick={onOpenRestorePurchases}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restore Purchases
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <Card
                key={diff.id}
                className={`p-6 cursor-pointer transition-all duration-300 border-2 ${diff.borderColor} ${diff.bgColor}`}
                onClick={() => onSelectDifficulty(diff.id)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`p-4 rounded-full bg-background/50 ${diff.color}`}>
                    <Icon size={48} />
                  </div>
                  
                  <div>
                    <h2 className={`text-2xl font-bold mb-1 ${diff.color}`}>
                      {diff.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {diff.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-2 w-full">
                    {diff.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground flex items-center justify-center"
                      >
                        <span className={`mr-2 ${diff.color}`}>•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Select {diff.name}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer with Privacy Policy */}
        <div className="text-center mt-8 pt-4 border-t border-border/30">
          <a
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};
