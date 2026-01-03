import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, User, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfile, UserProfile } from "./ProfileModal";
import { US_STATES } from "@/lib/usStates";

export interface LeaderboardEntry {
  rank: number;
  score: number;
  date: string;
  difficulty: "easy" | "medium" | "hard";
}

interface LocalLeaderboardProps {
  difficulty?: "easy" | "medium" | "hard";
  showTabs?: boolean;
}

const STORAGE_KEY = "curbball_leaderboard";
const MAX_ENTRIES = 10;

export const saveScore = (score: number, difficulty: "easy" | "medium" | "hard") => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const entries: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];
  
  const newEntry: LeaderboardEntry = {
    rank: 0,
    score,
    date: new Date().toISOString(),
    difficulty,
  };
  
  entries.push(newEntry);
  
  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);
  
  // Update ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Keep only top entries
  const trimmed = entries.slice(0, MAX_ENTRIES * 3); // 10 per difficulty max
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  
  // Return the rank if it's a new high score
  const difficultyEntries = trimmed.filter(e => e.difficulty === difficulty);
  const newRank = difficultyEntries.findIndex(e => e.score === score && e.date === newEntry.date);
  return newRank !== -1 && newRank < MAX_ENTRIES ? newRank + 1 : null;
};

export const getScores = (difficulty?: "easy" | "medium" | "hard"): LeaderboardEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  const entries: LeaderboardEntry[] = JSON.parse(stored);
  
  if (difficulty) {
    return entries
      .filter(e => e.difficulty === difficulty)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
  
  return entries
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-muted-foreground font-bold">#{rank}</span>;
  }
};

const getStateName = (stateCode: string): string => {
  const state = US_STATES.find(s => s.code === stateCode);
  return state ? state.name : stateCode;
};

const getLocationString = (profile: UserProfile | null): string | null => {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.city) parts.push(profile.city);
  if (profile.state) parts.push(profile.state);
  return parts.length > 0 ? parts.join(", ") : null;
};

const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No scores yet. Play a game to set a record!
      </p>
    );
  }

  const displayName = profile?.firstName || "You";
  const location = getLocationString(profile);

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div
          key={`${entry.date}-${index}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
        >
          <div className="w-8 flex justify-center">
            {getRankIcon(entry.rank)}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {location && (
                <>
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{location}</span>
                  <span className="mx-1">•</span>
                </>
              )}
              <span>{formatDate(entry.date)}</span>
              <span className="mx-1">•</span>
              <span>{entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)}</span>
            </div>
          </div>
          <div className="font-bold text-primary text-lg flex-shrink-0">
            {entry.score.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export const LocalLeaderboard = ({ difficulty, showTabs = true }: LocalLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard" | "all">(
    difficulty || "all"
  );

  useEffect(() => {
    loadScores();
  }, [selectedDifficulty]);

  const loadScores = () => {
    if (selectedDifficulty === "all") {
      setEntries(getScores());
    } else {
      setEntries(getScores(selectedDifficulty));
    }
  };

  if (!showTabs || difficulty) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            High Scores {difficulty && `- ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardList entries={entries} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          High Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedDifficulty} onValueChange={(v) => setSelectedDifficulty(v as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="easy">Easy</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="hard">Hard</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedDifficulty}>
            <LeaderboardList entries={entries} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
