import { useMemo } from 'react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
}

const RecoveryVarianceChart = ({ isStableMode, history = [] }: Props) => {
  const data = useMemo(() => {
    // Take the most recent 15 data points
    const recentHistory = history.slice(-15);
    
    if (recentHistory.length === 0) {
      // No data - show empty placeholder
      return Array.from({ length: 15 }, (_, i) => ({
        name: i,
        variance: 0,
        actualVariance: 0,
        isPositive: true,
        recovered: 0,
        escalated: 0
      }));
    }
    
    // Calculate variance as (recovered - escalated)
    // Positive variance = good (more recovery than escalation)
    // Negative variance = bad (more escalation than recovery)
    return recentHistory.map((point, i) => {
      const variance = point.recovered - point.escalated;
      return {
        name: i,
        variance: Math.abs(variance) || 0.5, // Minimum height for visibility
        actualVariance: variance,
        isPositive: variance >= 0,
        recovered: point.recovered,
        escalated: point.escalated
      };
    });
  }, [history]);

  return (
    <div className="w-full h-full flex flex-col">
       <div className="text-xs text-slate-400 mb-2 font-medium">Recovery Variance (Target vs Actual)</div>
       <div className="flex-1 min-h-0">
         <ResponsiveContainer width="100%" height="100%">
           <BarChart data={data}>
             <Tooltip 
               content={({ active, payload }) => {
                 if (active && payload && payload.length) {
                   const d = payload[0].payload;
                   return (
                     <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
                       <div className="text-slate-400">Recovered: {d.recovered ?? 0}</div>
                       <div className="text-slate-400">Escalated: {d.escalated ?? 0}</div>
                       <div className={d.isPositive ? 'text-emerald-400' : 'text-red-400'}>
                         Variance: {d.actualVariance >= 0 ? '+' : ''}{d.actualVariance ?? 0}
                       </div>
                     </div>
                   );
                 }
                 return null;
               }}
             />
             <Bar dataKey="variance" radius={[2, 2, 0, 0]}>
               {data.map((entry, index) => (
                 <Cell 
                   key={`cell-${index}`} 
                   fill={entry.isPositive ? '#10b981' : '#ef4444'} 
                   fillOpacity={isStableMode ? 0.8 : 0.6}
                 />
               ))}
             </Bar>
           </BarChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
};

export default RecoveryVarianceChart;
