import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  progress: number;
  unlocked: boolean;
  reward: string; // ball skin id
  icon: string;
}

interface AchievementsProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export const Achievements = ({ isOpen, onClose, achievements }: AchievementsProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-primary" />
            Achievements
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 mt-4">
          {achievements.map((achievement) => (
            <Card 
              key={achievement.id}
              className={`p-4 transition-all ${
                achievement.unlocked 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' 
                  : 'bg-muted/50 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  achievement.unlocked 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {achievement.unlocked ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{achievement.name}</h3>
                    {achievement.unlocked && (
                      <Badge variant="default" className="bg-primary">
                        Unlocked!
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {achievement.progress} / {achievement.requirement}
                      </span>
                      <span>
                        {Math.min(100, Math.round((achievement.progress / achievement.requirement) * 100))}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (achievement.progress / achievement.requirement) * 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Reward: {achievement.reward.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')} Ball Skin
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
