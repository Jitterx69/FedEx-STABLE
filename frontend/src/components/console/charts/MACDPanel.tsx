import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { MACDResult } from '@/utils/chartAnalytics';

interface Props {
  data: MACDResult[];
  height?: number;
}

const MACDPanel: React.FC<Props> = ({ data, height = 96 }) => {
  if (!data || data.length === 0) return null;

  // Calculate domain for Y-axis to ensure 0 is centered or appropriately placed
  // We need to account for both histogram and lines
  const allValues = data.flatMap(d => [
    d.macd, 
    d.signal, 
    d.histogram
  ].filter(v => !isNaN(v)));
  
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
  
  // Create symmetric domain for better visualization of zero line
  const domain = [-absMax, absMax];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-2 flex flex-col" style={{ height }}>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] text-slate-400 font-medium">MACD (12,26,9)</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-blue-500" />
            <span className="text-slate-400">MACD</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-orange-500" />
            <span className="text-slate-400">Signal</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/50" />
            <div className="w-2 h-2 rounded-sm bg-red-500/50" />
            <span className="text-slate-400">Hist</span>
          </span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <YAxis 
              hide 
              domain={domain} 
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            
            <Bar dataKey="histogram" barSize={4} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.histogram >= 0 ? '#10b981' : '#ef4444'} 
                  opacity={0.5}
                />
              ))}
            </Bar>
            
            <Line 
              type="monotone" 
              dataKey="macd" 
              stroke="#3b82f6" 
              strokeWidth={1.5} 
              dot={false}
              isAnimationActive={false}
            />
            
            <Line 
              type="monotone" 
              dataKey="signal" 
              stroke="#f97316" 
              strokeWidth={1.5} 
              dot={false}
              isAnimationActive={false}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload as MACDResult;
                return (
                  <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 shadow-xl text-[10px] space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-blue-400">MACD</span>
                      <span className="font-mono text-slate-200">{d.macd?.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-orange-400">Signal</span>
                      <span className="font-mono text-slate-200">{d.signal?.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                      <span className={d.histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}>Hist</span>
                      <span className={`font-mono ${d.histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {d.histogram?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MACDPanel;
