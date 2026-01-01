import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
}

interface Props {
  data: DataPoint[];
  stacked100?: boolean;
}

const StackedAreaChart = ({ data, stacked100 = false }: Props) => {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Transform data for 100% stacked view if needed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    if (stacked100) {
      return data.map(d => {
        const total = d.active + d.recovered + d.escalated || 1;
        return {
          time: d.time,
          active: (d.active / total) * 100,
          recovered: (d.recovered / total) * 100,
          escalated: (d.escalated / total) * 100,
          _rawActive: d.active,
          _rawRecovered: d.recovered,
          _rawEscalated: d.escalated,
        };
      });
    }
    
    return data.map(d => ({
      ...d,
      _rawActive: d.active,
      _rawRecovered: d.recovered,
      _rawEscalated: d.escalated,
    }));
  }, [data, stacked100]);

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
        <div className="font-medium text-slate-200 mb-2">Time: {label}</div>
        <div className="space-y-1">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-slate-400 capitalize">{p.dataKey}:</span>
              </span>
              <span className="text-white">
                {stacked100 
                  ? `${p.value.toFixed(1)}% (${p.payload[`_raw${p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}`]})`
                  : p.value.toFixed(0)
                }
              </span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between text-slate-300">
            <span>Total:</span>
            <span>{stacked100 ? '100%' : total.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <div className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-2">
        <span>Stacked Area Chart</span>
        {stacked100 && <span className="text-blue-400">(100% Normalized)</span>}
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="gradRecovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="gradEscalated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#334155' }}
            domain={stacked100 ? [0, 100] : ['auto', 'auto']}
            tickFormatter={(v) => stacked100 ? `${v}%` : v}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            onClick={(e) => toggleSeries(e.dataKey as string)}
            formatter={(value) => (
              <span className={`text-xs cursor-pointer ${hiddenSeries.has(value) ? 'opacity-40' : ''}`}>
                {value}
              </span>
            )}
          />
          {!hiddenSeries.has('active') && (
            <Area
              type="monotone"
              dataKey="active"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#gradActive)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
          {!hiddenSeries.has('recovered') && (
            <Area
              type="monotone"
              dataKey="recovered"
              stackId="1"
              stroke="#10b981"
              fill="url(#gradRecovered)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
          {!hiddenSeries.has('escalated') && (
            <Area
              type="monotone"
              dataKey="escalated"
              stackId="1"
              stroke="#ef4444"
              fill="url(#gradEscalated)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedAreaChart;
