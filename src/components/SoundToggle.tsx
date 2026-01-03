import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { soundManager } from "@/lib/soundManager";

interface SoundToggleProps {
  className?: string;
}

export const SoundToggle = ({ className }: SoundToggleProps) => {
  const [isSfxMuted, setIsSfxMuted] = useState(soundManager.getMuted());

  const toggleSfx = () => {
    const newMuted = soundManager.toggleMute();
    setIsSfxMuted(newMuted);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSfx}
        className="border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground h-9 w-9"
        aria-label={isSfxMuted ? "Unmute sound effects" : "Mute sound effects"}
        title={isSfxMuted ? "Sound Effects: OFF" : "Sound Effects: ON"}
      >
        {isSfxMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </div>
  );
};
