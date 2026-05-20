import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target, Zap, Flame, ShoppingBag, Coins, Sparkles,
  BarChart3, Circle, Trophy, RefreshCw, User,
} from "lucide-react";
import { useEffect, useState, KeyboardEvent } from "react";
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

const DIFFICULTIES = [
  {
    id: "easy" as Difficulty,
    name: "Easy",
    icon: Target,
    description: "Perfect for beginners",
    pips: "●",
    color: "text-green-500",
    bgColor: "bg-green-500/10 hover:bg-green-500/15",
    borderColor: "border-green-500/50 hover:border-green-500",
    glow: "hover:shadow-[0_0_24px_hsl(142_76%_36%/0.45)]",
    details: ["Higher success rate", "Slower obstacles", "More time to aim"],
  },
  {
    id: "medium" as Difficulty,
    name: "Medium",
    icon: Zap,
    description: "A balanced challenge",
    pips: "●●",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 hover:bg-yellow-500/15",
    borderColor: "border-yellow-500/50 hover:border-yellow-500",
    glow: "hover:shadow-[0_0_24px_hsl(45_100%_54%/0.45)]",
    details: ["Moderate success rate", "Normal obstacles", "Standard gameplay"],
  },
  {
    id: "hard" as Difficulty,
    name: "Hard",
    icon: Flame,
    description: "For expert players",
    pips: "●●●",
    color: "text-red-500",
    bgColor: "bg-red-500/10 hover:bg-red-500/15",
    borderColor: "border-red-500/50 hover:border-red-500",
    glow: "hover:shadow-[0_0_24px_hsl(0_84%_60%/0.45)]",
    details: ["Lower success rate", "Fast obstacles", "Maximum challenge"],
  },
];

