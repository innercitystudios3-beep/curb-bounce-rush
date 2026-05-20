import { Card } from "@/components/ui/card";
import { useMemo } from "react";

interface ThrowMeterProps {
  value: number;          // 0-100 — hook to game power state
  isCharging: boolean;    // hook to charge phase
  disabled?: boolean;     // hook to locked/cooldown state
}

// Sweet-spot window (kept in sync with game scoring logic)
const SWEET_MIN = 60;
const SWEET_MAX = 80;

export const ThrowMeter = ({ value, isCharging, disabled }: ThrowMeterProps) => {
  const clamped = Math.max(0, Math.min(100, value));

  const { zone, zoneLabel, zoneColor } = useMemo(() => {
    if (clamped >= SWEET_MIN && clamped <= SWEET_MAX) {
      return { zone: "perfect", zoneLabel: "PERFECT!", zoneColor: "hsl(var(--game-success))" };
    }
    if (clamped < 40) return { zone: "weak", zoneLabel: "TOO WEAK", zoneColor: "hsl(var(--game-danger))" };
    if (clamped > 90) return { zone: "strong", zoneLabel: "TOO STRONG", zoneColor: "hsl(var(--game-danger))" };
    return { zone: "good", zoneLabel: "GOOD", zoneColor: "hsl(var(--game-warning))" };
  }, [clamped]);

  const inSweetSpot = zone === "perfect";

  return (
    <Card
      role="group"
      aria-label="Throw power meter"
      aria-disabled={disabled || undefined}
      className={`p-1.5 w-24 bg-card/95 backdrop-blur-md border-2 shadow-lg motion-safe:transition-all motion-safe:duration-150 ${
        inSweetSpot
          ? "border-[hsl(var(--game-success))] shadow-[0_0_18px_hsl(var(--game-success)/0.6)] scale-105"
          : isCharging
          ? "border-primary/70"
          : "border-border"
      } ${disabled ? "opacity-50 grayscale" : ""}`}
    >
      <div className="space-y-1">
        {/* Header */}
        <div className="text-center">
          <span className="text-[8px] font-black text-foreground uppercase tracking-[0.15em]">
            Power
          </span>
        </div>

        {/* Power bar */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${Math.round(clamped)} percent — ${zoneLabel}`}
          className="relative h-5 bg-muted/40 rounded-sm overflow-hidden border border-border/80"
        >
          {/* Sweet-spot band — always visible, pre-attentive cue */}
          <div
            aria-hidden="true"
            className={`absolute inset-y-0 border-x border-[hsl(var(--game-success)/0.7)] bg-[hsl(var(--game-success)/0.18)] ${
              inSweetSpot ? "motion-safe:animate-pulse" : ""
            }`}
            style={{ left: `${SWEET_MIN}%`, width: `${SWEET_MAX - SWEET_MIN}%` }}
          />

          {/* Power fill */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 motion-safe:transition-[width,background-color] motion-safe:duration-[80ms] ease-linear"
            style={{
              width: `${clamped}%`,
              backgroundColor: zoneColor,
              boxShadow: inSweetSpot
                ? `0 0 10px ${zoneColor}, inset 0 0 6px hsl(var(--background)/0.3)`
                : "inset 0 0 6px hsl(var(--background)/0.3)",
            }}
          />

          {/* Needle tip — gives precise position read */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px bg-foreground/90"
            style={{ left: `calc(${clamped}% - 0.5px)` }}
          />
        </div>

        {/* Numeric + zone label */}
        <div className="text-center leading-none">
          <div
            className="text-lg font-black tabular-nums text-foreground"
            style={{ color: inSweetSpot ? zoneColor : undefined }}
          >
            {Math.round(clamped)}
          </div>
          <div
            aria-live="polite"
            className="text-[8px] font-bold uppercase tracking-wider mt-0.5"
            style={{ color: zoneColor }}
            key={zone /* re-mount triggers fade-in on zone change */}
          >
            <span className="motion-safe:animate-fade-in inline-block">{zoneLabel}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
