import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingBag, Lock, Check, Coins, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fbInstant } from "@/lib/fbInstantManager";
import { initiateStripePurchase } from "@/lib/stripePayments";

export interface Backdrop {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  coinPrice: number;
  usdPrice: number;
}

interface BackdropShopProps {
  onClose: () => void;
  currentCoins: number;
  onPurchaseWithCoins: (backdrop: Backdrop) => void;
  onPurchaseWithMoney: (backdrop: Backdrop) => void;
  ownedBackdrops: string[];
  onSelectBackdrop: (backdropId: string) => void;
  currentBackdrop: string;
}

export const BackdropShop = ({
  onClose,
  currentCoins,
  onPurchaseWithCoins,
  onPurchaseWithMoney,
  ownedBackdrops,
  onSelectBackdrop,
  currentBackdrop,
}: BackdropShopProps) => {
  const { toast } = useToast();
  const [selectedBackdrop, setSelectedBackdrop] = useState<Backdrop | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const backdrops: Backdrop[] = [
    {
      id: "default",
      name: "East High School",
      description: "Classic game backdrop",
      imageUrl: "/backgrounds/east-high-school.png",
      coinPrice: 0,
      usdPrice: 0,
    },
    {
      id: "linden-mural",
      name: "Linden Mural",
      description: "Vibrant community art featuring local landmarks",
      imageUrl: "/backgrounds/linden-mural.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "ohio-tower",
      name: "Ohio Water Tower",
      description: "Iconic Columbus landmark",
      imageUrl: "/backgrounds/ohio-tower.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "dispatch-building",
      name: "Columbus Dispatch",
      description: "Ohio's greatest home newspaper - 145 years of service",
      imageUrl: "/backgrounds/dispatch-building.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "linden-mckinley-school",
      name: "Linden McKinley School",
      description: "Historic Columbus educational landmark",
      imageUrl: "/backgrounds/linden-mckinley-school.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "backdrop-3",
      name: "Columbus Landmark 3",
      description: "Exclusive Columbus backdrop",
      imageUrl: "/backgrounds/backdrop-3.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "backdrop-4",
      name: "Columbus Landmark 4",
      description: "Exclusive Columbus backdrop",
      imageUrl: "/backgrounds/backdrop-4.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "backdrop-5",
      name: "Columbus Landmark 5",
      description: "Exclusive Columbus backdrop",
      imageUrl: "/backgrounds/backdrop-5.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "backdrop-6",
      name: "Columbus Landmark 6",
      description: "Exclusive Columbus backdrop",
      imageUrl: "/backgrounds/backdrop-6.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "poindexter-village",
      name: "Poindexter Village",
      description: "Historic Museum and Cultural Center",
      imageUrl: "/backgrounds/poindexter-village.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
    {
      id: "lincoln-theatre",
      name: "Lincoln Theatre",
      description: "Enriching artists and the community since 1928",
      imageUrl: "/backgrounds/lincoln-theatre.png",
      coinPrice: 5000,
      usdPrice: 1.99,
    },
  ];

  const handlePurchaseWithCoins = (backdrop: Backdrop) => {
    if (currentCoins < backdrop.coinPrice) {
      toast({
        title: "Not Enough Coins",
        description: `You need ${backdrop.coinPrice} coins. You have ${currentCoins}.`,
        variant: "destructive",
      });
      return;
    }

    onPurchaseWithCoins(backdrop);
    setSelectedBackdrop(null);
    toast({
      title: "Backdrop Unlocked!",
      description: `You purchased ${backdrop.name} for ${backdrop.coinPrice} coins!`,
    });
  };

  const handlePurchaseWithMoney = async (backdrop: Backdrop) => {
    if (fbInstant.isFBInstant()) {
      toast({
        title: "Payment Coming Soon",
        description: "Real money purchases will be available soon on Facebook!",
      });
      return;
    }
    
    // Use Stripe for standalone web version
    setIsPurchasing(backdrop.id);
    try {
      const { url, error, code } = await initiateStripePurchase(backdrop.id, backdrop.name, ownedBackdrops);
      
      if (code === 'DUPLICATE_PURCHASE') {
        toast({
          title: "Already Owned",
          description: "You already own this backdrop!",
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

  const isOwned = (backdropId: string) => ownedBackdrops.includes(backdropId);
  const isCurrent = (backdropId: string) => currentBackdrop === backdropId;

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShoppingBag className="w-6 h-6" />
              Backdrop Shop
            </DialogTitle>
            <DialogDescription>
              Customize your game with exclusive backdrops
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-lg">{currentCoins} Coins</span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {backdrops.map((backdrop) => {
              const owned = isOwned(backdrop.id);
              const current = isCurrent(backdrop.id);

              return (
                <Card key={backdrop.id} className={`overflow-hidden ${current ? 'ring-2 ring-primary' : ''}`}>
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <img
                      src={backdrop.imageUrl}
                      alt={backdrop.name}
                      className="w-full h-full object-cover"
                    />
                    {current && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{backdrop.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {backdrop.description}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="flex-col gap-2">
                    {backdrop.id === "default" ? (
                      <Button
                        className="w-full"
                        variant={current ? "secondary" : "default"}
                        onClick={() => onSelectBackdrop(backdrop.id)}
                      >
                        {current ? "Currently Active" : "Use This Backdrop"}
                      </Button>
                    ) : owned ? (
                      <Button
                        className="w-full"
                        variant={current ? "secondary" : "default"}
                        onClick={() => onSelectBackdrop(backdrop.id)}
                        disabled={current}
                      >
                        {current ? "Currently Active" : "Use This Backdrop"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="w-full flex items-center justify-center gap-2"
                          variant="outline"
                          onClick={() => handlePurchaseWithCoins(backdrop)}
                          disabled={currentCoins < backdrop.coinPrice}
                        >
                          <Coins className="w-4 h-4 text-yellow-500" />
                          {backdrop.coinPrice} Coins
                        </Button>
                        <Button
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handlePurchaseWithMoney(backdrop)}
                          disabled={isPurchasing === backdrop.id}
                        >
                          {isPurchasing === backdrop.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                          ${backdrop.usdPrice.toFixed(2)} USD
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
