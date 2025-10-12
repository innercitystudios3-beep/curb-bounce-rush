import { Card } from "@/components/ui/card";

interface ThrowMeterProps {
  value: number;
  isCharging: boolean;
  disabled?: boolean;
}

export const ThrowMeter = ({ value, isCharging, disabled }: ThrowMeterProps) => {
  const getPowerColor = (power: number) => {
    if (power >= 60 && power <= 80) return "hsl(var(--game-success))";
    if (power < 40 || power > 90) return "hsl(var(--game-danger))";
    return "hsl(var(--game-warning))";
  };

  const getPowerLabel = (power: number) => {
    if (power >= 60 && power <= 80) return "PERFECT!";
    if (power < 40) return "TOO WEAK";
    if (power > 90) return "TOO STRONG";
    return "GOOD";
  };

  const isInSweetSpot = value >= 60 && value <= 80;

  return (
    <Card className="p-1.5 w-20 bg-card/95 backdrop-blur-md border border-border shadow-lg">
      <div className="space-y-0.5">
        {/* Header */}
        <div className="text-center">
          <span className="text-[8px] font-bold text-foreground uppercase tracking-wide">
            Power
          </span>
        </div>
        
        {/* Visual Power Bar */}
        <div className="relative h-4 bg-muted/30 rounded overflow-hidden border border-border">
          {/* Power fill */}
          <div
            className="absolute inset-y-0 left-0 transition-all duration-100 ease-linear bg-primary"
            style={{
              width: `${value}%`,
            }}
          />
        </div>
        
        {/* Numeric display */}
        <div className="text-center">
          <div className="text-base font-black text-foreground">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
};
