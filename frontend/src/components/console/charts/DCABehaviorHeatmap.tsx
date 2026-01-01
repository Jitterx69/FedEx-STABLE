import { useMemo } from 'react';

interface ChartDataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
  cumulativeActive: number;
  cumulativeRecovered: number;
  cumulativeEscalated: number;
}

interface Props {
  isStableMode: boolean;
  history?: ChartDataPoint[];
  // Map of Agency Name -> History Array
  agencyData?: Record<string, ChartDataPoint[]>;
  isFullscreen?: boolean;
}

const DCABehaviorHeatmap = ({ isStableMode, history = [], agencyData, isFullscreen = false }: Props) => {
  // If agency data provided, render MATRIX view
  if (agencyData && Object.keys(agencyData).length > 0) {
     const agencies = Object.keys(agencyData);
     const timeSteps = isFullscreen ? 60 : 40; // More columns in fullscreen

     return (
       <div className="w-full h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-slate-400 font-medium">Agency Performance Matrix</div>
            {isFullscreen && (
               <div className="flex gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"/> Recovery</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500"/> Escalation</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500/60"/> Active</span>
               </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-around gap-1">
             {agencies.map(agency => {
                const agencyHistory = agencyData[agency] || [];
                const recent = agencyHistory.slice(-timeSteps);
                
                // Pad with empty data if needed to maintain alignment
                const paddedData = [...Array(Math.max(0, timeSteps - recent.length)).fill(null), ...recent];

                return (
                  <div key={agency} className="flex items-center gap-2 h-full">
                     <div className="w-20 flex-none text-[10px] text-slate-400 font-medium text-right truncate" title={agency}>
                        {agency}
                     </div>
                     <div className="flex-1 grid gap-0.5 h-full" style={{ gridTemplateColumns: `repeat(${timeSteps}, 1fr)` }}>
                        {paddedData.map((point, i) => {
                          if (!point) return <div key={i} className="bg-slate-800/30 rounded-sm" />;
                          
                          let color = 'bg-slate-800/50';
                          let opacity = 0.3;
                          
                          // Determine cell color
                          if (point.escalated > point.recovered && point.escalated > 0) {
                             color = 'bg-red-500';
                             opacity = 0.5 + Math.min(point.escalated * 0.2, 0.5);
                          } else if (point.recovered > 0) {
                             color = isStableMode ? 'bg-emerald-500' : 'bg-emerald-500/80';
                             opacity = 0.5 + Math.min(point.recovered * 0.2, 0.5); 
                          } else if (point.active > 0) {
                             color = isStableMode ? 'bg-emerald-500/30' : 'bg-amber-500/50';
                             opacity = 0.3 + Math.min(point.active * 0.1, 0.4);
                          }

                          return (
                            <div 
                              key={i}
                              className={`rounded-sm transition-all duration-500 ${color}`}
                              style={{ opacity }}
                              title={`${agency} | Act: ${point.active}, Rec: ${point.recovered}, Esc: ${point.escalated}`}
                            />
                          );
                        })}
                     </div>
                  </div>
                );
             })}
          </div>
       </div>
     );
  }

  // FALLBACK: Original Global Heatmap Logic
  const heatmapData = useMemo(() => {
    const cells: { heat: number; activity: 'active' | 'recovered' | 'escalated' | 'none' }[] = [];
    const cellCount = 50;
    
    if (history.length === 0) {
      return Array.from({ length: cellCount }).map(() => ({ heat: 0, activity: 'none' as const }));
    }
    
    // Take the most recent data points (up to cellCount)
    const recentHistory = history.slice(-cellCount);
    
    // Find max values for normalization
    const maxActive = Math.max(...recentHistory.map(h => Math.abs(h.active)), 1);
    const maxRecovered = Math.max(...recentHistory.map(h => h.recovered), 1);
    const maxEscalated = Math.max(...recentHistory.map(h => h.escalated), 1);
    
    // Create cells from history data
    for (let i = 0; i < cellCount; i++) {
      if (i < recentHistory.length) {
        const point = recentHistory[i];
        // Determine primary activity for this time point
        if (point.escalated > point.recovered && point.escalated > 0) {
          cells.push({ heat: point.escalated / maxEscalated, activity: 'escalated' });
        } else if (point.recovered > 0) {
          cells.push({ heat: point.recovered / maxRecovered, activity: 'recovered' });
        } else if (point.active > 0) {
          cells.push({ heat: point.active / maxActive, activity: 'active' });
        } else {
          cells.push({ heat: 0.1, activity: 'none' });
        }
      } else {
        // Fill remaining cells with baseline activity
        cells.push({ heat: 0, activity: 'none' });
      }
    }
    
    return cells;
  }, [history]);

  const getColor = (cell: { heat: number; activity: string }) => {
    if (cell.activity === 'none' || cell.heat === 0) return 'bg-slate-800/50';
    if (cell.activity === 'recovered') return isStableMode ? 'bg-emerald-500' : 'bg-emerald-500/60';
    if (cell.activity === 'escalated') return 'bg-red-500';
    return isStableMode ? 'bg-emerald-500/40' : 'bg-amber-500/60'; // active
  };

  return (
    <div className="w-full h-full flex flex-col">
       <div className="text-xs text-slate-400 mb-2 font-medium">DCA Activity Heatmap</div>
       <div className="flex-1 grid grid-cols-10 gap-1">
          {heatmapData.map((cell, i) => (
            <div 
              key={i} 
              className={`rounded-sm transition-colors duration-500 ${getColor(cell)}`}
              style={{ opacity: cell.heat > 0 ? 0.4 + cell.heat * 0.6 : 0.3 }}
              title={cell.activity !== 'none' ? `${cell.activity}: ${Math.round(cell.heat * 100)}%` : 'No activity'}
            />
          ))}
       </div>
    </div>
  );
};

export default DCABehaviorHeatmap;
