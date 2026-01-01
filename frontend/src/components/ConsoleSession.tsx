import React, { useState, useEffect } from 'react';
import SystemBehavior from './console/SystemBehavior';
import GovernanceControls from './console/GovernanceControls';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";

interface ConsoleSessionProps {
  id: string;
  isActive: boolean;
  onTitleChange?: (title: string) => void;
  initialState?: {
    isStableMode: boolean;
    isPlaying: boolean;
  };
}

export default function ConsoleSession({ isActive, onTitleChange, initialState }: ConsoleSessionProps) {
  const [isStableMode, setIsStableMode] = useState(initialState?.isStableMode ?? false);
  const [isPlaying, setIsPlaying] = useState(initialState?.isPlaying ?? false);

  // Notify parent of title change based on mode
  useEffect(() => {
    const title = isStableMode ? "STABLE Console" : "Baseline Console";
    onTitleChange?.(title);
  }, [isStableMode, onTitleChange]);

  return (
    <div className={`flex h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans ${!isActive ? 'hidden' : ''}`}>
      
      {/* Sidebar: Governance Controls */}
      <div className="w-[340px] flex-none border-r border-slate-800 bg-slate-950/50 flex flex-col h-full">
         <div className="p-4 border-b border-slate-800">
           <h1 className="text-xl font-bold tracking-tight">STABLE</h1>
           <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Strategic Transaction & Account Balance Lifecycle Engine</p>
         </div>
         
         <div className="flex-1 overflow-hidden">
           <GovernanceControls isStableMode={isStableMode} />
         </div>

         <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase">Stability Index</span>
                <span className="text-2xl font-bold text-amber-500">0.59</span>
              </div>
              
               <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-amber-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold">59%</span>
               </div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
         {/* Top Header */}
         <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 flex-none">
            <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
               <button 
                  onClick={() => setIsStableMode(false)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!isStableMode ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 Baseline System
               </button>
               <button 
                  onClick={() => setIsStableMode(true)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${isStableMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 STABLE Enabled
               </button>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`bg-slate-900 border-slate-700 font-mono ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                    {isPlaying ? 'Simulation Running' : 'Simulation Paused'}
                  </Badge>
               </div>
               <div className="flex items-center gap-2 text-slate-400">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white transition-colors">
                      {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pause w-5 h-5"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>
                      ) : (
                          <Play className="w-5 h-5" />
                      )}
                  </button>

               </div>
            </div>
         </header>

         {/* Dashboard Content */}
         <main className="flex-1 overflow-auto p-6 bg-slate-950/30">
            <div className="h-full flex flex-col">
               <div className="flex items-center justify-between mb-2"> 
                  <div className="ml-auto text-xs text-slate-500 font-mono tracking-wide">
                     {isStableMode ? 'STABLE Mode Active' : 'Baseline Mode Active'}
                  </div>
               </div>
               
               <div className="flex-1 min-h-0">
                  <SystemBehavior isStableMode={isStableMode} isPlaying={isPlaying} />
               </div>
            </div>
         </main>
      </div>

    </div>
  );
}
