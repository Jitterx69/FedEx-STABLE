import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
}

interface WaterfallEntry {
  name: string;
  value: number;
  start: number;
  end: number;
  isTotal?: boolean;
  isPositive?: boolean;
  fill: string;
}

interface Props {
  data: DataPoint[];
  showCumulative?: boolean;
}

const WaterfallChart = ({ data, showCumulative = true }: Props) => {
  const waterfallData = useMemo((): WaterfallEntry[] => {
    if (!data || data.length === 0) return [];

    // Aggregate the data
    const totalActive = data.reduce((sum, d) => sum + d.active, 0);
    const totalRecovered = data.reduce((sum, d) => sum + d.recovered, 0);
    const totalEscalated = data.reduce((sum, d) => sum + d.escalated, 0);

    const entries: WaterfallEntry[] = [];
    let cumulative = 0;

    // Starting point
    entries.push({
      name: 'Start',
      value: 0,
      start: 0,
      end: 0,
      isTotal: true,
      fill: '#64748b'
    });

    // Active (positive)
    entries.push({
      name: 'Active',
      value: totalActive,
      start: cumulative,
      end: cumulative + totalActive,
      isPositive: true,
      fill: '#3b82f6'
    });
    cumulative += totalActive;

    // Recovered (positive outcome, but reduces active)
    entries.push({
      name: 'Recovered',
      value: totalRecovered,
      start: cumulative,
      end: cumulative + totalRecovered,
      isPositive: true,
      fill: '#10b981'
    });
    cumulative += totalRecovered;

    // Escalated (negative outcome)
    entries.push({
      name: 'Escalated',
      value: -totalEscalated,
      start: cumulative,
      end: cumulative - totalEscalated,
      isPositive: false,
      fill: '#ef4444'
    });
    cumulative -= totalEscalated;

    // Net position
    const net = totalRecovered - totalEscalated;
    entries.push({
      name: 'Net Result',
      value: cumulative,
      start: 0,
      end: cumulative,
      isTotal: true,
      isPositive: net >= 0,
      fill: net >= 0 ? '#10b981' : '#ef4444'
    });

    return entries;
  }, [data]);

  // Calculate domain
  const domain = useMemo(() => {
    if (waterfallData.length === 0) return [0, 100];
    const allValues = waterfallData.flatMap(d => [d.start, d.end]);
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 10;
    return [Math.min(0, min - padding), max + padding];
  }, [waterfallData]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="text-xs text-slate-400 mb-2 font-medium">
        Waterfall Chart - Change Breakdown
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={waterfallData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#334155' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip showCumulative={showCumulative} />} cursor={false} />
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
          <Bar
            dataKey="value"
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          >
            {waterfallData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-blue-500" />
          <span className="text-slate-400">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-emerald-500" />
          <span className="text-slate-400">Recovered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-red-500" />
          <span className="text-slate-400">Escalated</span>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, showCumulative }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload as WaterfallEntry;

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-medium text-slate-200 mb-2">{entry.name}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Change:</span>
          <span className={entry.isPositive || entry.value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(0)}
          </span>
        </div>
        {showCumulative && !entry.isTotal && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Running Total:</span>
            <span className="text-white">{entry.end.toFixed(0)}</span>
          </div>
        )}
        {entry.isTotal && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total:</span>
            <span className="text-white">{entry.end.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterfallChart;
