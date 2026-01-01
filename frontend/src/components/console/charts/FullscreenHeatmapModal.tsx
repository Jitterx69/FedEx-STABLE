import React, { useState, useEffect } from 'react';
import { X, Minimize2, ChevronDown, Activity, BarChart2, Filter, Download, LineChart, Search, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DCABehaviorHeatmap from './DCABehaviorHeatmap';
import AgencyTimeSlicePanel from './AgencyTimeSlicePanel';

interface FullscreenHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStableMode: boolean;
  history: any[];
  agencyData: Record<string, any[]>; // Map of Agency Name -> History Array
}

// Reusable Dropdown (Local)
const ToolDropdown = ({ label, icon: Icon, children, isOpen, onToggle }: any) => (
  <div className="relative">
    <Button 
      size="sm" 
      variant="ghost"
      onClick={onToggle}
      className="gap-1.5 text-slate-300 hover:bg-slate-800 hover:text-white h-8 px-2.5 border border-transparent hover:border-slate-700"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
      <ChevronDown className="w-3 h-3" />
    </Button>
    {isOpen && (
      <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 min-w-[200px] py-1 animate-in fade-in zoom-in-95 duration-100">
        {children}
      </div>
    )}
  </div>
);

const FullscreenHeatmapModal = ({ 
  isOpen, 
  onClose, 
  isStableMode,
  history,
  agencyData
}: FullscreenHeatmapModalProps) => {
  const [showInfo, setShowInfo] = useState(true);
  
  // Tool States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showSparklines, setShowSparklines] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);

  // Esc key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (!(e.target as Element).closest('.relative')) {
            setActiveDropdown(null);
        }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 flex-none">
        
        {/* Left: Branding & Simple Title */}
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-100">Agency Performance Matrix</h2>
            <div className="h-4 w-px bg-slate-800" />
            
            {/* Toolbar Area */}
            <div className="flex items-center gap-1">
                {/* Visuals Menu */}
                <ToolDropdown 
                    label="Visuals" 
                    icon={Layers} 
                    isOpen={activeDropdown === 'visuals'} 
                    onToggle={() => setActiveDropdown(activeDropdown === 'visuals' ? null : 'visuals')}
                >
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Overlays
                    </div>
                    <button 
                        onClick={() => setShowSparklines(!showSparklines)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                    >
                        <div className="flex items-center gap-2">
                            <LineChart className="w-3.5 h-3.5" />
                            Efficiency Sparklines
                        </div>
                        {showSparklines && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    {/* Add more checks here later */}
                </ToolDropdown>

                {/* Analytics Menu */}
                <ToolDropdown 
                    label="Analytics" 
                    icon={Activity} 
                    isOpen={activeDropdown === 'analytics'} 
                    onToggle={() => setActiveDropdown(activeDropdown === 'analytics' ? null : 'analytics')}
                >
                     <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Inspection Tools
                    </div>
                    <button 
                        onClick={() => { setShowInspector(!showInspector); setSelectedTimeIndex(null); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                    >
                        <div className="flex items-center gap-2">
                            <Search className="w-3.5 h-3.5" />
                            Time-Slice Inspector
                        </div>
                        {showInspector && <Check className="w-3 h-3 text-blue-400" />}
                    </button>
                    <div className="my-1 border-t border-slate-700/50" />
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center gap-2 text-slate-400 opacity-50 cursor-not-allowed">
                        <BarChart2 className="w-3.5 h-3.5" /> Comparative Mode (Beta)
                    </button>
                </ToolDropdown>

                {/* Filter/Export moved to dropdown or group? User said "List common tools as a single category" */}
                {/* Let's keep a "Data" dropdown for these */}
                <ToolDropdown 
                    label="Data" 
                    icon={Download} 
                    isOpen={activeDropdown === 'data'} 
                    onToggle={() => setActiveDropdown(activeDropdown === 'data' ? null : 'data')}
                >
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center gap-2 text-slate-300">
                        <Filter className="w-3.5 h-3.5" /> Filter Agencies
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center gap-2 text-slate-300">
                        <Download className="w-3.5 h-3.5" /> Export as CSV
                    </button>
                </ToolDropdown>
            </div>
        </div>

        {/* Right: Close Controls */}
        <div className="flex items-center gap-2">
           <Badge variant="outline" className={`bg-transparent ${isStableMode ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
               {isStableMode ? 'STABLE' : 'BASELINE'}
           </Badge>
           <div className="w-px h-5 bg-slate-700 mx-2" />
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 text-slate-400 hover:text-white"
             onClick={onClose}
           >
             <Minimize2 className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Sidebar / Tools */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/30 flex-none p-4 space-y-6 overflow-y-auto">
            
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Performers</h3>
              {Object.entries(agencyData).map(([name, data]) => {
                 // Calculate simple aggregate score
                 const recovered = data.reduce((acc, curr) => acc + curr.recovered, 0);
                 const escalated = data.reduce((acc, curr) => acc + curr.escalated, 0);
                 const score = recovered - escalated;
                 return (
                   <div key={name} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                      <div>
                        <div className="text-xs font-medium text-slate-200">{name}</div>
                        <div className="text-[10px] text-slate-500">{data.length} data points</div>
                      </div>
                      <div className={`text-xs font-bold ${score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {score > 0 ? '+' : ''}{score}
                      </div>
                   </div>
                 )
              })}
            </div>

            {/* Hint Box */}
            <div className={`p-3 rounded-lg border ${isStableMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-amber-950/20 border-amber-900/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className={`w-4 h-4 ${isStableMode ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`text-xs font-medium ${isStableMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Active Status
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {isStableMode 
                  ? "Agencies are performing within optimal parameters. Recovery rates are widespread."
                  : "Detected uneven performance. Some agencies showing high escalation density."}
              </p>
            </div>
            
        </div>

        {/* Heatmap Area */}
        <div className="flex-1 bg-slate-950 p-6 overflow-hidden flex flex-col relative">
           <div className={`flex-1 bg-slate-900 rounded-lg border border-slate-800 p-4 relative transition-all duration-300 ${showInspector ? 'pb-72' : ''}`}>
              <DCABehaviorHeatmap 
                isStableMode={isStableMode} 
                history={history} 
                agencyData={agencyData}
                isFullscreen={true}
                showSparklines={showSparklines}
                onColumnSelect={(idx) => {
                    if (showInspector) setSelectedTimeIndex(idx);
                }}
              />
              
              {/* Overlay Hints if Inspector Active */}
              {showInspector && !selectedTimeIndex && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-full text-xs text-blue-300 shadow-xl animate-bounce">
                          Click any column to slice data 👆
                      </div>
                  </div>
              )}
           </div>
           
           {/* Time Slice Panel (Slides up) */}
           <AgencyTimeSlicePanel 
                isOpen={showInspector && selectedTimeIndex !== null}
                onClose={() => setSelectedTimeIndex(null)}
                timeIndex={selectedTimeIndex}
                agencyData={agencyData}
                isStableMode={isStableMode}
           />
        </div>
      </div>
    </div>
  );
};

export default FullscreenHeatmapModal;
