import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Coins, Check, Clock } from "lucide-react";

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  completed: boolean;
  coinReward: number;
  expiresAt: number; // timestamp
}

interface DailyChallengesProps {
  onClose: () => void;
  challenges: DailyChallenge[];
}

export const DailyChallenges = ({ onClose, challenges }: DailyChallengesProps) => {
  const getTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-primary" />
            Daily Challenges
          </DialogTitle>
          <DialogDescription>
            Complete challenges to earn bonus coins! Resets every 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {challenges.map((challenge) => {
            const progressPercent = Math.min((challenge.progress / challenge.goal) * 100, 100);
            
            return (
              <Card key={challenge.id} className={`${challenge.completed ? 'border-primary bg-primary/5' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {challenge.title}
                        {challenge.completed && (
                          <Badge variant="default" className="ml-2">
                            <Check className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500 font-bold">
                      <Coins className="w-4 h-4" />
                      {challenge.coinReward}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Progress: {challenge.progress} / {challenge.goal}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {getTimeRemaining(challenge.expiresAt)}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
