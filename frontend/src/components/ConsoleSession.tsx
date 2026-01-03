import { useState, useEffect, useMemo } from 'react';
import SystemBehavior from './console/SystemBehavior';
import GovernanceControls from './console/GovernanceControls';
import { Badge } from "@/components/ui/badge";
import { Play, Save } from "lucide-react";

// Governance Settings Interface
export interface GovernanceSettings {
   // Information Controller
   sharpness: number;           // 0-100: Higher = cleaner signal
   noise: number;               // 0-100: Higher = more randomness
   signalDecay: number;         // 0-100: Rate at which signals fade
   confidenceThreshold: number; // 0-100: Minimum confidence to act
   granularity: 'coarse' | 'medium' | 'fine';

   // Incentive Controller
   incentiveGradient: number;   // 0-100: Higher = better recovery
   recoveryBonus: number;       // 0-100: Bonus multiplier for fast recovery
   penaltySeverity: number;     // 0-100: How harsh penalties are
   escalationThreshold: number; // 0-100: When to escalate issues
   slaStrictness: number;       // 0-100: Higher = stricter escalation

   // Policy Engine
   updateRate: 'static' | 'smoothed' | 'reactive';
   auditFrequency: number;      // 0-100: How often to audit
   riskTolerance: number;       // 0-100: Higher = more risk allowed
   batchSize: number;           // 1-100: Transaction batch size

   // Resource Allocation
   threadPoolSize: number;      // 1-100: Concurrent processing threads
   memoryBuffer: number;        // 0-100: Memory allocation percentage
   queueDepth: number;          // 1-100: Max queue depth

   // Compliance & Monitoring
   regulatoryMode: 'strict' | 'balanced' | 'flexible';
   auditTrailDepth: number;     // 0-100: History retention depth
   alertSensitivity: number;    // 0-100: How sensitive alerts are
}

const DEFAULT_GOVERNANCE: GovernanceSettings = {
   // Information Controller
   sharpness: 80,
   noise: 10,
   signalDecay: 25,
   confidenceThreshold: 60,
   granularity: 'medium',

   // Incentive Controller
   incentiveGradient: 65,
   recoveryBonus: 50,
   penaltySeverity: 40,
   escalationThreshold: 75,
   slaStrictness: 70,

   // Policy Engine
   updateRate: 'smoothed',
   auditFrequency: 50,
   riskTolerance: 35,
   batchSize: 25,

   // Resource Allocation
   threadPoolSize: 50,
   memoryBuffer: 60,
   queueDepth: 40,

   // Compliance & Monitoring
   regulatoryMode: 'balanced',
   auditTrailDepth: 70,
   alertSensitivity: 55,
};

interface ConsoleSessionProps {
   id: string;
   isActive: boolean;
   isMuted?: boolean; // When true, simulation is paused for this tab
   onTitleChange?: (title: string) => void;
   initialState?: {
      isStableMode: boolean;
      isPlaying: boolean;
   };
   initialGovernanceSettings?: GovernanceSettings;
}

