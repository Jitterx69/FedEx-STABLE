import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DCABehaviorHeatmapProps {
  isStableMode: boolean;
}

const dcaNames = ["DCA Alpha", "DCA Beta", "DCA Gamma", "DCA Delta", "DCA Epsilon"];
const effortCategories = ["High Priority", "Medium Priority", "Low Priority", "Aging"];

function generateHeatmapData(isStableMode: boolean) {
  return dcaNames.map((dca) => {
    if (isStableMode) {
      // Balanced distribution
      return {
        name: dca,
        values: [
          25 + Math.random() * 10 - 5,
          30 + Math.random() * 10 - 5,
          25 + Math.random() * 10 - 5,
          20 + Math.random() * 10 - 5,
        ],
      };
    } else {
      // Unbalanced, cherry-picking behavior
      const cherryPick = Math.random() > 0.5;
      return {
        name: dca,
        values: cherryPick
          ? [60 + Math.random() * 20, 20 + Math.random() * 10, 10 + Math.random() * 10, 10 + Math.random() * 5]
          : [10 + Math.random() * 10, 15 + Math.random() * 10, 35 + Math.random() * 15, 40 + Math.random() * 20],
      };
    }
  });
}

function getHeatColor(value: number, isStableMode: boolean): string {
  // In baseline: red for over-concentration (high or very low), green for balanced
  // In STABLE: should be mostly green/balanced
  if (isStableMode) {
    // All should be reasonably balanced
    if (value >= 20 && value <= 35) return "bg-emerald-500/60";
    if (value >= 15 && value <= 40) return "bg-emerald-500/40";
    return "bg-amber-500/40";
  } else {
    // Baseline shows problems
    if (value > 45) return "bg-red-500/60"; // Over-concentration
    if (value < 15) return "bg-amber-500/50"; // Under-allocation
    if (value >= 20 && value <= 35) return "bg-emerald-500/40";
    return "bg-slate-600/40";
  }
}

export function DCABehaviorHeatmap({ isStableMode }: DCABehaviorHeatmapProps) {
  const data = useMemo(() => generateHeatmapData(isStableMode), [isStableMode]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-5 gap-1 text-xs">
        <div className="text-muted-foreground"></div>
        {effortCategories.map((cat) => (
          <div key={cat} className="text-center text-muted-foreground truncate px-1">
            {cat}
          </div>
        ))}
      </div>

      {/* Heatmap rows */}
      {data.map((row) => (
        <div key={row.name} className="grid grid-cols-5 gap-1">
          <div className="text-xs text-foreground flex items-center truncate">
            {row.name}
          </div>
          {row.values.map((value, idx) => (
            <div
              key={idx}
              className={cn(
                "h-8 rounded flex items-center justify-center text-xs font-mono transition-colors duration-500",
                getHeatColor(value, isStableMode)
              )}
            >
              {Math.round(value)}%
            </div>
          ))}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/60"></div>
          <span>Over-concentrated</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/60"></div>
          <span>Balanced</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/50"></div>
          <span>Risk</span>
        </div>
      </div>
    </div>
  );
}
