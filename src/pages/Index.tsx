import { useState, useEffect, useCallback } from "react";
import { GlobalControlBar } from "@/components/console/GlobalControlBar";
import { GovernanceControls } from "@/components/console/GovernanceControls";
import { SystemBehavior } from "@/components/console/SystemBehavior";
import { GovernanceStatusStrip } from "@/components/console/GovernanceStatusStrip";

interface ControlState {
  informationSharpness: number;
  priorityGranularity: "coarse" | "medium" | "fine";
  noiseInjection: number;
  incentiveGradient: number;
  slaStrictness: number;
  policyDynamics: "static" | "smoothed" | "reactive";
}

const defaultControls: ControlState = {
  informationSharpness: 50,
  priorityGranularity: "medium",
  noiseInjection: 30,
  incentiveGradient: 40,
  slaStrictness: 50,
  policyDynamics: "smoothed",
};

function calculateStabilityIndex(controls: ControlState): number {
  // Higher stability when: moderate sharpness, coarse/medium granularity, some noise, 
  // moderate incentive gradient, balanced SLA, smoothed policy
  const sharpnessFactor = 1 - Math.abs(controls.informationSharpness - 50) / 100;
  const granularityFactor = controls.priorityGranularity === "fine" ? 0.6 : controls.priorityGranularity === "medium" ? 0.85 : 1;
  const noiseFactor = controls.noiseInjection > 20 && controls.noiseInjection < 60 ? 0.9 : 0.7;
  const incentiveFactor = controls.incentiveGradient < 60 ? 0.9 : 0.6;
  const slaFactor = controls.slaStrictness < 70 ? 0.85 : 0.5;
  const policyFactor = controls.policyDynamics === "smoothed" ? 1 : controls.policyDynamics === "static" ? 0.75 : 0.6;
  
  return sharpnessFactor * granularityFactor * noiseFactor * incentiveFactor * slaFactor * policyFactor;
}

function calculateSafetyChecks(controls: ControlState) {
  return {
    information: controls.informationSharpness < 80 && controls.priorityGranularity !== "fine",
    incentives: controls.incentiveGradient < 70,
    policyRate: controls.policyDynamics !== "reactive",
  };
}

function calculateConvergenceStatus(stabilityIndex: number): "contractive" | "non-expansive" | "unstable" | "no-regime" {
  if (stabilityIndex >= 0.7) return "contractive";
  if (stabilityIndex >= 0.5) return "non-expansive";
  if (stabilityIndex >= 0.3) return "unstable";
  return "no-regime";
}

const Index = () => {
  const [isStableMode, setIsStableMode] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [controls, setControls] = useState<ControlState>(defaultControls);

  // Simulation timer
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setSimulationTime((t) => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleModeChange = useCallback((isStable: boolean) => {
    setIsStableMode(isStable);
  }, []);

  const handleControlChange = useCallback((key: string, value: number | string) => {
    setControls((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleRun = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSimulationTime(0);
    setControls(defaultControls);
  }, []);

  const stabilityIndex = isStableMode ? calculateStabilityIndex(controls) : 0;
  const safetyChecks = calculateSafetyChecks(controls);
  const convergenceStatus = calculateConvergenceStatus(stabilityIndex);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Global Control Bar */}
      <GlobalControlBar
        isStableMode={isStableMode}
        onModeChange={handleModeChange}
        simulationTime={simulationTime}
        isRunning={isRunning}
        onRun={handleRun}
        onPause={handlePause}
        onReset={handleReset}
      />

      {/* Main Control & Behavior Surface */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left - Governance Controls (25-30% width) */}
        <aside className="w-[280px] xl:w-[320px] shrink-0">
          <GovernanceControls
            isStableMode={isStableMode}
            controls={controls}
            onControlChange={handleControlChange}
          />
        </aside>

        {/* Right - System Behavior (70-75% width) */}
        <section className="flex-1 border-l border-border">
          <SystemBehavior
            isStableMode={isStableMode}
            simulationTime={simulationTime}
          />
        </section>
      </main>

      {/* Bottom Governance & Stability Status Strip */}
      <GovernanceStatusStrip
        isStableMode={isStableMode}
        stabilityIndex={stabilityIndex}
        convergenceStatus={convergenceStatus}
        safetyChecks={safetyChecks}
      />

      {/* Footer note */}
      <div className="h-8 bg-surface-sunken border-t border-border flex items-center justify-center">
        <p className="text-xs text-muted-foreground/70 italic">
          Raw predictive signals are intentionally hidden to prevent behavioral distortion.
        </p>
      </div>
    </div>
  );
};

export default Index;