// Shared CTA classes — extracted so every shop button enforces 44px tap target,
// active press feedback, and reduced-motion safety in one place.
const ctaBase =
  "min-h-11 gap-1 sm:gap-2 text-white font-bold text-xs sm:text-lg px-2 sm:px-8 py-3 sm:py-6 rounded-lg sm:rounded-xl shadow-2xl active:scale-95 motion-safe:transform motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-105 relative overflow-hidden group flex-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const DifficultySelection = ({
  onSelectDifficulty,
  onOpenShop,
  onOpenBallShop,
  onOpenAchievements,
  onOpenDailyChallenges,
  onOpenRestorePurchases,
}: DifficultySelectionProps) => {
  const navigate = useNavigate();
  const [totalCoins, setTotalCoins] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) setProfileName(profile.firstName);
  }, [showProfile]);

  useEffect(() => {
    const coinsEasy = parseInt(localStorage.getItem("game-coins-easy") || "0");
    const coinsMedium = parseInt(localStorage.getItem("game-coins-medium") || "0");
    const coinsHard = parseInt(localStorage.getItem("game-coins-hard") || "0");
    setTotalCoins(coinsEasy + coinsMedium + coinsHard);
  }, []);

  const handleCardKey = (e: KeyboardEvent<HTMLDivElement>, id: Difficulty) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectDifficulty(id);
    }
  };

  return (
    <main className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-2 sm:p-4 overflow-auto motion-safe:animate-fade-in">
      <div className="max-w-4xl w-full py-2 sm:py-4">
        <div className="text-center mb-4 sm:mb-8">
          {/* Top utility nav */}
          <nav
            aria-label="Player utilities"
            className="flex justify-center sm:justify-end gap-1 sm:gap-2 mb-3 sm:mb-4 flex-wrap"
          >
            <Button
              onClick={() => setShowProfile(true)}
              variant="outline"
              size="sm"
              aria-label={profileName ? `Open profile for ${profileName}` : "Open profile"}
              className="min-h-11 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 active:scale-95 motion-safe:transition-transform"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xs:inline">{profileName || "Profile"}</span>
            </Button>
            <Button
              onClick={() => setShowLeaderboard(true)}
              variant="outline"
              size="sm"
              aria-label="Open leaderboard"
              className="min-h-11 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 active:scale-95 motion-safe:transition-transform"
            >
              <Trophy className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xs:inline">Leaderboard</span>
            </Button>
            <Button
              onClick={() => navigate("/stats")}
              variant="outline"
              size="sm"
              aria-label="Open stats page"
              className="min-h-11 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 active:scale-95 motion-safe:transition-transform"
            >
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xs:inline">Stats</span>
            </Button>
          </nav>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-3 text-foreground tracking-tight">
            Select Difficulty
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg mb-3 sm:mb-6">
            Choose your challenge level
          </p>

          {/* Shop / progression cluster */}
          {(onOpenShop || onOpenBallShop) && (
            <div className="flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {/* Coin balance */}
              <div
                aria-label={`Coin balance: ${totalCoins} coins`}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/40 backdrop-blur-sm motion-safe:animate-pulse"
              >
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" aria-hidden="true" />
                <span className="font-black tabular-nums text-sm sm:text-lg text-foreground">
                  {totalCoins.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">coins</span>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 w-full max-w-2xl">
                {onOpenShop && (
                  <Button
                    onClick={onOpenShop}
                    aria-label="Open backdrop shop"
                    className={`${ctaBase} bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-pink-400/20 to-purple-400/20 motion-safe:animate-shimmer" aria-hidden="true" />
                    <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
                    <span className="relative z-10 hidden sm:inline">Backdrop Shop</span>
                    <span className="relative z-10 sm:hidden">Backdrops</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 motion-safe:animate-spin hidden sm:block" aria-hidden="true" />
                  </Button>
                )}

                {onOpenBallShop && (
                  <Button
                    onClick={onOpenBallShop}
                    aria-label="Open ball skins shop"
                    className={`${ctaBase} bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-teal-400/20 motion-safe:animate-shimmer" aria-hidden="true" />
                    <Circle className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
                    <span className="relative z-10 hidden sm:inline">Ball Skins</span>
                    <span className="relative z-10 sm:hidden">Balls</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 motion-safe:animate-spin hidden sm:block" aria-hidden="true" />
                  </Button>
                )}

                {onOpenAchievements && (
                  <Button
                    onClick={onOpenAchievements}
                    aria-label="Open achievements"
                    className={`${ctaBase} bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 hover:from-amber-700 hover:via-yellow-700 hover:to-orange-700`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-orange-400/20 motion-safe:animate-shimmer" aria-hidden="true" />
                    <Trophy className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
                    <span className="relative z-10 hidden sm:inline">Achievements</span>
                    <span className="relative z-10 sm:hidden">Awards</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 motion-safe:animate-spin hidden sm:block" aria-hidden="true" />
                  </Button>
                )}

                {onOpenDailyChallenges && (
                  <Button
                    onClick={onOpenDailyChallenges}
                    aria-label="Open daily challenges"
                    className={`${ctaBase} bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/20 to-teal-400/20 motion-safe:animate-shimmer" aria-hidden="true" />
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
                    <span className="relative z-10 hidden sm:inline">Daily Challenges</span>
                    <span className="relative z-10 sm:hidden">Daily</span>
                    <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 relative z-10 motion-safe:animate-spin hidden sm:block" aria-hidden="true" />
                  </Button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground">
                Unlock rewards and track progress!
              </p>

              {onOpenRestorePurchases && (
                <Button
                  onClick={onOpenRestorePurchases}
                  variant="outline"
                  size="sm"
                  aria-label="Restore previous purchases"
                  className="min-h-11 gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Restore Purchases
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Difficulty cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((diff) => {
            const Icon = diff.icon;
            return (
              <Card
                key={diff.id}
                role="button"
                tabIndex={0}
                aria-label={`${diff.name} difficulty — ${diff.description}`}
                onClick={() => onSelectDifficulty(diff.id)}
                onKeyDown={(e) => handleCardKey(e, diff.id)}
                className={`group p-2 sm:p-6 cursor-pointer border-2 ${diff.borderColor} ${diff.bgColor} ${diff.glow} motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
              >
                <div className="flex flex-col items-center text-center space-y-1 sm:space-y-4">
                  <div className={`p-2 sm:p-4 rounded-full bg-background/60 ${diff.color} motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-[8deg] motion-safe:group-hover:scale-110`}>
                    <Icon size={24} className="sm:hidden" aria-hidden="true" />
                    <Icon size={48} className="hidden sm:block" aria-hidden="true" />
                  </div>

                  <div>
                    <h2 className={`text-base sm:text-2xl font-black mb-0.5 sm:mb-1 ${diff.color} tracking-tight`}>
                      {diff.name}
                    </h2>
                    {/* Color-blind safe redundancy: pip count + label */}
                    <div
                      className={`text-[10px] sm:text-xs font-bold tracking-[0.3em] ${diff.color}`}
                      aria-label={`Difficulty level ${diff.pips.length} of 3`}
                    >
                      {diff.pips}
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2 mb-1 sm:mb-4 hidden sm:block">
                      {diff.description}
                    </p>
                  </div>

                  <ul className="space-y-1 sm:space-y-2 w-full hidden sm:block">
                    {diff.details.map((detail) => (
                      <li
                        key={detail}
                        className="text-xs text-muted-foreground flex items-center justify-center"
                      >
                        <span className={`mr-2 ${diff.color}`} aria-hidden="true">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>

                  <Button
                    tabIndex={-1 /* card itself is focusable */}
                    className="w-full mt-1 sm:mt-4 min-h-11 text-xs sm:text-sm py-1 sm:py-2"
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

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-8 pt-2 sm:pt-4 border-t border-border/30 flex justify-center gap-2 sm:gap-4">
          <a href="/privacy" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground underline transition-colors">
            Privacy
          </a>
          <span className="text-[10px] sm:text-xs text-muted-foreground" aria-hidden="true">•</span>
          <a href="/terms" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground underline transition-colors">
            Terms
          </a>
        </div>
      </div>

      {showLeaderboard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Leaderboard"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 motion-safe:animate-fade-in"
        >
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close leaderboard"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-background min-h-11 min-w-11"
              onClick={() => setShowLeaderboard(false)}
            >
              ✕
            </Button>
            <LocalLeaderboard showTabs={true} />
          </div>
        </div>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </main>
  );
};
