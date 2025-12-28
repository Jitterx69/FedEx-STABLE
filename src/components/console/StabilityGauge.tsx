import { cn } from "@/lib/utils";

interface StabilityGaugeProps {
  value: number; // 0 to 1
  isActive: boolean;
}

export function StabilityGauge({ value, isActive }: StabilityGaugeProps) {
  const radius = 28;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = isActive ? value : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on value
  const getColor = () => {
    if (!isActive) return "hsl(222, 10%, 25%)";
    if (value >= 0.7) return "hsl(142, 55%, 45%)"; // Green - stable
    if (value >= 0.4) return "hsl(38, 92%, 50%)"; // Yellow - risk
    return "hsl(0, 62%, 50%)"; // Red - unstable
  };

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70">
        {/* Background circle */}
        <circle
          cx="35"
          cy="35"
          r={radius}
          fill="none"
          stroke="hsl(222, 15%, 18%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx="35"
          cy="35"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="gauge-ring transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          "text-xs font-mono",
          isActive ? "text-foreground" : "text-muted-foreground/50"
        )}
      >
        {isActive ? (
          <span
            className={cn(
              value >= 0.7
                ? "text-emerald-500"
                : value >= 0.4
                ? "text-amber-500"
                : "text-red-500"
            )}
          >
            {(value * 100).toFixed(0)}%
          </span>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
