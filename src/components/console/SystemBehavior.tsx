import { PortfolioFlowChart } from "./charts/PortfolioFlowChart";
import { DCABehaviorHeatmap } from "./charts/DCABehaviorHeatmap";
import { RecoveryVarianceChart } from "./charts/RecoveryVarianceChart";

interface SystemBehaviorProps {
  isStableMode: boolean;
  simulationTime: number;
}

export function SystemBehavior({ isStableMode, simulationTime }: SystemBehaviorProps) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground">System Behavior</h2>
        <span className="text-xs text-muted-foreground">
          {isStableMode ? "STABLE Mode Active" : "Baseline System"}
        </span>
      </div>

      {/* Portfolio Flow Visualization */}
      <div className="bg-card border border-border rounded-lg p-4 mode-transition">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Portfolio Flow Over Time
        </h3>
        <PortfolioFlowChart isStableMode={isStableMode} simulationTime={simulationTime} />
      </div>

      {/* DCA Behavior & Recovery Variance - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DCA Behavior Distribution */}
        <div className="bg-card border border-border rounded-lg p-4 mode-transition">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            DCA Behavior Distribution
          </h3>
          <DCABehaviorHeatmap isStableMode={isStableMode} />
        </div>

        {/* Recovery Variance Plot */}
        <div className="bg-card border border-border rounded-lg p-4 mode-transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recovery Variance
            </h3>
            <span className="text-xs text-primary font-medium">
              STABLE optimizes variance, not peak recovery
            </span>
          </div>
          <RecoveryVarianceChart isStableMode={isStableMode} simulationTime={simulationTime} />
        </div>
      </div>
    </div>
  );
}
