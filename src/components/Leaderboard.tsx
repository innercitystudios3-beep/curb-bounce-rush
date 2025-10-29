import { useState, useEffect } from "react";
import { fbInstant } from "@/lib/fbInstantManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  score: number;
  player: {
    name: string;
    photo: string;
  };
}

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    if (!fbInstant.isFBInstant()) {
      setLoading(false);
      return;
    }

    try {
      const leaderboardEntries = await fbInstant.getLeaderboardEntries('global_leaderboard', 10);
      setEntries(leaderboardEntries);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!fbInstant.isFBInstant()) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No scores yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 text-center font-bold">
                  {entry.rank === 1 && "🥇"}
                  {entry.rank === 2 && "🥈"}
                  {entry.rank === 3 && "🥉"}
                  {entry.rank > 3 && `#${entry.rank}`}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.player.photo} alt={entry.player.name} />
                  <AvatarFallback>{entry.player.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{entry.player.name}</p>
                </div>
                <div className="font-bold text-primary">
                  {entry.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
