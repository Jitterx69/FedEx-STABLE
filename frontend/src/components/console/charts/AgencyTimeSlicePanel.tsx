import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { X, Clock } from 'lucide-react';

interface AgencyTimeSlicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  timeIndex: number | null;
  agencyData: Record<string, any[]>;
  isStableMode: boolean;
}

const AgencyTimeSlicePanel = ({ isOpen, onClose, timeIndex, agencyData, isStableMode }: AgencyTimeSlicePanelProps) => {
  if (!isOpen || timeIndex === null) return null;

  // Transform data for the specific time slice
  const agencies = Object.keys(agencyData);
  const chartData = agencies.map(agency => {
    // Get the data point at the specific index (from the end, as heatmap usually shows slice)
    // NOTE: We need to coordinate with the parent on how 'timeIndex' maps to the array.
    // Assuming timeIndex 0 is the oldest visible, N is newest.
    // But usually heatmap data is passed as a sliced array.
    // Let's assume the parent passes the EXACT point matching the clicked column index.
    
    // For safety, let's grab the point based on the passed index relative to the rendered view
    // The parent renders `recent` array.
    
    const history = agencyData[agency] || [];
    // We'll rely on the parent data matching the visual index.
    // If the visual index is `i`, it corresponds to `history[history.length - (totalSteps - i)]`? 
    // Actually, simpler: The parent should probably resolve the exact data object before passing?
    // But passing the whole structure gives us context if we want to show trends.
    // Let's assume the parent passes the processed "slice" of data that interacts with the index.
    
    // Use a placeholder lookup for now, parent will need to ensure alignment.
    // We will assume `timeIndex` is an index into the `agencyData[agency]` array derived in the parent.
    const point = history[timeIndex]; 
    if (!point) return null;

    return {
      name: agency,
      Recovered: point.recovered,
      Escalated: point.escalated,
      Active: point.active,
      Efficiency: point.recovered / (point.recovered + point.escalated || 1) * 100
    };
  }).filter(Boolean);

  return (
    <div className="absolute bottom-4 left-4 right-4 h-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-40 flex flex-col animate-in slide-in-from-bottom-5 fade-in">
        <div className="h-10 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 rounded-t-lg">
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">
                    Time Slice Analysis (T-{timeIndex})
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">
                    Comparative Breakdown
                </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
        
        <div className="flex-1 p-4 flex gap-4">
            <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="#64748b" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                            itemStyle={{ fontSize: '11px' }}
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="Recovered" stackId="a" fill="#10b981" barSize={12} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Escalated" stackId="a" fill="#ef4444" barSize={12} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            {/* Quick Stats Side Panel */}
            <div className="w-48 border-l border-slate-800 pl-4 flex flex-col justify-center space-y-4">
                {chartData.map((d: any) => (
                    <div key={d.name} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{d.name}</span>
                            <span className={d.Efficiency > 50 ? 'text-emerald-400' : 'text-amber-400'}>
                                {d.Efficiency.toFixed(0)}% Eff.
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${d.Efficiency}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default AgencyTimeSlicePanel;
