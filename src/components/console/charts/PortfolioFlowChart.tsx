import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PortfolioFlowChartProps {
  isStableMode: boolean;
  simulationTime: number;
}

// Generate data with jagged patterns for baseline, smooth for STABLE
function generateData(isStableMode: boolean, time: number) {
  const data = [];
  const points = Math.min(time + 1, 30);
  
  for (let i = 0; i < points; i++) {
    if (isStableMode) {
      // Smooth, convergent behavior
      const convergenceFactor = 1 - Math.exp(-i / 10);
      data.push({
        time: `T+${i}`,
        active: Math.round(1000 - 400 * convergenceFactor + Math.sin(i / 5) * 10),
        recovered: Math.round(300 * convergenceFactor + Math.cos(i / 5) * 8),
        escalated: Math.round(100 - 60 * convergenceFactor + Math.sin(i / 4) * 5),
        aging: Math.round(150 - 100 * convergenceFactor + Math.cos(i / 6) * 7),
      });
    } else {
      // Jagged, oscillatory behavior
      const noise = Math.sin(i * 1.5) * 80 + Math.cos(i * 2.3) * 60;
      const spike = i % 7 === 0 ? 150 : 0;
      data.push({
        time: `T+${i}`,
        active: Math.round(1000 + noise + spike + Math.random() * 100 - 50),
        recovered: Math.round(200 + Math.sin(i * 1.8) * 100 + Math.random() * 50),
        escalated: Math.round(150 + Math.cos(i * 2.1) * 80 + (i % 5 === 0 ? 100 : 0)),
        aging: Math.round(180 + noise * 0.5 + Math.random() * 70),
      });
    }
  }
  
  return data;
}

export function PortfolioFlowChart({ isStableMode, simulationTime }: PortfolioFlowChartProps) {
  const data = useMemo(
    () => generateData(isStableMode, simulationTime),
    [isStableMode, simulationTime]
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="recoveredGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 55%, 45%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(142, 55%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="escalatedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="agingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "hsl(215, 15%, 55%)" }}
          />
          <Area
            type={isStableMode ? "monotone" : "linear"}
            dataKey="active"
            stroke="hsl(210, 70%, 55%)"
            fill="url(#activeGradient)"
            strokeWidth={2}
            name="Active"
          />
          <Area
            type={isStableMode ? "monotone" : "linear"}
            dataKey="recovered"
            stroke="hsl(142, 55%, 45%)"
            fill="url(#recoveredGradient)"
            strokeWidth={2}
            name="Recovered"
          />
          <Area
            type={isStableMode ? "monotone" : "linear"}
            dataKey="escalated"
            stroke="hsl(38, 92%, 50%)"
            fill="url(#escalatedGradient)"
            strokeWidth={2}
            name="Escalated"
          />
          <Area
            type={isStableMode ? "monotone" : "linear"}
            dataKey="aging"
            stroke="hsl(0, 62%, 50%)"
            fill="url(#agingGradient)"
            strokeWidth={2}
            name="Aging"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
