import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Lock, Check, Coins, DollarSign, Trophy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fbInstant } from "@/lib/fbInstantManager";
import { initiateStripePurchase } from "@/lib/stripePayments";

export interface BallSkin {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  coinPrice: number;
  usdPrice: number;
  achievementRequired?: string; // Achievement ID required to unlock
  achievementName?: string; // Display name of achievement
}

interface BallShopProps {
  onClose: () => void;
  currentCoins: number;
  onPurchaseWithCoins: (ball: BallSkin) => void;
  onPurchaseWithMoney: (ball: BallSkin) => void;
  ownedBalls: string[];
  onSelectBall: (ballId: string) => void;
  currentBall: string;
  unlockedAchievements?: string[];
}

export const BallShop = ({
  onClose,
  currentCoins,
  onPurchaseWithCoins,
  onPurchaseWithMoney,
  ownedBalls,
  onSelectBall,
  currentBall,
  unlockedAchievements = [],
}: BallShopProps) => {
  const { toast } = useToast();
  const [selectedBall, setSelectedBall] = useState<BallSkin | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const ballSkins: BallSkin[] = [
    {
      id: "default",
      name: "Classic Ball",
      description: "Original game ball",
      imageUrl: "/balls/basketball.png",
      coinPrice: 0,
      usdPrice: 0,
    },
    {
      id: "soccer-ball",
      name: "Soccer Ball",
      description: "Score goals on the curb",
      imageUrl: "/balls/soccer-ball.png",
      coinPrice: 3000,
      usdPrice: 0.99,
    },
    {
      id: "dodge-ball",
      name: "Red Dodge Ball",
      description: "Classic playground favorite",
      imageUrl: "/balls/dodge-ball.png",
      coinPrice: 3000,
      usdPrice: 0.99,
    },
    {
      id: "tennis-ball",
      name: "Enlarged Tennis Ball",
      description: "Oversized tennis action",
      imageUrl: "/balls/tennis-ball.png",
      coinPrice: 4000,
      usdPrice: 1.49,
    },
    {
      id: "mystery-ball",
      name: "Mystery Ball",
      description: "Random surprise with every throw!",
      imageUrl: "/balls/mystery-ball.png",
      coinPrice: 10000,
      usdPrice: 2.99,
    },
    // Achievement-only balls
    {
      id: "golden-ball",
      name: "Golden Ball",
      description: "For true champions",
      imageUrl: "/balls/golden-ball.png",
      coinPrice: 0,
      usdPrice: 0,
      achievementRequired: "first_1000",
      achievementName: "Score Master",
    },
    {
      id: "platinum-ball",
      name: "Platinum Ball",
      description: "Dedication personified",
      imageUrl: "/balls/platinum-ball.png",
      coinPrice: 0,
      usdPrice: 0,
      achievementRequired: "play_50",
      achievementName: "Marathon Player",
    },
    {
      id: "fire-ball",
      name: "Fire Ball",
      description: "Burning hot streak",
      imageUrl: "/balls/fire-ball.png",
      coinPrice: 0,
      usdPrice: 0,
      achievementRequired: "streak_10",
      achievementName: "On Fire",
    },
  ];

  const handlePurchaseWithCoins = (ball: BallSkin) => {
    if (currentCoins < ball.coinPrice) {
      toast({
        title: "Not Enough Coins",
        description: `You need ${ball.coinPrice} coins. You have ${currentCoins}.`,
        variant: "destructive",
      });
      return;
    }

    onPurchaseWithCoins(ball);
    setSelectedBall(null);
    toast({
      title: "Ball Skin Unlocked!",
      description: `You purchased ${ball.name} for ${ball.coinPrice} coins!`,
    });
  };

  const handlePurchaseWithMoney = async (ball: BallSkin) => {
    if (fbInstant.isFBInstant()) {
      toast({
        title: "Payment Coming Soon",
        description: "Real money purchases will be available soon on Facebook!",
      });
      return;
    }
    
    // Use Stripe for standalone web version
    setIsPurchasing(ball.id);
    try {
      const { url, error, code } = await initiateStripePurchase(ball.id, ball.name, ownedBalls);
      
      if (code === 'DUPLICATE_PURCHASE') {
        toast({
          title: "Already Owned",
          description: "You already own this ball skin!",
        });
        return;
      }
      
      if (error) {
        toast({
          title: "Purchase Error",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      }
    } catch (err) {
      toast({
        title: "Purchase Error",
        description: "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const isOwned = (ballId: string) => ownedBalls.includes(ballId);
  const isCurrent = (ballId: string) => currentBall === ballId;
  const isAchievementUnlocked = (achievementId?: string) => {
    if (!achievementId) return true;
    return unlockedAchievements.includes(achievementId);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShoppingBag className="w-6 h-6" />
              Ball Skins Shop
            </DialogTitle>
            <DialogDescription>
              Customize your game with unique ball skins
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-lg">{currentCoins} Coins</span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ballSkins.map((ball) => {
              const owned = isOwned(ball.id);
              const current = isCurrent(ball.id);
              const achievementUnlocked = isAchievementUnlocked(ball.achievementRequired);
              const isLocked = ball.achievementRequired && !achievementUnlocked;

              return (
                <Card key={ball.id} className={`overflow-hidden ${current ? 'ring-2 ring-primary' : ''} ${isLocked ? 'opacity-75' : ''}`}>
                  <div className="aspect-square relative overflow-hidden bg-muted flex items-center justify-center p-4">
                    <img
                      src={ball.imageUrl}
                      alt={ball.name}
                      className={`w-full h-full object-contain ${isLocked ? 'filter grayscale blur-sm' : ''}`}
                    />
                    {current && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Lock className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {ball.name}
                      {ball.achievementRequired && (
                        <Trophy className="w-4 h-4 text-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {ball.description}
                    </CardDescription>
                    {ball.achievementRequired && (
                      <Badge variant={achievementUnlocked ? "default" : "secondary"} className="mt-2 w-fit">
                        {achievementUnlocked ? `✓ ${ball.achievementName}` : `🔒 ${ball.achievementName}`}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardFooter className="flex-col gap-2">
                    {isLocked ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Complete Achievement
                      </Button>
                    ) : ball.id === "default" ? (
                      <Button
                        className="w-full"
                        variant={current ? "secondary" : "default"}
                        onClick={() => onSelectBall(ball.id)}
                      >
                        {current ? "Currently Active" : "Use This Ball"}
                      </Button>
                    ) : owned ? (
                      <Button
                        className="w-full"
                        variant={current ? "secondary" : "default"}
                        onClick={() => onSelectBall(ball.id)}
                        disabled={current}
                      >
                        {current ? "Currently Active" : "Use This Ball"}
                      </Button>
                    ) : ball.achievementRequired ? (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => onSelectBall(ball.id)}
                      >
                        Use This Ball
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="w-full flex items-center justify-center gap-2"
                          variant="outline"
                          onClick={() => handlePurchaseWithCoins(ball)}
                          disabled={currentCoins < ball.coinPrice}
                        >
                          <Coins className="w-4 h-4 text-yellow-500" />
                          {ball.coinPrice} Coins
                        </Button>
                        <Button
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handlePurchaseWithMoney(ball)}
                          disabled={isPurchasing === ball.id}
                        >
                          {isPurchasing === ball.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                          ${ball.usdPrice.toFixed(2)} USD
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-3">
              <a
                href="/privacy"
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Terms of Service
              </a>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close Shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
