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
  showSparklines?: boolean; // Added
  onColumnSelect?: (index: number) => void; // Added
}

// Helper to calculate efficiency sparkline path
const calculateSparklinePath = (data: (ChartDataPoint | null)[], width: number, height: number): string => {
  const validPoints: { x: number; efficiency: number }[] = [];

  data.forEach((point, i) => {
    if (point) {
      const total = point.recovered + point.escalated;
      // Efficiency = recovered / (recovered + escalated), default to 0.5 if no data
      const efficiency = total > 0 ? point.recovered / total : 0.5;
      validPoints.push({
        x: (i / (data.length - 1)) * width,
        efficiency
      });
    }
  });

  if (validPoints.length < 2) return '';

  // Create smooth path
  const pathPoints = validPoints.map((p, i) => {
    const y = height - (p.efficiency * height * 0.8) - height * 0.1; // 80% height usage with 10% padding
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return pathPoints.join(' ');
};

// Calculate average efficiency for color coding
const calculateAvgEfficiency = (data: (ChartDataPoint | null)[]): number => {
  let totalEff = 0;
  let count = 0;
  data.forEach(point => {
    if (point) {
      const total = point.recovered + point.escalated;
      if (total > 0) {
        totalEff += point.recovered / total;
        count++;
      }
    }
  });
  return count > 0 ? totalEff / count : 0.5;
};

const DCABehaviorHeatmap = ({ isStableMode, history = [], agencyData, isFullscreen = false, showSparklines, onColumnSelect }: Props) => {
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
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500" /> Recovery</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500" /> Escalation</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500/60" /> Active</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-around gap-1">
          {agencies.map(agency => {
            const agencyHistory = agencyData[agency] || [];
            const recent = agencyHistory.slice(-timeSteps);

            // Pad with empty data if needed to maintain alignment
            const paddedData = [...Array(Math.max(0, timeSteps - recent.length)).fill(null), ...recent];

            // Calculate sparkline data
            const avgEfficiency = showSparklines ? calculateAvgEfficiency(paddedData) : 0;
            const sparklineColor = avgEfficiency >= 0.6 ? '#10b981' : avgEfficiency >= 0.4 ? '#f59e0b' : '#ef4444';

            return (
              <div key={agency} className="flex items-center gap-2 h-full">
                <div className="w-20 flex-none text-[10px] text-slate-400 font-medium text-right truncate" title={agency}>
                  {agency}
                </div>
                <div className="flex-1 relative h-full">
                  {/* Heatmap cells */}
                  <div className="absolute inset-0 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${timeSteps}, 1fr)` }}>
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
                          onClick={() => onColumnSelect && onColumnSelect(i)}
                          className={`rounded-sm transition-all duration-500 ${color} ${onColumnSelect ? 'cursor-pointer hover:ring-1 hover:ring-white/50' : ''}`}
                          style={{ opacity: showSparklines ? opacity * 0.4 : opacity }}
                          title={`${agency} | Act: ${point.active}, Rec: ${point.recovered}, Esc: ${point.escalated}`}
                        />
                      );
                    })}
                  </div>

                  {/* Sparkline overlay */}
                  {showSparklines && paddedData.filter(Boolean).length >= 2 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <filter id={`glow-${agency.replace(/\s+/g, '-')}`}>
                          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      {/* Background glow */}
                      <path
                        d={calculateSparklinePath(paddedData, 100, 100)}
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="4"
                        strokeOpacity="0.3"
                        vectorEffect="non-scaling-stroke"
                        filter={`url(#glow-${agency.replace(/\s+/g, '-')})`}
                      />
                      {/* Main line */}
                      <path
                        d={calculateSparklinePath(paddedData, 100, 100)}
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  )}
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
