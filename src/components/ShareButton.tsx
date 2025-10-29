import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { fbInstant } from "@/lib/fbInstantManager";
import { toast } from "@/hooks/use-toast";

interface ShareButtonProps {
  score: number;
  coins: number;
}

export const ShareButton = ({ score, coins }: ShareButtonProps) => {
  const handleShare = async () => {
    if (!fbInstant.isFBInstant()) {
      toast({
        title: "Share unavailable",
        description: "Sharing is only available in Facebook Instant Games",
      });
      return;
    }

    try {
      await fbInstant.shareAsync({
        intent: 'SHARE',
        text: `I just scored ${score} points and earned ${coins} coins in Coin Toss! Can you beat my score?`,
        data: { score, coins },
      });

      toast({
        title: "Shared!",
        description: "Your score has been shared with your friends",
      });
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share failed",
        description: "Could not share at this time",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className="gap-2"
    >
      <Share2 className="h-4 w-4" />
      Share Score
    </Button>
  );
};
