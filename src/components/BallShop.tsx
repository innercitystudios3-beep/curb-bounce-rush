import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingBag, Lock, Check, Coins, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fbInstant } from "@/lib/fbInstantManager";

export interface BallSkin {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  coinPrice: number;
  usdPrice: number;
}

interface BallShopProps {
  onClose: () => void;
  currentCoins: number;
  onPurchaseWithCoins: (ball: BallSkin) => void;
  onPurchaseWithMoney: (ball: BallSkin) => void;
  ownedBalls: string[];
  onSelectBall: (ballId: string) => void;
  currentBall: string;
}

export const BallShop = ({
  onClose,
  currentCoins,
  onPurchaseWithCoins,
  onPurchaseWithMoney,
  ownedBalls,
  onSelectBall,
  currentBall,
}: BallShopProps) => {
  const { toast } = useToast();
  const [selectedBall, setSelectedBall] = useState<BallSkin | null>(null);

  const ballSkins: BallSkin[] = [
    {
      id: "default",
      name: "Classic Ball",
      description: "Original game ball",
      imageUrl: "/curbball-logo.png",
      coinPrice: 0,
      usdPrice: 0,
    },
    {
      id: "basketball",
      name: "Basketball",
      description: "Bounce like a pro hooper",
      imageUrl: "/balls/basketball.png",
      coinPrice: 3000,
      usdPrice: 0.99,
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
        description: "Real money purchases will be available soon!",
      });
    } else {
      onPurchaseWithMoney(ball);
      setSelectedBall(null);
      toast({
        title: "Ball Skin Unlocked!",
        description: `You purchased ${ball.name}! (Demo mode)`,
      });
    }
  };

  const isOwned = (ballId: string) => ownedBalls.includes(ballId);
  const isCurrent = (ballId: string) => currentBall === ballId;

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

              return (
                <Card key={ball.id} className={`overflow-hidden ${current ? 'ring-2 ring-primary' : ''}`}>
                  <div className="aspect-square relative overflow-hidden bg-muted flex items-center justify-center p-4">
                    <img
                      src={ball.imageUrl}
                      alt={ball.name}
                      className="w-full h-full object-contain"
                    />
                    {current && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{ball.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {ball.description}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="flex-col gap-2">
                    {ball.id === "default" ? (
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
                        >
                          <DollarSign className="w-4 h-4" />
                          ${ball.usdPrice.toFixed(2)} USD
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Close Shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
