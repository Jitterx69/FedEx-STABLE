import React, { useEffect, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Lock, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { updateGovernance } from "../../api";

interface GovernanceControlsProps {
  isStableMode: boolean;
}

const GovernanceControls = ({ isStableMode }: GovernanceControlsProps) => {
  // Information Controls
  const [sharpness, setSharpness] = useState([80]);
  const [granularity, setGranularity] = useState("medium");
  const [noise, setNoise] = useState([10]);
  
  // Incentive Controls
  const [incentiveGradient, setIncentiveGradient] = useState([65]);
  const [slaStrictness, setSlaStrictness] = useState([70]);
  
  // Policy Controls
  const [updateRate, setUpdateRate] = useState("smoothed");

  // Send updates to backend when controls change (debounced in reality, but direct for now)
  useEffect(() => {
    if (isStableMode) {
      updateGovernance({
        information_sharpness: sharpness[0] / 100, // Normalize to 0-1
        noise_injection: noise[0] / 100, // Normalize to 0-1
      }).catch(err => console.error("Failed to update governance:", err));
    }
  }, [sharpness, noise, isStableMode]);

  return (
    <div className="relative space-y-6 p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Governance Controls
        </h2>
        {isStableMode && <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10">Active</Badge>}
      </div>

      <div className={`space-y-8 transition-opacity duration-300 ${isStableMode ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
        
        {/* Information Controller Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
            <Info className="w-4 h-4 text-blue-400" />
            Information Controller
          </div>

          <div className="space-y-4 px-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Information Sharpness</Label>
                <span className="text-xs font-mono text-blue-400">{sharpness}%</span>
              </div>
              <Slider
                value={sharpness}
                onValueChange={setSharpness}
                max={100}
                step={1}
                className="py-1"
              />
              <p className="text-[10px] text-slate-500">
                Determines the fidelity of internal estimates revealed to agents. Lower values increase opacity.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Noise Injection</Label>
                <span className="text-xs font-mono text-purple-400">{noise}%</span>
              </div>
              <Slider
                value={noise}
                onValueChange={setNoise}
                max={100}
                step={1}
                className="py-1"
              />
              <p className="text-[10px] text-slate-500">
                Amplitude of stochastic noise added to signals to prevent gaming.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Priority Granularity</Label>
              <RadioGroup value={granularity} onValueChange={setGranularity} className="flex gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="coarse" id="coarse" />
                  <Label htmlFor="coarse" className="text-xs">Coarse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-xs">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fine" id="fine" />
                  <Label htmlFor="fine" className="text-xs">Fine</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </section>

        {/* Incentive Controller Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Incentive Controller
          </div>

          <div className="space-y-4 px-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Incentive Gradient</Label>
                <span className="text-xs font-mono text-amber-400">{incentiveGradient}</span>
              </div>
              <Slider
                value={incentiveGradient}
                onValueChange={setIncentiveGradient}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">SLA Strictness</Label>
                <span className="text-xs font-mono text-red-400">{slaStrictness}%</span>
              </div>
              <Slider
                value={slaStrictness}
                onValueChange={setSlaStrictness}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
          </div>
        </section>

        {/* Policy Engine Section */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
            <Lock className="w-4 h-4 text-slate-400" />
            Policy Engine
          </div>
          
          <div className="px-2 space-y-2">
             <Label className="text-xs text-slate-400">Update Rate</Label>
              <RadioGroup value={updateRate} onValueChange={setUpdateRate} className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="static" id="static" />
                  <Label htmlFor="static" className="text-xs">Static (Fixed)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="smoothed" id="smoothed" />
                  <Label htmlFor="smoothed" className="text-xs">Smoothed (Lagged)</Label>
                </div>
                <div className="flex items-center space-x-2">
                   <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                    <RadioGroupItem value="reactive" id="reactive" disabled />
                    <Label htmlFor="reactive" className="text-xs">Reactive (High Risk)</Label>
                  </div>
                   <AlertTriangle className="w-3 h-3 text-yellow-500" />
                </div>
              </RadioGroup>
          </div>
        </section>

      </div>
      
      {!isStableMode && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-xl max-w-[80%] text-center">
             <h3 className="text-slate-200 font-semibold mb-1">Baseline Mode Active</h3>
             <p className="text-xs text-slate-500">Governance controls are bypassed. System is operating in raw unregulated state.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernanceControls;