export default function ConsoleSession({ isActive, isMuted, onTitleChange, initialState, initialGovernanceSettings }: ConsoleSessionProps) {
   const [isStableMode, setIsStableMode] = useState(initialState?.isStableMode ?? false);
   const [isPlaying, setIsPlaying] = useState(initialState?.isPlaying ?? false);
   const [governanceSettings, setGovernanceSettings] = useState<GovernanceSettings>(initialGovernanceSettings ?? DEFAULT_GOVERNANCE);

   // Effective playing state (respects mute)
   const effectiveIsPlaying = isPlaying && !isMuted;

   // Compute Stability Index from governance settings
   const stabilityIndex = useMemo(() => {
      // Discrete settings scores
      const granularityScore = governanceSettings.granularity === 'fine' ? 90 :
         governanceSettings.granularity === 'medium' ? 60 : 30;
      const updateRateScore = governanceSettings.updateRate === 'reactive' ? 90 :
         governanceSettings.updateRate === 'smoothed' ? 70 : 40;
      const regulatoryScore = governanceSettings.regulatoryMode === 'strict' ? 90 :
         governanceSettings.regulatoryMode === 'balanced' ? 60 : 30;

      // Weighted sum of all parameters (weights sum to 1.0)
      const index = (
         // Information Controller (25%)
         (governanceSettings.sharpness * 0.08) +
         ((100 - governanceSettings.noise) * 0.06) +
         ((100 - governanceSettings.signalDecay) * 0.04) +
         (governanceSettings.confidenceThreshold * 0.04) +
         (granularityScore * 0.03) +

         // Incentive Controller (25%)
         (governanceSettings.incentiveGradient * 0.06) +
         (governanceSettings.recoveryBonus * 0.05) +
         ((100 - governanceSettings.penaltySeverity) * 0.04) +
         (governanceSettings.escalationThreshold * 0.05) +
         (governanceSettings.slaStrictness * 0.05) +

         // Policy Engine (20%)
         (updateRateScore * 0.05) +
         (governanceSettings.auditFrequency * 0.05) +
         ((100 - governanceSettings.riskTolerance) * 0.05) +
         (governanceSettings.batchSize * 0.05) +

         // Resource Allocation (15%)
         (governanceSettings.threadPoolSize * 0.05) +
         (governanceSettings.memoryBuffer * 0.05) +
         (governanceSettings.queueDepth * 0.05) +

         // Compliance (15%)
         (regulatoryScore * 0.05) +
         (governanceSettings.auditTrailDepth * 0.05) +
         (governanceSettings.alertSensitivity * 0.05)
      ) / 100;

      return Math.min(1, Math.max(0, index));
   }, [governanceSettings]);

   // Get stability color based on index
   const stabilityColor = useMemo(() => {
      if (stabilityIndex >= 0.7) return 'text-emerald-400';
      if (stabilityIndex >= 0.5) return 'text-amber-400';
      return 'text-red-400';
   }, [stabilityIndex]);

   // Compute real-time impact metrics for display
   const impactMetrics = useMemo(() => {
      // Calculate recovery boost percentage
      const incentiveBoost = 1 + (governanceSettings.incentiveGradient / 100) * 0.6;
      const recoveryBonusMultiplier = 1 + (governanceSettings.recoveryBonus / 100) * 0.5;
      const granularityMultiplier = governanceSettings.granularity === 'fine' ? 1.3 :
         governanceSettings.granularity === 'medium' ? 1.0 : 0.7;
      const processingCapacity = 0.6 + (governanceSettings.threadPoolSize / 100) * 0.8;
      const recoveryMultiplier = incentiveBoost * recoveryBonusMultiplier * granularityMultiplier * processingCapacity;
      const recoveryBoostPercent = Math.round((recoveryMultiplier - 1) * 100);

      // Calculate escalation reduction percentage
      const escalationThresholdFactor = 1 - (governanceSettings.escalationThreshold / 100) * 0.5;
      const slaComplianceFactor = 1 - (governanceSettings.slaStrictness / 100) * 0.4;
      const auditEffectiveness = 1 - (governanceSettings.auditFrequency / 100) * 0.2;
      const escalationMultiplier = escalationThresholdFactor * slaComplianceFactor * auditEffectiveness;
      const escalationReductionPercent = Math.round((1 - escalationMultiplier) * 100);

      // Calculate system efficiency
      const batchThroughput = 0.7 + (governanceSettings.batchSize / 100) * 0.6;
      const queueEfficiency = 0.7 + (governanceSettings.queueDepth / 100) * 0.5;
      const memoryEfficiency = 0.5 + (governanceSettings.memoryBuffer / 100) * 0.5;
      const systemEfficiency = Math.round((batchThroughput * queueEfficiency * memoryEfficiency) * 100);

      return {
         recoveryBoost: recoveryBoostPercent,
         escalationReduction: escalationReductionPercent,
         systemEfficiency: systemEfficiency
      };
   }, [governanceSettings]);

   // Notify parent of title change based on mode
   useEffect(() => {
      const title = isStableMode ? "STABLE Console" : "Baseline Console";
      onTitleChange?.(title);
   }, [isStableMode, onTitleChange]);

   // Handles saving the current session configuration
   const handleSaveSession = () => {
      const sessionData = [{
         id: crypto.randomUUID(), // New ID for imported session
         title: isStableMode ? "STABLE Console (Saved)" : "Baseline Console (Saved)",
         key: 0,
         isPinned: false,
         isMuted: false,
         color: 'default',
         initialState: {
            isStableMode,
            isPlaying: false // Don't auto-play on load
         },
         governanceSettings
      }];

      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stable-session-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); // Required for Firefox/Chrome to trigger download correctly
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
   };


   return (
      <div className={`flex h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans ${!isActive ? 'hidden' : ''}`}>

         {/* Left Sidebar: Governance Controls */}
         <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900/50">
            <div className="flex-none p-4 border-b border-slate-800">
               <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white">STABLE</h2>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wider">STRATEGIC TRANSACTION & ACCOUNT BALANCE LIFECYCLE ENGINE</p>
               </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
               <GovernanceControls
                  isStableMode={isStableMode}
                  settings={governanceSettings}
                  onSettingsChange={setGovernanceSettings}
               />
            </div>

            {/* Stability Index & Impact Metrics Display */}
            <div className="flex-none p-4 pb-8 border-t border-slate-800 bg-slate-900/30 space-y-4">
               {/* Main Stability Index */}
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stability Index</span>
                     <span className={`text-3xl font-bold tabular-nums ${stabilityColor}`}>
                        {stabilityIndex.toFixed(2)}
                     </span>
                  </div>

                  {/* Animated Progress Ring */}
                  <div className="relative w-14 h-14">
                     <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        {/* Background circle */}
                        <circle
                           cx="28"
                           cy="28"
                           r="24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="4"
                           className="text-slate-800"
                        />
                        {/* Progress circle */}
                        <circle
                           cx="28"
                           cy="28"
                           r="24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="4"
                           strokeLinecap="round"
                           className={stabilityColor}
                           strokeDasharray={`${stabilityIndex * 150.8} 150.8`}
                           style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${stabilityColor}`}>
                           {Math.round(stabilityIndex * 100)}%
                        </span>
                     </div>
                  </div>
               </div>

               {/* Impact Metrics Grid */}
               <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/50">
                  <div className="text-center">
                     <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Recovery</div>
                     <div className={`text-lg font-bold tabular-nums ${impactMetrics.recoveryBoost > 50 ? 'text-emerald-400' : impactMetrics.recoveryBoost > 20 ? 'text-amber-400' : 'text-slate-400'}`}>
                        +{impactMetrics.recoveryBoost}%
                     </div>
                  </div>
                  <div className="text-center border-x border-slate-800/50">
                     <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Escalation</div>
                     <div className={`text-lg font-bold tabular-nums ${impactMetrics.escalationReduction > 40 ? 'text-emerald-400' : impactMetrics.escalationReduction > 20 ? 'text-amber-400' : 'text-slate-400'}`}>
                        -{impactMetrics.escalationReduction}%
                     </div>
                  </div>
                  <div className="text-center">
                     <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Efficiency</div>
                     <div className={`text-lg font-bold tabular-nums ${impactMetrics.systemEfficiency > 80 ? 'text-emerald-400' : impactMetrics.systemEfficiency > 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {impactMetrics.systemEfficiency}%
                     </div>
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
                     <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 hover:bg-slate-800 rounded-md hover:text-white transition-colors"
                        title={isPlaying ? "Pause Simulation" : "Play Simulation"}
                     >
                        {isPlaying ? (
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pause w-5 h-5"><rect width="4" height="16" x="6" y="4" /><rect width="4" height="16" x="14" y="4" /></svg>
                        ) : (
                           <Play className="w-5 h-5" />
                        )}
                     </button>

                     {/* Save Session Button */}
                     <button
                        onClick={handleSaveSession}
                        className="p-2 hover:bg-slate-800 rounded-md hover:text-white transition-colors"
                        title="Save Session"
                     >
                        <Save className="w-5 h-5" />
                     </button>
                  </div>
               </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-auto p-6 bg-slate-950/30">
               <div className="h-full flex flex-col">
                  {/* System Behavior (contains all metrics and charts) */}
                  <div className="flex-1 min-h-0">
                     <SystemBehavior
                        isStableMode={isStableMode}
                        isPlaying={effectiveIsPlaying}
                        governanceSettings={governanceSettings}
                     />
                  </div>
               </div>
            </main>

            {/* Bottom Status Bar */}
            <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center px-4 justify-between text-[10px] text-slate-500 flex-none select-none">
               <div className="flex items-center gap-4">
                  <span>Live Account Feed (Read-Path Projection)</span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     <span className="text-slate-400">System Healthy</span>
                  </div>
                  <Badge variant="outline" className="h-5 px-1.5 text-[9px] border-slate-700 text-slate-400">
                     50 Active
                  </Badge>
               </div>
            </footer>
         </div>
      </div>
   );
}
