import { useState, useEffect } from "react";
import { GameCanvas, Difficulty } from "@/components/GameCanvas";
import { DifficultySelection } from "@/components/DifficultySelection";
import { FBInstantLoading } from "@/components/FBInstantLoading";
import { fbInstant } from "@/lib/fbInstantManager";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  useEffect(() => {
    const initializeFBInstant = async () => {
      try {
        // Initialize FBInstant SDK
        await fbInstant.initializeAsync();
        
        // Simulate loading progress
        const progressInterval = setInterval(() => {
          setLoadingProgress((prev) => {
            const next = prev + 10;
            fbInstant.setLoadingProgress(next);
            
            if (next >= 100) {
              clearInterval(progressInterval);
            }
            return next;
          });
        }, 100);

        // Wait for loading to complete
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Start the game
        await fbInstant.startGameAsync();
        
        setIsLoading(false);
      } catch (error) {
        console.error('FBInstant initialization error:', error);
        // Continue to game even if FBInstant fails (web fallback)
        setIsLoading(false);
      }
    };

    initializeFBInstant();
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <FBInstantLoading onComplete={handleLoadingComplete} />;
  }

  if (!difficulty) {
    return <DifficultySelection onSelectDifficulty={setDifficulty} />;
  }

  return (
    <div className="w-full h-screen bg-background">
      <GameCanvas difficulty={difficulty} />
    </div>
  );
};

export default Index;
