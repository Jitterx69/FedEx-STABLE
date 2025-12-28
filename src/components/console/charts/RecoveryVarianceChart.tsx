import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RecoveryVarianceChartProps {
  isStableMode: boolean;
  simulationTime: number;
}

function generateVarianceData(isStableMode: boolean, time: number) {
  const data = [];
  const points = Math.min(time + 1, 30);

  for (let i = 0; i < points; i++) {
    if (isStableMode) {
      // Variance decreases and stabilizes
      const dampingFactor = Math.exp(-i / 8);
      data.push({
        time: `T+${i}`,
        variance: Math.round((40 * dampingFactor + 8 + Math.sin(i / 3) * 2) * 10) / 10,
      });
    } else {
      // High and volatile variance
      const baseVariance = 35;
      const oscillation = Math.sin(i * 0.8) * 15 + Math.cos(i * 1.2) * 10;
      const spike = i % 6 === 0 ? 20 : 0;
      data.push({
        time: `T+${i}`,
        variance: Math.round((baseVariance + oscillation + spike + Math.random() * 10) * 10) / 10,
      });
    }
  }

  return data;
}

export function RecoveryVarianceChart({ isStableMode, simulationTime }: RecoveryVarianceChartProps) {
  const data = useMemo(
    () => generateVarianceData(isStableMode, simulationTime),
    [isStableMode, simulationTime]
  );

  const currentVariance = data.length > 0 ? data[data.length - 1].variance : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-mono font-semibold text-foreground">
          {currentVariance.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">σ² (current)</span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 18%)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(222, 15%, 18%)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(222, 15%, 18%)" }}
              tickLine={false}
              domain={[0, 60]}
            />
            <ReferenceLine
              y={15}
              stroke="hsl(142, 55%, 45%)"
              strokeDasharray="5 5"
              label={{
                value: "Target",
                position: "right",
                fill: "hsl(142, 55%, 45%)",
                fontSize: 10,
              }}
            />
            <Line
              type={isStableMode ? "monotone" : "linear"}
              dataKey="variance"
              stroke={isStableMode ? "hsl(142, 55%, 45%)" : "hsl(38, 92%, 50%)"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: isStableMode ? "hsl(142, 55%, 45%)" : "hsl(38, 92%, 50%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
