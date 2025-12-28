import { Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StabilityGauge } from "./StabilityGauge";

interface GovernanceStatusStripProps {
  isStableMode: boolean;
  stabilityIndex: number;
  convergenceStatus: "contractive" | "non-expansive" | "unstable" | "no-regime";
  safetyChecks: {
    information: boolean;
    incentives: boolean;
    policyRate: boolean;
  };
}

const convergenceLabels: Record<string, { label: string; color: string }> = {
  contractive: { label: "Contractive Regime", color: "text-governance-safe" },
  "non-expansive": { label: "Non-expansive", color: "text-primary" },
  unstable: { label: "Unstable", color: "text-governance-unsafe" },
  "no-regime": { label: "No Stable Regime", color: "text-muted-foreground" },
};

function SafetyCheckItem({
  label,
  isSafe,
  isActive,
}: {
  label: string;
  isSafe: boolean;
  isActive: boolean;
}) {
  if (!isActive) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/50">
        <div className="w-5 h-5 rounded-full border border-muted/50 flex items-center justify-center">
          <span className="text-xs">—</span>
        </div>
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center",
          isSafe ? "bg-emerald-500/20" : "bg-red-500/20"
        )}
      >
        {isSafe ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <X className="w-3 h-3 text-red-500" />
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          isSafe ? "text-emerald-500" : "text-red-500"
        )}
      >
        {label} {isSafe ? "SAFE" : "AT RISK"}
      </span>
    </div>
  );
}

export function GovernanceStatusStrip({
  isStableMode,
  stabilityIndex,
  convergenceStatus,
  safetyChecks,
}: GovernanceStatusStripProps) {
  const convergence = convergenceLabels[convergenceStatus];

  return (
    <footer className="h-24 bg-card border-t border-border shrink-0">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left - Stability Index Gauge */}
        <div className="flex items-center gap-4">
          <StabilityGauge value={stabilityIndex} isActive={isStableMode} />
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Stability Index
            </div>
            <div className="text-2xl font-mono font-semibold text-foreground">
              {isStableMode ? stabilityIndex.toFixed(2) : "—"}
            </div>
          </div>
        </div>

        {/* Center - Convergence Status */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Convergence Status
          </div>
          {isStableMode ? (
            <div className={cn("text-lg font-medium flex items-center gap-2", convergence.color)}>
              {convergenceStatus === "unstable" && <AlertTriangle className="w-4 h-4" />}
              {convergence.label}
            </div>
          ) : (
            <div className="text-lg font-medium text-muted-foreground/50">
              No Active Regime
            </div>
          )}
        </div>

        {/* Right - Governance Envelope */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Governance Envelope
          </div>
          <div className="flex items-center gap-4">
            <SafetyCheckItem
              label="Information"
              isSafe={safetyChecks.information}
              isActive={isStableMode}
            />
            <SafetyCheckItem
              label="Incentives"
              isSafe={safetyChecks.incentives}
              isActive={isStableMode}
            />
            <SafetyCheckItem
              label="Policy Rate"
              isSafe={safetyChecks.policyRate}
              isActive={isStableMode}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
