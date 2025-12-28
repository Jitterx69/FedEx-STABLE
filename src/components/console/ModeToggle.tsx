import { cn } from "@/lib/utils";

interface ModeToggleProps {
  isStableMode: boolean;
  onModeChange: (isStable: boolean) => void;
}

export function ModeToggle({ isStableMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center bg-secondary rounded-lg p-1 border border-border">
      <button
        onClick={() => onModeChange(false)}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 flex items-center gap-2",
          !isStableMode
            ? "bg-muted text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full transition-colors duration-300",
            !isStableMode ? "bg-muted-foreground" : "bg-muted-foreground/30"
          )}
        />
        Baseline System
      </button>
      <button
        onClick={() => onModeChange(true)}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 flex items-center gap-2",
          isStableMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full transition-colors duration-300",
            isStableMode ? "bg-primary-foreground" : "bg-muted-foreground/30"
          )}
        />
        STABLE Enabled
      </button>
    </div>
  );
}
