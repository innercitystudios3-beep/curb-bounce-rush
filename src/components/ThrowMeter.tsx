import { Card } from "@/components/ui/card";

interface ThrowMeterProps {
  value: number;
  isCharging: boolean;
  disabled?: boolean;
}

export const ThrowMeter = ({ value, isCharging, disabled }: ThrowMeterProps) => {
  const getPowerColor = (power: number) => {
    if (power >= 60 && power <= 80) return "#22c55e"; // green — perfect zone
    if (power < 40 || power > 90) return "#ef4444";   // red — too weak/strong
    return "#eab308";                                   // yellow — good
  };

  const getPowerLabel = (power: number) => {
    if (power >= 60 && power <= 80) return "PERFECT!";
    if (power < 40) return "TOO WEAK";
    if (power > 90) return "TOO STRONG";
    return "GOOD";
  };

  const isInSweetSpot = value >= 60 && value <= 80;
  const color = getPowerColor(value);
  const label = getPowerLabel(value);

  return (
    <Card className="p-2 w-28 bg-card/95 backdrop-blur-md border border-border shadow-lg">
      <div className="space-y-1">
        {/* Header */}
        <div className="text-center">
          <span className="text-[9px] font-bold text-foreground uppercase tracking-wide">
            Power
          </span>
        </div>

        {/* Visual Power Bar with sweet-spot marker */}
        <div className="relative h-4 bg-muted/30 rounded overflow-hidden border border-border">
          {/* Sweet-spot highlight (60–80%) */}
          <div
            className="absolute inset-y-0 opacity-30"
            style={{ left: "60%", width: "20%", backgroundColor: "#22c55e" }}
          />
          {/* Power fill */}
          <div
            className="absolute inset-y-0 left-0 transition-all duration-100 ease-linear"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>

        {/* Numeric display */}
        <div className="text-center">
          <div
            className="text-sm font-black"
            style={{ color }}
          >
            {isCharging || value > 0 ? label : "CHARGE"}
          </div>
        </div>
      </div>
    </Card>
  );
};
