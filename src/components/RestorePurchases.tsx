import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Package, Loader2 } from "lucide-react";

interface RestorePurchasesProps {
  isOpen: boolean;
  onClose: () => void;
  ownedBalls: string[];
  ownedBackdrops: string[];
  onRestoreBalls: (balls: string[]) => void;
  onRestoreBackdrops: (backdrops: string[]) => void;
}

interface Purchase {
  item_id: string;
  item_type: string;
  item_name: string;
  created_at: string;
}

export const RestorePurchases = ({
  isOpen,
  onClose,
  ownedBalls,
  ownedBackdrops,
  onRestoreBalls,
  onRestoreBackdrops,
}: RestorePurchasesProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [restoredItems, setRestoredItems] = useState<Purchase[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleRestore = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the email you used for purchases.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke("restore-purchases", {
        body: { email: email.trim() },
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.purchases) {
        const purchases: Purchase[] = data.purchases;
        setRestoredItems(purchases);
        setHasSearched(true);

        // Separate balls and backdrops
        const newBalls = purchases
          .filter((p) => p.item_type === "ball" && !ownedBalls.includes(p.item_id))
          .map((p) => p.item_id);

        const newBackdrops = purchases
          .filter((p) => p.item_type === "backdrop" && !ownedBackdrops.includes(p.item_id))
          .map((p) => p.item_id);

        if (newBalls.length > 0) {
          onRestoreBalls([...ownedBalls, ...newBalls]);
        }

        if (newBackdrops.length > 0) {
          onRestoreBackdrops([...ownedBackdrops, ...newBackdrops]);
        }

        const totalRestored = newBalls.length + newBackdrops.length;

        if (totalRestored > 0) {
          toast({
            title: "Purchases Restored!",
            description: `Successfully restored ${totalRestored} item${totalRestored > 1 ? "s" : ""}.`,
          });
        } else if (purchases.length > 0) {
          toast({
            title: "Already Restored",
            description: "All your purchases are already in your account.",
          });
        } else {
          toast({
            title: "No Purchases Found",
            description: "No purchases found for this email address.",
          });
        }
      }
    } catch (err) {
      console.error("Error restoring purchases:", err);
      toast({
        title: "Restore Failed",
        description: "Could not restore purchases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRestoredItems([]);
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Restore Purchases
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the email you used when making purchases to restore them on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 border-primary/20"
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleRestore}
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Restore Purchases
              </>
            )}
          </Button>

          {hasSearched && restoredItems.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Found Purchases:</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {restoredItems.map((item, index) => (
                  <div
                    key={`${item.item_id}-${index}`}
                    className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg"
                  >
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">
                      {item.item_name || item.item_id}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {item.item_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSearched && restoredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No purchases found for this email.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
