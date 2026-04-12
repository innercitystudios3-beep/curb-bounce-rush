import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap, Flame, ShoppingBag, Coins, Sparkles, BarChart3, Circle, Trophy, RefreshCw, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocalLeaderboard } from "./LocalLeaderboard";
import { ProfileModal, getProfile } from "./ProfileModal";

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setProfileName(profile.firstName);
    }
  }, [showProfile]);

  useEffect(() => {
    const loadCoins = () => {
      const coinsEasy = parseInt(localStorage.getItem('game-coins-easy') || '0');
      const coinsMedium = parseInt(localStorage.getItem('game-coins-medium') || '0');
      const coinsHard = parseInt(localStorage.getItem('game-coins-hard') || '0');
      const coinsBonus = parseInt(localStorage.getItem('game-coins-bonus') || '0');
      const coinsSpent = parseInt(localStorage.getItem('game-coins-spent') || '0');
      setTotalCoins(Math.max(0, coinsEasy + coinsMedium + coinsHard + coinsBonus - coinsSpent));
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-2 sm:p-4 overflow-auto">
      <div className="max-w-4xl w-full py-2 sm:py-4">
        <div className="text-center mb-4 sm:mb-8">
          {/* Stats, Leaderboard & Profile Buttons */}
          <div className="flex justify-center sm:justify-end gap-1 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
            <Button
              onClick={() => setShowProfile(true)}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{profileName || "Profile"}</span>
            </Button>
            <Button
              onClick={() => setShowLeaderboard(true)}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Leaderboard</span>
            </Button>
            <Button
              onClick={() => navigate('/stats')}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Stats</span>
            </Button>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 text-foreground">
            Select Difficulty
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg mb-3 sm:mb-6">
            Choose your challenge level
          </p>
          
          {/* Prominent Shop Buttons */}
          {(onOpenShop || onOpenBallShop) && (
            <div className="flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {/* Coin Balance Display */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/40 backdrop-blur-sm">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 animate-pulse" />
                <span className="font-bold text-sm sm:text-lg text-foreground">{totalCoins.toLocaleString()} Coins</span>
              </div>

              {/* Shop Buttons Container - 2x2 grid on mobile */}
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 w-full max-w-2xl">
                {/* Backdrop Shop Button */}
                {onOpenShop && (
                  <Button
                    onClick={onOpenShop}
                    size="default"
                    className="gap-1 sm:gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-xs sm:text-lg px-2 sm:px-8 py-3 sm:py-6 rounded-lg sm:rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-pink-400/20 to-purple-400/20 animate-shimmer" />
                    <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">Backdrop Shop</span>
                    <span className="relative z-10 sm:hidden">Backdrops</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 animate-spin hidden sm:block" />
                  </Button>
                )}

                {/* Ball Skins Shop Button */}
                {onOpenBallShop && (
                  <Button
                    onClick={onOpenBallShop}
                    size="default"
                    className="gap-1 sm:gap-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 text-white font-bold text-xs sm:text-lg px-2 sm:px-8 py-3 sm:py-6 rounded-lg sm:rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-teal-400/20 animate-shimmer" />
                    <Circle className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">Ball Skins</span>
                    <span className="relative z-10 sm:hidden">Balls</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 animate-spin hidden sm:block" />
                  </Button>
                )}

                {/* Achievements Button */}
                {onOpenAchievements && (
                  <Button
                    onClick={onOpenAchievements}
                    size="default"
                    className="gap-1 sm:gap-2 bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 hover:from-amber-700 hover:via-yellow-700 hover:to-orange-700 text-white font-bold text-xs sm:text-lg px-2 sm:px-8 py-3 sm:py-6 rounded-lg sm:rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-orange-400/20 animate-shimmer" />
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">Achievements</span>
                    <span className="relative z-10 sm:hidden">Awards</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 animate-spin hidden sm:block" />
                  </Button>
                )}

                {/* Daily Challenges Button */}
                {onOpenDailyChallenges && (
                  <Button
                    onClick={onOpenDailyChallenges}
                    size="default"
                    className="gap-1 sm:gap-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-lg px-2 sm:px-8 py-3 sm:py-6 rounded-lg sm:rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative overflow-hidden group flex-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-teal-400/20 animate-shimmer" />
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">Daily Challenges</span>
                    <span className="relative z-10 sm:hidden">Daily</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 animate-spin hidden sm:block" />
                  </Button>
                )}
              </div>
              
              <p className="text-xs sm:text-sm text-muted-foreground">
                Unlock rewards and track progress!
              </p>

              {/* Restore Purchases Button */}
              {onOpenRestorePurchases && (
                <Button
                  onClick={onOpenRestorePurchases}
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Restore Purchases
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <Card
                key={diff.id}
                className={`p-2 sm:p-6 cursor-pointer transition-all duration-300 border-2 ${diff.borderColor} ${diff.bgColor}`}
                onClick={() => onSelectDifficulty(diff.id)}
              >
                <div className="flex flex-col items-center text-center space-y-1 sm:space-y-4">
                  <div className={`p-2 sm:p-4 rounded-full bg-background/50 ${diff.color}`}>
                    <Icon size={24} className="sm:hidden" />
                    <Icon size={48} className="hidden sm:block" />
                  </div>
                  
                  <div>
                    <h2 className={`text-base sm:text-2xl font-bold mb-0.5 sm:mb-1 ${diff.color}`}>
                      {diff.name}
                    </h2>
                    <p className="text-[10px] sm:text-sm text-muted-foreground mb-1 sm:mb-4 hidden sm:block">
                      {diff.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-1 sm:space-y-2 w-full hidden sm:block">
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
                    className="w-full mt-1 sm:mt-4 text-xs sm:text-sm py-1 sm:py-2"
                    variant="outline"
                    size="sm"
                  >
                    <span className="hidden sm:inline">Select {diff.name}</span>
                    <span className="sm:hidden">Play</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer with Legal Links */}
        <div className="text-center mt-4 sm:mt-8 pt-2 sm:pt-4 border-t border-border/30 flex justify-center gap-2 sm:gap-4">
          <a
            href="/privacy"
            className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Privacy
          </a>
          <span className="text-[10px] sm:text-xs text-muted-foreground">•</span>
          <a
            href="/terms"
            className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Terms
          </a>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-background"
              onClick={() => setShowLeaderboard(false)}
            >
              ✕
            </Button>
            <LocalLeaderboard showTabs={true} />
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};
