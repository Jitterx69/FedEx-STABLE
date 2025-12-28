import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";

interface GlobalControlBarProps {
  isStableMode: boolean;
  onModeChange: (isStable: boolean) => void;
  simulationTime: number;
  isRunning: boolean;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function GlobalControlBar({
  isStableMode,
  onModeChange,
  simulationTime,
  isRunning,
  onRun,
  onPause,
  onReset,
}: GlobalControlBarProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Left - Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            STABLE
          </h1>
          <span className="text-xs text-muted-foreground hidden md:inline">
            Strategic Transaction & Account Balance Lifecycle Engine
          </span>
        </div>
      </div>

      {/* Center - Mode Toggle */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeToggle isStableMode={isStableMode} onModeChange={onModeChange} />
      </div>

      {/* Right - Simulation Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Simulation</span>
          <span className="font-mono text-foreground bg-secondary px-2 py-1 rounded text-xs">
            T+{simulationTime}
          </span>
        </div>
        <div className="flex items-center gap-1 border-l border-border pl-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={isRunning ? onPause : onRun}
            aria-label={isRunning ? "Pause simulation" : "Run simulation"}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onReset}
            aria-label="Reset simulation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
