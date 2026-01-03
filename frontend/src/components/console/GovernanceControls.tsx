import { useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, Lock, AlertTriangle, Zap, Cpu, Shield } from "lucide-react";
import { updateGovernance } from "../../api";
import { GovernanceSettings } from "../ConsoleSession";

interface GovernanceControlsProps {
  isStableMode: boolean;
  settings: GovernanceSettings;
  onSettingsChange: (settings: GovernanceSettings) => void;
}

const GovernanceControls = ({ isStableMode, settings, onSettingsChange }: GovernanceControlsProps) => {
  // Helper to update a single setting
  const updateSetting = <K extends keyof GovernanceSettings>(key: K, value: GovernanceSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  // Send updates to backend when controls change
  useEffect(() => {
    if (isStableMode) {
      updateGovernance({
        information_sharpness: settings.sharpness / 100,
        noise_injection: settings.noise / 100,
      }).catch(err => console.error("Failed to update governance:", err));
    }
  }, [settings.sharpness, settings.noise, isStableMode]);

  return (
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-4">
        <div className={`space-y-6 transition-opacity duration-300 ${isStableMode ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>

          {/* Information Controller Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
              <Info className="w-4 h-4 text-blue-400" />
              Information Controller
            </div>

            <div className="space-y-4 px-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Information Sharpness</Label>
                  <span className="text-xs font-mono text-blue-400">{settings.sharpness}%</span>
                </div>
                <Slider
                  value={[settings.sharpness]}
                  onValueChange={(v) => updateSetting('sharpness', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Noise Injection</Label>
                  <span className="text-xs font-mono text-purple-400">{settings.noise}%</span>
                </div>
                <Slider
                  value={[settings.noise]}
                  onValueChange={(v) => updateSetting('noise', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Signal Decay Rate</Label>
                  <span className="text-xs font-mono text-cyan-400">{settings.signalDecay}%</span>
                </div>
                <Slider
                  value={[settings.signalDecay]}
                  onValueChange={(v) => updateSetting('signalDecay', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Confidence Threshold</Label>
                  <span className="text-xs font-mono text-teal-400">{settings.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[settings.confidenceThreshold]}
                  onValueChange={(v) => updateSetting('confidenceThreshold', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Priority Granularity</Label>
                <RadioGroup
                  value={settings.granularity}
                  onValueChange={(v) => updateSetting('granularity', v as GovernanceSettings['granularity'])}
                  className="flex gap-2"
                >
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
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Incentive Gradient</Label>
                  <span className="text-xs font-mono text-amber-400">{settings.incentiveGradient}</span>
                </div>
                <Slider
                  value={[settings.incentiveGradient]}
                  onValueChange={(v) => updateSetting('incentiveGradient', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Recovery Bonus</Label>
                  <span className="text-xs font-mono text-green-400">{settings.recoveryBonus}%</span>
                </div>
                <Slider
                  value={[settings.recoveryBonus]}
                  onValueChange={(v) => updateSetting('recoveryBonus', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Penalty Severity</Label>
                  <span className="text-xs font-mono text-rose-400">{settings.penaltySeverity}%</span>
                </div>
                <Slider
                  value={[settings.penaltySeverity]}
                  onValueChange={(v) => updateSetting('penaltySeverity', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Escalation Threshold</Label>
                  <span className="text-xs font-mono text-orange-400">{settings.escalationThreshold}%</span>
                </div>
                <Slider
                  value={[settings.escalationThreshold]}
                  onValueChange={(v) => updateSetting('escalationThreshold', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">SLA Strictness</Label>
                  <span className="text-xs font-mono text-red-400">{settings.slaStrictness}%</span>
                </div>
                <Slider
                  value={[settings.slaStrictness]}
                  onValueChange={(v) => updateSetting('slaStrictness', v[0])}
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

            <div className="px-2 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Update Rate</Label>
                <RadioGroup
                  value={settings.updateRate}
                  onValueChange={(v) => updateSetting('updateRate', v as GovernanceSettings['updateRate'])}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="static" id="static" />
                    <Label htmlFor="static" className="text-xs">Static (Fixed)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="smoothed" id="smoothed" />
                    <Label htmlFor="smoothed" className="text-xs">Smoothed (Lagged)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reactive" id="reactive" />
                    <Label htmlFor="reactive" className="text-xs flex items-center gap-1">
                      Reactive (High Risk)
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Audit Frequency</Label>
                  <span className="text-xs font-mono text-indigo-400">{settings.auditFrequency}%</span>
                </div>
                <Slider
                  value={[settings.auditFrequency]}
                  onValueChange={(v) => updateSetting('auditFrequency', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Risk Tolerance</Label>
                  <span className="text-xs font-mono text-pink-400">{settings.riskTolerance}%</span>
                </div>
                <Slider
                  value={[settings.riskTolerance]}
                  onValueChange={(v) => updateSetting('riskTolerance', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Batch Size</Label>
                  <span className="text-xs font-mono text-violet-400">{settings.batchSize}</span>
                </div>
                <Slider
                  value={[settings.batchSize]}
                  onValueChange={(v) => updateSetting('batchSize', v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            </div>
          </section>

          {/* Resource Allocation Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              Resource Allocation
            </div>

            <div className="space-y-4 px-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Thread Pool Size</Label>
                  <span className="text-xs font-mono text-sky-400">{settings.threadPoolSize}</span>
                </div>
                <Slider
                  value={[settings.threadPoolSize]}
                  onValueChange={(v) => updateSetting('threadPoolSize', v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Memory Buffer</Label>
                  <span className="text-xs font-mono text-lime-400">{settings.memoryBuffer}%</span>
                </div>
                <Slider
                  value={[settings.memoryBuffer]}
                  onValueChange={(v) => updateSetting('memoryBuffer', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Queue Depth</Label>
                  <span className="text-xs font-mono text-fuchsia-400">{settings.queueDepth}</span>
                </div>
                <Slider
                  value={[settings.queueDepth]}
                  onValueChange={(v) => updateSetting('queueDepth', v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            </div>
          </section>

          {/* Compliance & Monitoring Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 border-b border-slate-700/50 pb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Compliance & Monitoring
            </div>

            <div className="px-2 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Regulatory Mode</Label>
                <RadioGroup
                  value={settings.regulatoryMode}
                  onValueChange={(v) => updateSetting('regulatoryMode', v as GovernanceSettings['regulatoryMode'])}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="strict" id="strict" />
                    <Label htmlFor="strict" className="text-xs">Strict</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced" className="text-xs">Balanced</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flexible" id="flexible" />
                    <Label htmlFor="flexible" className="text-xs">Flexible</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Audit Trail Depth</Label>
                  <span className="text-xs font-mono text-emerald-400">{settings.auditTrailDepth}%</span>
                </div>
                <Slider
                  value={[settings.auditTrailDepth]}
                  onValueChange={(v) => updateSetting('auditTrailDepth', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Alert Sensitivity</Label>
                  <span className="text-xs font-mono text-yellow-400">{settings.alertSensitivity}%</span>
                </div>
                <Slider
                  value={[settings.alertSensitivity]}
                  onValueChange={(v) => updateSetting('alertSensitivity', v[0])}
                  max={100}
                  step={1}
                  className="py-1"
                />
              </div>
            </div>
          </section>

        </div>
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
