import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PortfolioFlowChart from "./charts/PortfolioFlowChart";
import DCABehaviorHeatmap from "./charts/DCABehaviorHeatmap";
import RecoveryVarianceChart from "./charts/RecoveryVarianceChart";
import FullscreenChartModal from "./FullscreenChartModal";
import { fetchAccounts, Account, ingestMockAccount, fetchSystemStats } from "../../api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, ChevronDown, ArrowUpRight } from "lucide-react";
import FullscreenHeatmapModal from "./charts/FullscreenHeatmapModal";

interface SystemBehaviorProps {
  isStableMode: boolean;
  isPlaying: boolean;
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

const SystemBehavior = ({ isStableMode, isPlaying }: SystemBehaviorProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  // Unified history for main chart (shows all data regardless of mode)
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  // Separate histories for comparison mode
  const [stableHistory, setStableHistory] = useState<ChartDataPoint[]>([]);
  const [baselineHistory, setBaselineHistory] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showFullscreenHeatmap, setShowFullscreenHeatmap] = useState(false);
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
  
  const loadStats = async () => {
      try {
          const stats = await fetchSystemStats();
          const timePoint = dataPointIndex.current++;

          // Calculate delta
          let deltaActive = 0;

          if (lastStats.current) {
            deltaActive = stats.active - lastStats.current.active;
          }
          
          // Simulate BOTH modes simultaneously for comparison feature
          let stableRecovered = 0;
          let stableEscalated = 0;
          let baselineRecovered = 0;
          let baselineEscalated = 0;

          if (deltaActive > 0) {
            // STABLE: Higher recovery, lower escalation
            stableRecovered = Math.floor(Math.random() * (deltaActive + 1)) + Math.floor(Math.random() * 2);
            stableEscalated = Math.floor(Math.random() * 2);
            
            // Baseline: Lower recovery, higher escalation
            baselineRecovered = Math.floor(Math.random() * 2);
            baselineEscalated = Math.floor(Math.random() * (deltaActive + 1)) + Math.floor(Math.random() * 2);
          }

          // Use current mode values for unified history
          const deltaRecovered = isStableMode ? stableRecovered : baselineRecovered;
          const deltaEscalated = isStableMode ? stableEscalated : baselineEscalated;
          
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
                 const escFactor = isStableMode ? 0.1 : (1 - efficiency);
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
  };

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
  }, []);

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
              <Plus className="w-4 h-4"/> Ingest Mock Data
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
                  onExpand={() => setShowFullscreen(true)}
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
           <Card className="bg-slate-900 border-slate-800 p-4 h-full">
              <RecoveryVarianceChart isStableMode={isStableMode} history={history} />
           </Card>
        </div>
      </div>

      {/* Live Account Feed */}
      <Card className="bg-slate-900 border-slate-800 flex-1 min-h-[400px] flex flex-col">
         <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-sm font-medium text-slate-400">Live Account Feed (Read-Path Projection)</h3>
            <Badge variant="secondary" className="text-xs">{accounts.length} Active</Badge>
         </div>
         <div className="flex-1 overflow-auto">
           <table className="w-full text-left text-xs">
             <thead className="bg-slate-950 sticky top-0 bg-opacity-90 backdrop-blur-sm z-10">
               <tr>
                 <th className="p-3 font-medium text-slate-500">Account ID</th>
                 <th className="p-3 font-medium text-slate-500 text-right">Balance</th>
                 <th className="p-3 font-medium text-slate-500 text-center">DoPD</th>
                 <th className="p-3 font-medium text-slate-500">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {Array.isArray(accounts) && accounts.map((acc) => (
                 <tr key={acc.account_id} className="hover:bg-slate-800/50 transition-colors">
                   <td className="p-3 font-mono text-slate-300">{acc.account_id}</td>
                   <td className="p-3 text-right text-slate-300">${acc.outstanding_balance.toFixed(2)}</td>
                   <td className="p-3 text-center text-slate-400">{acc.days_past_due}</td>
                   <td className="p-3">
                     <Badge variant="outline" className={
                        acc.status === 'ingested' ? 'text-blue-400 border-blue-400/20' :
                        acc.status === 'assigned' ? 'text-emerald-400 border-emerald-400/20' :
                        'text-slate-500'
                     }>
                       {acc.status}
                     </Badge>
                   </td>
                 </tr>
               ))}
               {accounts.length === 0 && (
                 <tr>
                   <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                     No active accounts in projection.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </Card>
    </div>

      {/* Fullscreen Chart Modal */}
      <FullscreenChartModal
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
    </>
  );

};

export default SystemBehavior;
