import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap, Flame, ShoppingBag, Coins, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { fbInstant } from "@/lib/fbInstantManager";

export type Difficulty = "easy" | "medium" | "hard";

interface DifficultySelectionProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onOpenShop?: () => void;
}

export const DifficultySelection = ({ onSelectDifficulty, onOpenShop }: DifficultySelectionProps) => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
            Select Difficulty
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Choose your challenge level
          </p>
          
          {/* Prominent Shop Button */}
          {onOpenShop && (
            <div className="flex flex-col items-center gap-3 mb-4">
              {/* Coin Balance Display */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/40 backdrop-blur-sm">
                <Coins className="w-5 h-5 text-yellow-500 animate-pulse" />
                <span className="font-bold text-lg text-foreground">{totalCoins.toLocaleString()} Coins</span>
              </div>

              {/* Shop Button with Animation */}
              <Button
                onClick={onOpenShop}
                size="lg"
                className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 animate-pulse relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-pink-400/20 to-purple-400/20 animate-shimmer" />
                <ShoppingBag className="w-6 h-6 relative z-10" />
                <span className="relative z-10">Backdrop Shop</span>
                <Sparkles className="w-5 h-5 relative z-10 animate-spin" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                  NEW
                </span>
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Unlock exclusive backgrounds with coins or cash!
              </p>
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
      </div>
    </div>
  );
};
