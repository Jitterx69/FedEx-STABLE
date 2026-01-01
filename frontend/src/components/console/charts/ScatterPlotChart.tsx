import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { pearsonCorrelation, linearRegression } from '@/utils/chartAnalytics';

interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
}

interface Props {
  data: DataPoint[];
  xMetric?: 'active' | 'recovered' | 'escalated';
  yMetric?: 'active' | 'recovered' | 'escalated';
}

const METRIC_COLORS = {
  active: '#3b82f6',
  recovered: '#10b981',
  escalated: '#ef4444',
};

const ScatterPlotChart = ({ 
  data, 
  xMetric: initialXMetric = 'active', 
  yMetric: initialYMetric = 'recovered' 
}: Props) => {
  const [xMetric, setXMetric] = useState(initialXMetric);
  const [yMetric, setYMetric] = useState(initialYMetric);
  const [showTrendLine, setShowTrendLine] = useState(true);

  const { scatterData, correlation, regression, domain } = useMemo(() => {
    if (!data || data.length === 0) {
      return { 
        scatterData: [], 
        correlation: 0, 
        regression: { slope: 0, intercept: 0, rSquared: 0 },
        domain: { x: [0, 100], y: [0, 100] }
      };
    }

    const scatterData = data.map(d => ({
      x: d[xMetric],
      y: d[yMetric],
      time: d.time,
    }));

    const xVals = data.map(d => d[xMetric]);
    const yVals = data.map(d => d[yMetric]);
    
    const correlation = pearsonCorrelation(xVals, yVals);
    const regression = linearRegression(yVals);

    // Calculate proper domain
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const xPadding = (xMax - xMin) * 0.1 || 10;
    const yPadding = (yMax - yMin) * 0.1 || 10;

    return {
      scatterData,
      correlation,
      regression,
      domain: {
        x: [Math.max(0, xMin - xPadding), xMax + xPadding],
        y: [Math.max(0, yMin - yPadding), yMax + yPadding],
      }
    };
  }, [data, xMetric, yMetric]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  const getCorrelationLabel = (r: number): { text: string; color: string } => {
    const abs = Math.abs(r);
    if (abs > 0.8) return { text: 'Very Strong', color: r > 0 ? 'text-emerald-400' : 'text-red-400' };
    if (abs > 0.6) return { text: 'Strong', color: r > 0 ? 'text-emerald-400' : 'text-red-400' };
    if (abs > 0.4) return { text: 'Moderate', color: r > 0 ? 'text-blue-400' : 'text-amber-400' };
    if (abs > 0.2) return { text: 'Weak', color: 'text-slate-400' };
    return { text: 'Very Weak', color: 'text-slate-500' };
  };

  const corrLabel = getCorrelationLabel(correlation);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
        <div className="font-medium text-slate-200 mb-2">Time: {d.time}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400 capitalize">{xMetric}:</span>
            <span style={{ color: METRIC_COLORS[xMetric] }}>{d.x.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400 capitalize">{yMetric}:</span>
            <span style={{ color: METRIC_COLORS[yMetric] }}>{d.y.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-400 font-medium">
          Scatter Plot - Correlation Analysis
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <label className="flex items-center gap-1">
            <input 
              type="checkbox" 
              checked={showTrendLine}
              onChange={(e) => setShowTrendLine(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-slate-400">Trend Line</span>
          </label>
        </div>
      </div>

      {/* Axis selectors */}
      <div className="flex items-center gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">X:</span>
          <select 
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value as typeof xMetric)}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-white"
          >
            <option value="active">Active</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Y:</span>
          <select 
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value as typeof yMetric)}
            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-white"
          >
            <option value="active">Active</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        <div className="flex-1" />
        <div className={`${corrLabel.color}`}>
          r = {correlation.toFixed(3)} ({corrLabel.text})
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xMetric}
              domain={domain.x as [number, number]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#334155' }}
              label={{ 
                value: xMetric.charAt(0).toUpperCase() + xMetric.slice(1), 
                position: 'insideBottom', 
                offset: -5,
                style: { fontSize: 10, fill: METRIC_COLORS[xMetric] }
              }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yMetric}
              domain={domain.y as [number, number]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#334155' }}
              width={45}
              label={{ 
                value: yMetric.charAt(0).toUpperCase() + yMetric.slice(1), 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 10, fill: METRIC_COLORS[yMetric] }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Trend line using simple linear approach */}
            {showTrendLine && scatterData.length > 1 && (
              <ReferenceLine
                segment={[
                  { x: domain.x[0], y: regression.slope * 0 + regression.intercept },
                  { x: domain.x[1], y: regression.slope * (scatterData.length - 1) + regression.intercept }
                ]}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            
            <Scatter 
              data={scatterData} 
              fill="#8b5cf6"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
        <span>Points: {scatterData.length}</span>
        <span>R² = {(correlation * correlation).toFixed(4)}</span>
        <span>
          {correlation > 0 ? 'Positive' : correlation < 0 ? 'Negative' : 'No'} correlation
        </span>
      </div>
    </div>
  );
};

export default ScatterPlotChart;
