import { useMemo } from 'react';


interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
}

interface Props {
  data: DataPoint[];
  cellsPerRow?: number;
}

interface Range {
  min: number;
  max: number;
}

const HeatmapTimeline = ({ data, cellsPerRow = 20 }: Props) => {
  const { heatmapData, ranges } = useMemo(() => {
    if (!data || data.length === 0) return { heatmapData: [], ranges: {} as Record<string, Range> };

    // Calculate ranges for each metric
    const activeVals = data.map(d => d.active);
    const recoveredVals = data.map(d => d.recovered);
    const escalatedVals = data.map(d => d.escalated);

    const ranges: Record<string, Range> = {
      active: { min: Math.min(...activeVals), max: Math.max(...activeVals) },
      recovered: { min: Math.min(...recoveredVals), max: Math.max(...recoveredVals) },
      escalated: { min: Math.min(...escalatedVals), max: Math.max(...escalatedVals) },
    };

    return { heatmapData: data, ranges };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  const metrics = [
    { key: 'active', label: 'Active', color: '#3b82f6' },
    { key: 'recovered', label: 'Recovered', color: '#10b981' },
    { key: 'escalated', label: 'Escalated', color: '#ef4444' },
  ] as const;

  const getCellColor = (value: number, min: number, max: number, baseColor: string): string => {
    const normalized = max === min ? 0.5 : (value - min) / (max - min);
    const opacity = 0.2 + normalized * 0.7;
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-xs text-slate-400 mb-3 font-medium">
        Heatmap Timeline - Metric Intensity Over Time
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {metrics.map(metric => {
          const range = ranges[metric.key] || { min: 0, max: 1 };

          return (
            <div key={metric.key} className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-slate-400 w-16">{metric.label}</span>
                <span className="text-[9px] text-slate-500">
                  ({range.min.toFixed(0)} - {range.max.toFixed(0)})
                </span>
              </div>
              <div
                className="flex-1 grid gap-px"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(cellsPerRow, heatmapData.length)}, 1fr)`,
                  gridAutoRows: '1fr'
                }}
              >
                {heatmapData.slice(0, 100).map((d, i) => {
                  const value = d[metric.key];

                  return (
                    <div
                      key={i}
                      className="rounded-sm cursor-default transition-transform hover:scale-110 hover:z-10 relative group"
                      style={{
                        backgroundColor: getCellColor(value, range.min, range.max, metric.color),
                        minHeight: '8px'
                      }}
                      title={`Time ${d.time}: ${value.toFixed(1)}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        T{d.time}: {value.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time axis */}
      <div className="mt-2 flex justify-between text-[9px] text-slate-500">
        <span>T{heatmapData[0]?.time || 0}</span>
        <span>→ Time →</span>
        <span>T{heatmapData[heatmapData.length - 1]?.time || 0}</span>
      </div>

      {/* Intensity legend */}
      <div className="mt-3 pt-2 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 mb-1">Intensity</div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-500">Low</span>
          <div className="flex-1 h-2 rounded flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 first:rounded-l last:rounded-r"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.1 + i * 0.09})`
                }}
              />
            ))}
          </div>
          <span className="text-[9px] text-slate-500">High</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapTimeline;
