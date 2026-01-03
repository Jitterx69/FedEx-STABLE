import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import PortfolioFlowChart from "./charts/PortfolioFlowChart";
import DCABehaviorHeatmap from "./charts/DCABehaviorHeatmap";
import { RecoveryPerformanceChart } from "./charts/RecoveryPerformanceChart";
import { GlobalCaseList } from "./charts/GlobalCaseList";
import FullscreenChartModal from "./FullscreenChartModal";
import { fetchAccounts, Account, ingestMockAccount, fetchSystemStats } from "../../api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, ChevronDown, ArrowUpRight } from "lucide-react";
import FullscreenHeatmapModal from "./charts/FullscreenHeatmapModal";
import FullscreenRecoveryVarianceModal from "./charts/FullscreenRecoveryVarianceModal";
import { GovernanceSettings } from "../ConsoleSession";

interface SystemBehaviorProps {
  isStableMode: boolean;
  isPlaying: boolean;
  governanceSettings: GovernanceSettings;
}

type ViewMode = 'rateOfChange' | 'cumulative' | 'recoveryRate';

interface ChartDataPoint {
  time: number;
  // Rate of change (delta)
  active: number;
  recovered: number;
  escalated: number;
  // Cumulative totals
  cumulativeActive: number;
  cumulativeRecovered: number;
  cumulativeEscalated: number;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  rateOfChange: 'Rate of Change',
  cumulative: 'Cumulative Totals',
  recoveryRate: 'Recovery Rate %',
};

