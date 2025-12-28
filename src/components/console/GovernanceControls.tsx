import { Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GovernanceControlsProps {
  isStableMode: boolean;
  controls: {
    informationSharpness: number;
    priorityGranularity: "coarse" | "medium" | "fine";
    noiseInjection: number;
    incentiveGradient: number;
    slaStrictness: number;
    policyDynamics: "static" | "smoothed" | "reactive";
  };
  onControlChange: (key: string, value: number | string) => void;
}

function ControlTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function SliderControl({
  label,
  tooltip,
  value,
  onChange,
  disabled,
  leftLabel,
  rightLabel,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className={cn("space-y-3", disabled && "opacity-40")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <ControlTooltip content={tooltip} />
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export function GovernanceControls({
  isStableMode,
  controls,
  onControlChange,
}: GovernanceControlsProps) {
  const disabled = !isStableMode;

  return (
    <div className="h-full bg-card border-r border-border overflow-y-auto scrollbar-thin">
      <div className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Governance Controls
        </h2>
        <p className="text-xs text-muted-foreground mb-6">
          Signal & Incentive Regulation
        </p>

        {/* Section 1: Information Regulation */}
        <div className="control-section">
          <h3 className="control-label">Information Regulation</h3>
          
          <div className="space-y-6">
            <SliderControl
              label="Information Sharpness"
              tooltip="Controls how precise priority information is released to DCAs. Higher sharpness increases behavioral sensitivity."
              value={controls.informationSharpness}
              onChange={(v) => onControlChange("informationSharpness", v)}
              disabled={disabled}
              leftLabel="Low"
              rightLabel="High"
            />

            <div className={cn("space-y-3", disabled && "opacity-40")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Priority Granularity
                </span>
                <ControlTooltip content="Finer granularity increases behavioral sensitivity and potential for gaming." />
              </div>
              <RadioGroup
                value={controls.priorityGranularity}
                onValueChange={(v) => onControlChange("priorityGranularity", v)}
                disabled={disabled}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="coarse" id="coarse" disabled={disabled} />
                  <Label htmlFor="coarse" className="text-sm text-foreground cursor-pointer">
                    Coarse Bands
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" disabled={disabled} />
                  <Label htmlFor="medium" className="text-sm text-foreground cursor-pointer">
                    Medium Buckets
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fine" id="fine" disabled={disabled} />
                  <Label htmlFor="fine" className="text-sm text-foreground cursor-pointer">
                    Fine-Grained
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <SliderControl
              label="Noise Injection"
              tooltip="Prevents deterministic gaming of priorities by adding controlled randomness."
              value={controls.noiseInjection}
              onChange={(v) => onControlChange("noiseInjection", v)}
              disabled={disabled}
              leftLabel="None"
              rightLabel="Moderate"
            />
          </div>
        </div>

        {/* Section 2: Incentive Regulation */}
        <div className="control-section">
          <h3 className="control-label">Incentive Regulation</h3>
          
          <div className="space-y-6">
            <SliderControl
              label="Incentive Gradient"
              tooltip="Steeper gradients amplify agent response. Higher values may cause over-concentration."
              value={controls.incentiveGradient}
              onChange={(v) => onControlChange("incentiveGradient", v)}
              disabled={disabled}
              leftLabel="Flat"
              rightLabel="Aggressive"
            />

            <SliderControl
              label="SLA Strictness"
              tooltip="Rigid SLAs increase escalation risk but improve compliance visibility."
              value={controls.slaStrictness}
              onChange={(v) => onControlChange("slaStrictness", v)}
              disabled={disabled}
              leftLabel="Flexible"
              rightLabel="Rigid"
            />
          </div>
        </div>

        {/* Section 3: Policy Dynamics */}
        <div className="control-section">
          <h3 className="control-label">Policy Dynamics</h3>
          
          <div className={cn("space-y-3", disabled && "opacity-40")}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Policy Update Rate
              </span>
              <ControlTooltip content="Controls how quickly policy changes propagate through the system." />
            </div>
            <RadioGroup
              value={controls.policyDynamics}
              onValueChange={(v) => onControlChange("policyDynamics", v)}
              disabled={disabled}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="static" id="static" disabled={disabled} />
                <Label htmlFor="static" className="text-sm text-foreground cursor-pointer">
                  Static
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="smoothed" id="smoothed" disabled={disabled} />
                <Label htmlFor="smoothed" className="text-sm text-foreground cursor-pointer">
                  Smoothed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reactive" id="reactive" disabled={disabled} />
                <Label htmlFor="reactive" className="text-sm text-foreground cursor-pointer">
                  Reactive
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground italic mt-4 pt-4 border-t border-border">
          These controls regulate system behavior, not individual decisions.
        </p>
      </div>
    </div>
  );
}
