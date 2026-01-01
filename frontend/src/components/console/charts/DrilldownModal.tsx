import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
  cumulativeActive?: number;
  cumulativeRecovered?: number;
  cumulativeEscalated?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dataPoint: DataPoint | null;
  allData: DataPoint[];
  onNavigateToAccounts?: () => void;
}

const DrilldownModal = ({ 
  isOpen, 
  onClose, 
  dataPoint, 
  allData,
  onNavigateToAccounts 
}: Props) => {
  // Calculate stats for this data point
  const stats = useMemo(() => {
    if (!dataPoint || !allData || allData.length === 0) return null;

    const index = allData.findIndex(d => d.time === dataPoint.time);
    const prevPoint = index > 0 ? allData[index - 1] : null;
    
    // Calculate changes from previous
    const changes = {
      active: prevPoint ? dataPoint.active - prevPoint.active : dataPoint.active,
      recovered: prevPoint ? dataPoint.recovered - prevPoint.recovered : dataPoint.recovered,
      escalated: prevPoint ? dataPoint.escalated - prevPoint.escalated : dataPoint.escalated,
    };

    // Calculate percentiles (where this point ranks)
    const activeVals = allData.map(d => d.active).sort((a, b) => a - b);
    const recoveredVals = allData.map(d => d.recovered).sort((a, b) => a - b);
    const escalatedVals = allData.map(d => d.escalated).sort((a, b) => a - b);
    
    const getPercentile = (val: number, sorted: number[]) => {
      const rank = sorted.findIndex(v => v >= val);
      return rank >= 0 ? ((rank / sorted.length) * 100).toFixed(0) : '0';
    };

    // Calculate moving averages at this point
    const window = 5;
    const maStart = Math.max(0, index - window + 1);
    const maSlice = allData.slice(maStart, index + 1);
    const ma = {
      active: maSlice.reduce((sum, d) => sum + d.active, 0) / maSlice.length,
      recovered: maSlice.reduce((sum, d) => sum + d.recovered, 0) / maSlice.length,
      escalated: maSlice.reduce((sum, d) => sum + d.escalated, 0) / maSlice.length,
    };

    return {
      index,
      total: allData.length,
      changes,
      percentiles: {
        active: getPercentile(dataPoint.active, activeVals),
        recovered: getPercentile(dataPoint.recovered, recoveredVals),
        escalated: getPercentile(dataPoint.escalated, escalatedVals),
      },
      movingAverage: ma,
      isAboveMA: {
        active: dataPoint.active > ma.active,
        recovered: dataPoint.recovered > ma.recovered,
        escalated: dataPoint.escalated > ma.escalated,
      }
    };
  }, [dataPoint, allData]);

  if (!isOpen || !dataPoint) return null;

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (value < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const formatChange = (value: number) => {
    if (value > 0) return `+${value}`;
    return value.toString();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Data Point Details</h3>
            <p className="text-[10px] text-slate-400">
              Time: <span className="text-white font-medium">{dataPoint.time}</span>
              {stats && <span className="ml-2">(Point {stats.index + 1} of {stats.total})</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* Primary Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'active', label: 'Active', color: 'blue', value: dataPoint.active },
              { key: 'recovered', label: 'Recovered', color: 'emerald', value: dataPoint.recovered },
              { key: 'escalated', label: 'Escalated', color: 'red', value: dataPoint.escalated },
            ] as const).map(metric => (
              <div 
                key={metric.key}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400">{metric.label}</span>
                  {stats && <TrendIcon value={stats.changes[metric.key]} />}
                </div>
                <div className={`text-xl font-bold text-${metric.color}-400`}>
                  {metric.value.toFixed(0)}
                </div>
                {stats && (
                  <div className="mt-1 text-[10px]">
                    <span className={stats.changes[metric.key] >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatChange(stats.changes[metric.key])}
                    </span>
                    <span className="text-slate-500 ml-1">from prev</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cumulative Values */}
          {(dataPoint.cumulativeActive !== undefined) && (
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-[10px] text-slate-400 mb-2">Cumulative Totals</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Active: </span>
                  <span className="text-blue-400">{dataPoint.cumulativeActive}</span>
                </div>
                <div>
                  <span className="text-slate-400">Recovered: </span>
                  <span className="text-emerald-400">{dataPoint.cumulativeRecovered}</span>
                </div>
                <div>
                  <span className="text-slate-400">Escalated: </span>
                  <span className="text-red-400">{dataPoint.cumulativeEscalated}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statistical Context */}
          {stats && (
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
              <div className="text-[10px] text-slate-400 mb-2">Statistical Context</div>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400">Active percentile: </span>
                    <span className="text-white">{stats.percentiles.active}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Recovered percentile: </span>
                    <span className="text-white">{stats.percentiles.recovered}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Escalated percentile: </span>
                    <span className="text-white">{stats.percentiles.escalated}%</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-[10px] text-slate-400">5-Point Moving Average:</span>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Active:</span>
                      <span className="text-white">{stats.movingAverage.active.toFixed(1)}</span>
                      <span className={stats.isAboveMA.active ? 'text-emerald-400' : 'text-red-400'}>
                        {stats.isAboveMA.active ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Recovered:</span>
                      <span className="text-white">{stats.movingAverage.recovered.toFixed(1)}</span>
                      <span className={stats.isAboveMA.recovered ? 'text-emerald-400' : 'text-red-400'}>
                        {stats.isAboveMA.recovered ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Escalated:</span>
                      <span className="text-white">{stats.movingAverage.escalated.toFixed(1)}</span>
                      <span className={stats.isAboveMA.escalated ? 'text-emerald-400' : 'text-red-400'}>
                        {stats.isAboveMA.escalated ? '↑' : '↓'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Click on a different point to view its details
          </span>
          {onNavigateToAccounts && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={onNavigateToAccounts}
            >
              <ExternalLink className="w-3 h-3" />
              View Accounts
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrilldownModal;