const SystemBehavior = ({ isStableMode, isPlaying, governanceSettings }: SystemBehaviorProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  // Unified history for main chart (shows all data regardless of mode)
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  // Separate histories for comparison mode
  const [stableHistory, setStableHistory] = useState<ChartDataPoint[]>([]);
  const [baselineHistory, setBaselineHistory] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showFullscreenHeatmap, setShowFullscreenHeatmap] = useState(false);
  const [showFullscreenRecoveryVariance, setShowFullscreenRecoveryVariance] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('rateOfChange');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Agency History State
  const [agencyHistory, setAgencyHistory] = useState<Record<string, ChartDataPoint[]>>({
    'Alpha Corp': [], 'Beta Collections': [], 'Gamma Inc': [], 'Delta Force': []
  });

  // Load Table Data (Read Model Projection)
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    } finally {
      setLoading(false);
    }
  };

  // Load Chart Data - Tracks both STABLE and Baseline histories
  const lastStats = React.useRef<{ active: number; recovered: number; escalated: number } | null>(null);
  const dataPointIndex = React.useRef(0);
  const cumulativeTotals = React.useRef({ active: 0, recovered: 0, escalated: 0 });

  const loadStats = React.useCallback(async () => {
    try {
      const stats = await fetchSystemStats();
      const timePoint = dataPointIndex.current++;

      // Calculate delta
      let deltaActive = 0;

      if (lastStats.current) {
        deltaActive = Math.max(0, stats.active - lastStats.current.active);
      }

      // Simulate BOTH modes simultaneously for comparison feature
      // Calculate real deltas from backend stats
      let deltaRecovered = 0;
      let deltaEscalated = 0;

      if (lastStats.current) {
        // Calculate positive deltas only (in case of server restart or counter reset, ignore negative)
        deltaRecovered = Math.max(0, stats.recovered - lastStats.current.recovered);
        deltaEscalated = Math.max(0, stats.escalated - lastStats.current.escalated);
      }

      // ========== GOVERNANCE EFFECTS ==========
      // Apply ALL governance settings to modify chart data in real-time

      // === INFORMATION CONTROLLER ===
      // 1. Noise Injection: Add random variance based on noise setting (0-100)
      const noiseLevel = governanceSettings.noise / 100;
      const noiseVariance = () => 1 + (Math.random() - 0.5) * noiseLevel * 0.8;

      // 2. Sharpness: Higher = cleaner signal, less volatility
      const sharpnessFactor = governanceSettings.sharpness / 100;

      // 3. Signal Decay: Higher decay = values trend toward baseline faster
      const signalDecayFactor = 1 - (governanceSettings.signalDecay / 100) * 0.3;

      // 4. Confidence Threshold: Below this, actions are dampened
      const confidenceMultiplier = governanceSettings.confidenceThreshold > 50 ? 1.2 : 0.8;

      // 5. Granularity: Fine = more precise data, coarse = more aggregated/smoothed
      const granularityMultiplier = governanceSettings.granularity === 'fine' ? 1.3 :
        governanceSettings.granularity === 'medium' ? 1.0 : 0.7;

      // === INCENTIVE CONTROLLER ===
      // 6. Incentive Gradient: Higher = better recovery rates
      const incentiveBoost = 1 + (governanceSettings.incentiveGradient / 100) * 0.6;

      // 7. Recovery Bonus: Additional multiplier for fast recoveries
      const recoveryBonusMultiplier = 1 + (governanceSettings.recoveryBonus / 100) * 0.5;

      // 8. Penalty Severity: Higher = more escalations (punitive approach)
      const penaltyFactor = 1 + (governanceSettings.penaltySeverity / 100) * 0.4;

      // 9. Escalation Threshold: Higher = fewer escalations (stricter controls)
      const escalationThresholdFactor = 1 - (governanceSettings.escalationThreshold / 100) * 0.5;

      // 10. SLA Strictness: Higher = fewer escalations (better compliance)
      const slaComplianceFactor = 1 - (governanceSettings.slaStrictness / 100) * 0.4;

      // === POLICY ENGINE ===
      // 11. Update Rate: Affects responsiveness of changes
      const updateRateMultiplier = governanceSettings.updateRate === 'reactive' ? 1.5 :
        governanceSettings.updateRate === 'smoothed' ? 1.0 : 0.6;

      // 12. Audit Frequency: Higher = better oversight, fewer issues
      const auditEffectiveness = 1 - (governanceSettings.auditFrequency / 100) * 0.2;

      // 13. Risk Tolerance: Higher = more variability allowed
      const riskVariance = 1 + (governanceSettings.riskTolerance / 100) * 0.3;

      // 14. Batch Size: Affects throughput
      const batchThroughput = 0.7 + (governanceSettings.batchSize / 100) * 0.6;

      // === RESOURCE ALLOCATION ===
      // 15. Thread Pool Size: More threads = higher processing capacity
      const processingCapacity = 0.6 + (governanceSettings.threadPoolSize / 100) * 0.8;

      // 16. Memory Buffer: Affects data retention and smoothing
      const memorySmoothing = governanceSettings.memoryBuffer / 100;

      // 17. Queue Depth: Affects backlog handling
      const queueEfficiency = 0.7 + (governanceSettings.queueDepth / 100) * 0.5;

      // === COMPLIANCE & MONITORING ===
      // 18. Regulatory Mode: Strict = conservative, Flexible = aggressive
      const regulatoryMultiplier = governanceSettings.regulatoryMode === 'strict' ? 0.8 :
        governanceSettings.regulatoryMode === 'balanced' ? 1.0 : 1.3;

      // 19. Audit Trail Depth: Higher = better tracking, fewer errors
      const auditTrailEffect = 1 - (governanceSettings.auditTrailDepth / 100) * 0.15;

      // 20. Alert Sensitivity: Higher = catch more issues early
      const alertEarlyWarning = 1 - (governanceSettings.alertSensitivity / 100) * 0.25;

      // ========== COMBINED EFFECTS ==========
      // Calculate final recovery and escalation multipliers
      const recoveryMultiplier = (
        incentiveBoost *
        recoveryBonusMultiplier *
        confidenceMultiplier *
        granularityMultiplier *
        processingCapacity *
        batchThroughput *
        updateRateMultiplier *
        signalDecayFactor
      );

      const escalationMultiplier = (
        penaltyFactor *
        escalationThresholdFactor *
        slaComplianceFactor *
        auditEffectiveness *
        regulatoryMultiplier *
        auditTrailEffect *
        alertEarlyWarning *
        queueEfficiency
      );

      // Apply governance effects when in STABLE mode
      let adjustedRecovered = deltaRecovered;
      let adjustedEscalated = deltaEscalated;

      if (isStableMode) {
        // Recovery: Apply positive multipliers with noise and sharpness dampening
        const rawRecovery = deltaRecovered * recoveryMultiplier * noiseVariance();
        adjustedRecovered = Math.round(
          rawRecovery * sharpnessFactor +
          deltaRecovered * (1 - sharpnessFactor) * memorySmoothing +
          deltaRecovered * (1 - memorySmoothing)
        );

        // Escalation: Apply reduction multipliers with risk variance
        adjustedEscalated = Math.max(0, Math.round(
          deltaEscalated * escalationMultiplier * noiseVariance() * riskVariance
        ));
      }

      // STABLE Mode: Use governance-adjusted data
      const stableRecovered = adjustedRecovered;
      const stableEscalated = adjustedEscalated;

      // Baseline Mode: Simulate Poor Performance (Low Recovery, High Escalation)
      // Assume Baseline only recovers 30% of what STABLE recovers, rest escalates.
      const baselineRecovered = Math.floor(deltaRecovered * 0.3);
      // The "missed" recoveries in Baseline become escalations
      const baselineEscalated = deltaEscalated + (deltaRecovered - baselineRecovered);


      // Update cumulative totals (based on current mode)
      cumulativeTotals.current = {
        active: cumulativeTotals.current.active + deltaActive,
        recovered: cumulativeTotals.current.recovered + deltaRecovered,
        escalated: cumulativeTotals.current.escalated + deltaEscalated,
      };

      lastStats.current = {
        active: stats.active,
        recovered: stats.recovered,
        escalated: stats.escalated,
      };

      // Unified history point (for main chart)
      const newPoint: ChartDataPoint = {
        time: timePoint,
        active: deltaActive,
        recovered: deltaRecovered,
        escalated: deltaEscalated,
        cumulativeActive: cumulativeTotals.current.active,
        cumulativeRecovered: cumulativeTotals.current.recovered,
        cumulativeEscalated: cumulativeTotals.current.escalated,
      };

      // STABLE mode point for comparison
      const stablePoint: ChartDataPoint = {
        time: timePoint,
        active: deltaActive,
        recovered: stableRecovered,
        escalated: stableEscalated,
        cumulativeActive: cumulativeTotals.current.active,
        cumulativeRecovered: cumulativeTotals.current.recovered + stableRecovered - deltaRecovered,
        cumulativeEscalated: cumulativeTotals.current.escalated + stableEscalated - deltaEscalated,
      };

      // Baseline mode point for comparison
      const baselinePoint: ChartDataPoint = {
        time: timePoint,
        active: deltaActive,
        recovered: baselineRecovered,
        escalated: baselineEscalated,
        cumulativeActive: cumulativeTotals.current.active,
        cumulativeRecovered: cumulativeTotals.current.recovered + baselineRecovered - deltaRecovered,
        cumulativeEscalated: cumulativeTotals.current.escalated + baselineEscalated - deltaEscalated,
      };

      // Add to UNIFIED history (for main chart)
      setHistory(prev => {
        const updated = [...prev, newPoint];
        if (updated.length > 200) return updated.slice(-200);
        return updated;
      });

      // Add to BOTH mode-specific histories (for comparison mode)
      setStableHistory(prev => {
        const updated = [...prev, stablePoint];
        if (updated.length > 200) return updated.slice(-200);
        return updated;
      });

      setBaselineHistory(prev => {
        const updated = [...prev, baselinePoint];
        if (updated.length > 200) return updated.slice(-200);
        if (updated.length > 200) return updated.slice(-200);
        return updated;
      });

      // Update Agency Histories (Simulation)
      setAgencyHistory(prev => {
        const next = { ...prev };
        const agencies = Object.keys(next);

        agencies.forEach((agency, i) => {
          // Distribute global activity with some variance
          // Use hash of time+agency to make deterministic random noise
          const noise = Math.random();

          // Agency-specific bias
          const efficiency = i === 0 ? 0.8 : i === 1 ? 0.6 : i === 2 ? 0.4 : 0.9; // Different efficiencies

          // Share of activity (approx 25% each but varied)
          const shareFn = (val: number) => Math.floor(val * (0.2 + noise * 0.1));

          const agencyActive = shareFn(deltaActive);
          const agencyRecovered = shareFn(isStableMode ? stableRecovered : baselineRecovered);

          // Lower efficiency agencies escalate more
          // const escFactor = isStableMode ? 0.1 : (1 - efficiency); // Unused
          const agencyEscalated = Math.max(0, Math.floor(deltaEscalated * 0.25 + (noise > efficiency ? 1 : 0)));

          const pt: ChartDataPoint = {
            time: timePoint,
            active: agencyActive,
            recovered: agencyRecovered,
            escalated: agencyEscalated,
            cumulativeActive: 0, cumulativeRecovered: 0, cumulativeEscalated: 0 // Not used for heatmap cells
          };

          next[agency] = [...(next[agency] || []), pt].slice(-100);
        });
        return next;
      });
    } catch (e) {
      console.error("Failed to fetch system stats", e);
    }
  }, [isStableMode, governanceSettings]);

  const handleIngestMock = async () => {
    await ingestMockAccount();
    // Quick refresh for responsiveness
    setTimeout(() => {
      loadAccounts();
      loadStats();
    }, 500);
  };

  useEffect(() => {
    // Poll Table & Stats
    loadAccounts();
    loadStats();
    const interval = setInterval(() => {
      loadAccounts();
      loadStats();
    }, 2000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Auto-Ingestion Loop for Simulation Mode (with variance)
  useEffect(() => {
    let simulationInterval: NodeJS.Timeout;
    if (isPlaying) {
      simulationInterval = setInterval(async () => {
        // Random burst: ingest 0-3 accounts per cycle for variance
        const burstCount = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
        for (let i = 0; i < burstCount; i++) {
          await ingestMockAccount();
        }
      }, 2000);
    }
    return () => clearInterval(simulationInterval);
  }, [isPlaying]);



  return (
    <>
      <div className="space-y-6 flex flex-col pb-8">
        <div className="flex items-center justify-between flex-none">
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">
            System Behavior
          </h2>
          <div className="flex gap-2 items-center">
            {/* View Mode Selector */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="gap-2 text-slate-300 border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                {VIEW_MODE_LABELS[viewMode]}
                <ChevronDown className="w-3 h-3" />
              </Button>
              {showViewDropdown && (
                <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[160px]">
                  {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { setViewMode(mode); setShowViewDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${viewMode === mode ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300'}`}
                    >
                      {VIEW_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleIngestMock}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
            >
              <Plus className="w-4 h-4" /> Ingest Mock Data
            </Button>
            <Button size="sm" variant="ghost" onClick={loadAccounts} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-none">

          {/* Row 1: Flow Chart (Full Width) */}
          <div className="h-[350px] w-full">
            <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden group h-full">
              <div className="absolute top-1.5 right-5 z-10 flex gap-2 items-center">
                <span className={`text-xs font-medium ${isStableMode ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isStableMode ? 'Convergence Active' : 'Baseline Variance'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 ml-2"
                  onClick={() => setShowFullscreen(true)}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="h-full w-full">
                <PortfolioFlowChart
                  isStableMode={isStableMode}
                  data={history}
                  viewMode={viewMode}
                />
              </div>
            </Card>
          </div>

          {/* Row 2: Secondary Charts (Split) */}
          <div className="h-[260px] grid grid-cols-2 gap-4 w-full">
            <Card className="bg-slate-900 border-slate-800 p-4 h-full relative group">
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700"
                  onClick={() => setShowFullscreenHeatmap(true)}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <DCABehaviorHeatmap isStableMode={isStableMode} history={history} agencyData={agencyHistory} />
            </Card>
            <Card className="bg-slate-900 border-slate-800 p-4 h-full relative group">
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700"
                  onClick={() => setShowFullscreenRecoveryVariance(true)}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <RecoveryPerformanceChart />
            </Card>
          </div>
        </div >

        {/* Live Account Feed */}
        < GlobalCaseList accounts={accounts} />
      </div >

      {/* Fullscreen Chart Modal */}
      < FullscreenChartModal
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        isStableMode={isStableMode}
        stableHistory={stableHistory}
        baselineHistory={baselineHistory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <FullscreenHeatmapModal
        isOpen={showFullscreenHeatmap}
        onClose={() => setShowFullscreenHeatmap(false)}
        isStableMode={isStableMode}
        history={history}
        agencyData={agencyHistory}
      />

      <FullscreenRecoveryVarianceModal
        isOpen={showFullscreenRecoveryVariance}
        onClose={() => setShowFullscreenRecoveryVariance(false)}
        isStableMode={isStableMode}
        history={history}
      />
    </>
  );

};

export default SystemBehavior;
