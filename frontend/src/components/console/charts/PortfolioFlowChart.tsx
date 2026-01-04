import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Line, ComposedChart, ReferenceDot, Label } from 'recharts';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  detectAllAnomalies,
  projectTrend,
  AnomalyPoint,
  BollingerBands,
  MACDResult,
  ForecastPoint
} from '@/utils/chartAnalytics';

type ViewMode = 'rateOfChange' | 'cumulative' | 'recoveryRate';

interface ChartConfig {
  showMovingAvg5?: boolean;
  showMovingAvg10?: boolean;
  showMovingAvg20?: boolean;
  showTrendLine?: boolean;
  showReferenceLine?: boolean;
  referenceValue?: number;
  showCrosshair?: boolean;
  showPeakValley?: boolean;
  showActive?: boolean;
  showRecovered?: boolean;
  showEscalated?: boolean;
  normalizeView?: boolean;
  // Advanced Analytics
  showBollingerBands?: boolean;
  bollingerPeriod?: number;
  bollingerStdDev?: number;
  showRSI?: boolean;
  rsiPeriod?: number;
  showMACD?: boolean;
  showAnomalies?: boolean;
  anomalyThreshold?: number;
  // Forecasting
  showForecast?: boolean;
  forecastPeriods?: number;
  showConfidenceInterval?: boolean;
}



export interface MeasurePoint {
  x: number;
  y: number;
  value: number;
}

const defaultChartConfig: ChartConfig = {
  showMovingAvg5: false,
  showMovingAvg10: false,
  showMovingAvg20: false,
  showTrendLine: false,
  showReferenceLine: false,
  referenceValue: 0,
  showCrosshair: true,
  showPeakValley: false,
  showActive: true,
  showRecovered: true,
  showEscalated: true,
  normalizeView: false,
  // Advanced Analytics defaults
  showBollingerBands: false,
  bollingerPeriod: 20,
  bollingerStdDev: 2,
  showRSI: false,
  rsiPeriod: 14,
  showMACD: false,
  showAnomalies: false,
  anomalyThreshold: 2.5,
  // Forecasting defaults
  showForecast: false,
  forecastPeriods: 10,
  showConfidenceInterval: true,
};

interface PortfolioFlowChartProps {
  isStableMode: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // onExpand?: () => void; // Unused
  isFullscreen?: boolean;
  viewMode?: ViewMode;
  chartConfig?: ChartConfig;
  isMeasuring?: boolean;
  // Controlled state props
  measurePoints?: MeasurePoint[];
  onMeasurePointsChange?: (points: MeasurePoint[]) => void;
}

const PortfolioFlowChart = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isStableMode: _isStableMode,
  data,
  isFullscreen = false,
  viewMode = 'rateOfChange',
  chartConfig = defaultChartConfig,
  isMeasuring = false,
  measurePoints: measurementPropsPoints,
  onMeasurePointsChange
}: PortfolioFlowChartProps) => {
  const config = { ...defaultChartConfig, ...chartConfig };
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Zoom State
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [yZoomLevel, setYZoomLevel] = useState(1);

  // Compute data bounds
  const dataBounds = useMemo(() => {
    if (!data || data.length === 0) return { min: 0, max: 100 };
    return {
      min: data[0].time,
      max: data[data.length - 1].time
    };
  }, [data]);

  // Transform data based on viewMode
  // Helper function to calculate moving average
  const calcMovingAvg = (arr: number[], window: number): number[] => {
    return arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = arr.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  };

  // Transform data based on viewMode and config
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let baseData: any[];

    switch (viewMode) {
      case 'cumulative':
        baseData = data.map(d => ({
          time: d.time,
          active: d.cumulativeActive || 0,
          recovered: d.cumulativeRecovered || 0,
          escalated: d.cumulativeEscalated || 0,
        }));
        break;
      case 'recoveryRate':
        baseData = data.map(d => {
          const totalActive = d.cumulativeActive || 1;
          const recoveryRate = totalActive > 0 ? ((d.cumulativeRecovered || 0) / totalActive) * 100 : 0;
          const escalationRate = totalActive > 0 ? ((d.cumulativeEscalated || 0) / totalActive) * 100 : 0;
          return {
            time: d.time,
            active: 100,
            recovered: Math.min(recoveryRate, 100),
            escalated: Math.min(escalationRate, 100),
          };
        });
        break;
      case 'rateOfChange':
      default:
        baseData = data.map(d => ({
          time: d.time,
          active: d.active || 0,
          recovered: d.recovered || 0,
          escalated: d.escalated || 0,
        }));
    }

    // Normalize to 0-100% if enabled
    if (config.normalizeView) {
      const maxVal = Math.max(...baseData.flatMap(d => [d.active, d.recovered, d.escalated]));
      if (maxVal > 0) {
        baseData = baseData.map(d => ({
          ...d,
          active: (d.active / maxVal) * 100,
          recovered: (d.recovered / maxVal) * 100,
          escalated: (d.escalated / maxVal) * 100,
        }));
      }
    }

    // Add moving averages if enabled
    const activeVals = baseData.map(d => d.active);
    const ma5 = config.showMovingAvg5 ? calcMovingAvg(activeVals, 5) : null;
    const ma10 = config.showMovingAvg10 ? calcMovingAvg(activeVals, 10) : null;
    const ma20 = config.showMovingAvg20 ? calcMovingAvg(activeVals, 20) : null;

    return baseData.map((d, i) => ({
      ...d,
      ...(ma5 && { ma5: ma5[i] }),
      ...(ma10 && { ma10: ma10[i] }),
      ...(ma20 && { ma20: ma20[i] }),
    }));
  }, [data, viewMode, config.normalizeView, config.showMovingAvg5, config.showMovingAvg10, config.showMovingAvg20]);

  // Advanced Analytics Calculations
  const bollingerBands = useMemo((): BollingerBands[] => {
    if (!config.showBollingerBands || !chartData || chartData.length === 0) return [];
    const activeVals = chartData.map(d => d.active);
    return calculateBollingerBands(activeVals, config.bollingerPeriod || 20, config.bollingerStdDev || 2);
  }, [chartData, config.showBollingerBands, config.bollingerPeriod, config.bollingerStdDev]);

  const rsiData = useMemo((): number[] => {
    if (!config.showRSI || !chartData || chartData.length === 0) return [];
    const activeVals = chartData.map(d => d.active);
    return calculateRSI(activeVals, config.rsiPeriod || 14);
  }, [chartData, config.showRSI, config.rsiPeriod]);

  const macdData = useMemo((): MACDResult[] => {
    if (!config.showMACD || !chartData || chartData.length === 0) return [];
    const activeVals = chartData.map(d => d.active);
    return calculateMACD(activeVals);
  }, [chartData, config.showMACD]);

  const anomalies = useMemo((): AnomalyPoint[] => {
    if (!config.showAnomalies || !data || data.length === 0) return [];
    return detectAllAnomalies(data, config.anomalyThreshold || 2.5);
  }, [data, config.showAnomalies, config.anomalyThreshold]);

  const forecastData = useMemo((): ForecastPoint[] => {
    if (!config.showForecast || !data || data.length < 5) return [];
    return projectTrend(data, config.forecastPeriods || 10);
  }, [data, config.showForecast, config.forecastPeriods]);

  // Combine chart data with advanced indicators
  const enhancedChartData = useMemo(() => {
    const baseEnhanced = chartData.map((d, i) => ({
      ...d,
      ...(bollingerBands[i] && !isNaN(bollingerBands[i].upper) && {
        bbUpper: bollingerBands[i].upper,
        bbMiddle: bollingerBands[i].middle,
        bbLower: bollingerBands[i].lower,
      }),
      ...(rsiData[i] !== undefined && !isNaN(rsiData[i]) && { rsi: rsiData[i] }),
      ...(macdData[i] && !isNaN(macdData[i].macd) && {
        macd: macdData[i].macd,
        macdSignal: macdData[i].signal,
        macdHistogram: macdData[i].histogram,
      }),
    }));

    // Add forecast points if enabled
    if (config.showForecast && forecastData.length > 0 && chartData.length > 0) {
      const lastDataPoint = chartData[chartData.length - 1];
      // Add bridge point connecting actual data to forecast
      baseEnhanced[baseEnhanced.length - 1] = {
        ...baseEnhanced[baseEnhanced.length - 1],
        forecast: lastDataPoint.active,
        forecastUpper: lastDataPoint.active,
        forecastLower: lastDataPoint.active,
      };
      // Add forecast points
      forecastData.forEach(f => {
        baseEnhanced.push({
          time: f.time,
          active: undefined as unknown as number,
          recovered: undefined as unknown as number,
          escalated: undefined as unknown as number,
          forecast: f.predicted,
          forecastUpper: config.showConfidenceInterval ? f.upperBound : undefined,
          forecastLower: config.showConfidenceInterval ? f.lowerBound : undefined,
          isForecast: true,
        });
      });
    }

    return baseEnhanced;
  }, [chartData, bollingerBands, rsiData, macdData, forecastData, config.showForecast, config.showConfidenceInterval]);

  // Dynamic axis labels based on viewMode
  const axisLabels = useMemo(() => {
    switch (viewMode) {
      case 'cumulative':
        return { x: 'Time', y: 'Total Accounts' };
      case 'recoveryRate':
        return { x: 'Time', y: 'Rate (%)' };
      case 'rateOfChange':
      default:
        return { x: 'Time', y: 'Δ Accounts' };
    }
  }, [viewMode]);

  // Effective domain: use zoom values if set, otherwise full data range
  // Effective domain: use zoom values if set, otherwise full data range
  const xDomain = useMemo(() => {
    const left = zoomLeft !== null ? zoomLeft : (typeof dataBounds.min === 'number' ? dataBounds.min : 0);
    const right = zoomRight !== null ? zoomRight : (typeof dataBounds.max === 'number' ? dataBounds.max : 100);

    // Safety check - MUST be finite
    if (!Number.isFinite(left) || !Number.isFinite(right)) return [0, 100];

    return [left, right];
  }, [zoomLeft, zoomRight, dataBounds]);

  // Check if zoomed
  const isZoomed = zoomLeft !== null || zoomRight !== null || yZoomLevel !== 1;

  // Reset zoom
  const resetZoom = () => {
    setZoomLeft(null);
    setZoomRight(null);
    setRefAreaLeft('');
    setRefAreaRight('');
    setYZoomLevel(1);
  };

  // Drag-to-zoom
  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    const left = Number(refAreaLeft);
    const right = Number(refAreaRight);

    if (left < right) {
      setZoomLeft(left);
      setZoomRight(right);
    } else {
      setZoomLeft(right);
      setZoomRight(left);
    }
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Wheel Zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!data || data.length === 0) return;

    const direction = e.deltaY > 0 ? 1 : -1;

    if (e.shiftKey) {
      // Y-AXIS ZOOM
      setYZoomLevel(prev => {
        const factor = direction > 0 ? 0.9 : 1.1;
        return Math.max(0.5, Math.min(5, prev * factor));
      });
    } else {
      // X-AXIS ZOOM
      const currentLeft = zoomLeft !== null ? zoomLeft : dataBounds.min;
      const currentRight = zoomRight !== null ? zoomRight : dataBounds.max;

      const range = currentRight - currentLeft;
      const step = Math.max(1, Math.round(range * 0.05));

      if (direction > 0) {
        // Zoom Out
        let newLeft = currentLeft - step;
        let newRight = currentRight + step;

        if (newLeft < dataBounds.min) newLeft = dataBounds.min;
        if (newRight > dataBounds.max) newRight = dataBounds.max;

        // If fully zoomed out, reset to null
        if (newLeft <= dataBounds.min && newRight >= dataBounds.max) {
          setZoomLeft(null);
          setZoomRight(null);
        } else {
          setZoomLeft(newLeft);
          setZoomRight(newRight);
        }
      } else {
        // Zoom In
        if (range <= 5) return;
        setZoomLeft(currentLeft + step);
        setZoomRight(currentRight - step);
      }
    }
  }, [data, zoomLeft, zoomRight, dataBounds]);

  // Attach wheel listener
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Calculate Y-axis domain - recalculates when X zoom changes for accurate readings
  const yDomain = useMemo(() => {
    // Use enhancedChartData to include forecast, BB, etc in scaling
    if (!enhancedChartData || enhancedChartData.length === 0) return [0, 10];

    // Safe access to xDomain values
    const left = xDomain[0];
    const right = xDomain[1];

    // Safety check for Finite
    if (!Number.isFinite(left) || !Number.isFinite(right)) return [0, 10];

    // Filter visible data based on current zoom
    const visibleData = enhancedChartData.filter(item => item.time >= left && item.time <= right);

    if (visibleData.length === 0) return [0, 10];

    let min = Infinity;
    let max = -Infinity;

    visibleData.forEach(item => {
      const checks = [];
      // Main metrics
      // Use logical OR with showActive/Recovered/Escalated but also check if data exists
      if (config.showActive) checks.push(item.active);
      if (config.showRecovered) checks.push(item.recovered);
      if (config.showEscalated) checks.push(item.escalated);

      // Moving Averages
      if (config.showMovingAvg5) checks.push(item.ma5);
      if (config.showMovingAvg10) checks.push(item.ma10);
      if (config.showMovingAvg20) checks.push(item.ma20);

      // Bollinger Bands
      if (config.showBollingerBands) {
        checks.push(item.bbUpper);
        checks.push(item.bbLower);
      }

      // Forecast
      if (config.showForecast) {
        checks.push(item.forecast);
        if (config.showConfidenceInterval) {
          checks.push(item.forecastUpper);
          checks.push(item.forecastLower);
        }
      }

      checks.forEach(val => {
        // Using isFinite checks for both NaN and Infinity
        if (typeof val === 'number' && Number.isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    // Ensure sensible defaults if no valid data found
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 10;
    }

    // Handle flat data
    if (min === max) {
      if (min === 0) { max = 10; } // All zeros
      else {
        min = min * 0.95;
        max = max * 1.05;
      }
    }

    // Apply Y zoom level
    const range = max - min;
    const zoomedRange = range / (yZoomLevel || 1);
    const center = (min + max) / 2;

    const zoomedMin = center - zoomedRange / 2;
    const zoomedMax = center + zoomedRange / 2;

    // Safety check for final values
    if (!Number.isFinite(zoomedMin) || !Number.isFinite(zoomedMax)) return [0, 10];

    // Add 5% padding for better visualization
    const padding = zoomedRange * 0.05;
    return [zoomedMin - padding, zoomedMax + padding];
  }, [enhancedChartData, xDomain, yZoomLevel, config]);

  // Peak/Valley Logic
  const peaksValleys = useMemo(() => {
    if (!config.showPeakValley || !chartData || chartData.length < 3) return { peaks: [], valleys: [] };
    const peaks: { time: number; active: number }[] = [];
    const valleys: { time: number; active: number }[] = [];

    chartData.forEach((d, i) => {
      if (i === 0 || i === chartData.length - 1) return;
      const prev = chartData[i - 1].active;
      const curr = d.active;
      const next = chartData[i + 1].active;

      if (typeof curr !== 'number' || typeof prev !== 'number' || typeof next !== 'number') return;

      if (curr > prev && curr > next) peaks.push(d);
      if (curr < prev && curr < next) valleys.push(d);
    });
    return { peaks, valleys };
  }, [chartData, config.showPeakValley]);

  // Measurement Logic
  // Support both controlled (props) and uncontrolled (local state) modes
  const [internalMeasurePoints, setInternalMeasurePoints] = useState<MeasurePoint[]>([]);

  const effectiveMeasurePoints = measurementPropsPoints || internalMeasurePoints;

  const handleMeasureChange = (newPoints: MeasurePoint[]) => {
    if (onMeasurePointsChange) {
      onMeasurePointsChange(newPoints);
    } else {
      setInternalMeasurePoints(newPoints);
    }
  };

  useEffect(() => {
    if (!isMeasuring) {
      setTimeout(() => handleMeasureChange([]), 0);
    }
  }, [isMeasuring]);

  const [hoverData, setHoverData] = useState<{ x: number, y: number } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (e?.activeLabel !== undefined && e.activePayload?.[0]?.value !== undefined) {
      setHoverData({ x: e.activeLabel, y: e.activePayload[0].value });
    }

    // Zoom logic
    if (!isMeasuring && refAreaLeft && e?.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (e: any) => {
    if (!isMeasuring || !e) return;
    const x = e.activeLabel;
    const y = e.activePayload?.[0]?.value;

    if (x !== undefined && y !== undefined) {
      const currentPoints = effectiveMeasurePoints;
      if (currentPoints.length >= 2) {
        handleMeasureChange([{ x, y, value: y }]);
      } else {
        handleMeasureChange([...currentPoints, { x, y, value: y }]);
      }
    }
  };

  return (
    <div ref={chartContainerRef} className="h-full w-full relative select-none">
      {/* Control Buttons */}
      <div className="absolute top-0 -left-3 z-20 flex flex-col gap-1">
        {isZoomed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
            onClick={resetZoom}
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}

      </div>



      {/* Zoom Hints - hide in fullscreen to avoid overlap */}
      {!isFullscreen && (
        <div className="absolute -bottom-4 left-2 z-20 text-[9px] text-slate-500 pointer-events-none">
          Scroll: X-Zoom | Shift+Scroll: Y-Zoom | Drag: Select Range
        </div>
      )}

      {/* Y-Zoom Indicator */}
      {yZoomLevel !== 1 && (
        <div className="absolute top-2 right-16 z-20 text-[10px] text-amber-400 bg-slate-800/80 px-2 py-1 rounded">
          Y: {yZoomLevel.toFixed(1)}x
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={enhancedChartData}
          onMouseDown={(e) => !isMeasuring && e?.activeLabel && setRefAreaLeft(e.activeLabel)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseUp={!isMeasuring ? zoom : undefined}
          onClick={handleChartClick}
        >
          <defs>
            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEscalated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            type="number"
            domain={xDomain}
            hide
            allowDataOverflow
          />
          <YAxis
            domain={yDomain}
            allowDataOverflow={true}
            tick={{ fontSize: 10, fill: '#64748b' }}
            width={45}
            tickFormatter={(v) => {
              const range = yDomain[1] - yDomain[0];
              if (range < 2) return v.toFixed(2);
              if (range < 10) return v.toFixed(1);
              return v.toFixed(0);
            }}
            label={{
              value: axisLabels.y,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 10, fill: '#64748b', textAnchor: 'middle' }
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '11px' }}
            itemStyle={{ fontSize: '11px' }}
            labelStyle={{ color: '#ffffff' }}
            labelFormatter={(v) => `Time: ${v}`}
            formatter={(value: any) => viewMode === 'recoveryRate' ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(0)}
          />
          {/* Main Data Lines - conditionally rendered */}
          {config.showActive && (
            <Area
              type="monotone"
              dataKey="active"
              stroke="#3b82f6"
              fill="url(#colorActive)"
              strokeWidth={2}
              dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
          {config.showRecovered && (
            <Area
              type="monotone"
              dataKey="recovered"
              stroke="#10b981"
              fill="url(#colorRecovered)"
              strokeWidth={2}
              dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
          {config.showEscalated && (
            <Area
              type="monotone"
              dataKey="escalated"
              stroke="#ef4444"
              fill="url(#colorEscalated)"
              strokeWidth={2}
              dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}

          {/* Moving Average Lines */}
          {config.showMovingAvg5 && (
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              name="MA5"
            />
          )}
          {config.showMovingAvg10 && (
            <Line
              type="monotone"
              dataKey="ma10"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              name="MA10"
            />
          )}
          {config.showMovingAvg20 && (
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              name="MA20"
            />
          )}

          {/* Bollinger Bands */}
          {config.showBollingerBands && (
            <>
              <Area
                type="monotone"
                dataKey="bbUpper"
                stroke="#8b5cf6"
                fill="none"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                name="BB Upper"
              />
              <Area
                type="monotone"
                dataKey="bbLower"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                name="BB Lower"
              />
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                name="BB Middle"
              />
            </>
          )}

          {/* Anomaly Markers */}
          {config.showAnomalies && anomalies.map((anomaly, i) => (
            <ReferenceDot
              key={`anomaly-${i}`}
              x={anomaly.time}
              y={anomaly.value}
              r={6}
              fill={anomaly.zScore > 0 ? '#f59e0b' : '#ef4444'}
              stroke="#fff"
              strokeWidth={2}
            >
              <Label
                value="⚠"
                position="top"
                fontSize={12}
                fill={anomaly.zScore > 0 ? '#f59e0b' : '#ef4444'}
                offset={8}
              />
            </ReferenceDot>
          ))}

          {/* Forecast Line and Confidence Interval */}
          {config.showForecast && forecastData.length > 0 && (
            <>
              {/* Confidence Interval Fill */}
              {config.showConfidenceInterval && (
                <Area
                  type="monotone"
                  dataKey="forecastUpper"
                  stroke="none"
                  fill="#06b6d4"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
              {config.showConfidenceInterval && (
                <Area
                  type="monotone"
                  dataKey="forecastLower"
                  stroke="#06b6d4"
                  strokeDasharray="4 2"
                  strokeWidth={1}
                  fill="none"
                  isAnimationActive={false}
                  connectNulls
                />
              )}
              {/* Main Forecast Line */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </>
          )}

          {/* Peak/Valley Markers */}
          {peaksValleys.peaks.map((p, i) => (
            <ReferenceDot key={`peak-${i}`} x={p.time} y={p.active} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} label={{ position: 'top', value: '▲', fontSize: 10, fill: '#ef4444', dy: -5 }} />
          ))}
          {peaksValleys.valleys.map((p, i) => (
            <ReferenceDot key={`valley-${i}`} x={p.time} y={p.active} r={4} fill="#10b981" stroke="#fff" strokeWidth={1} label={{ position: 'bottom', value: '▼', fontSize: 10, fill: '#10b981', dy: 5 }} />
          ))}

          {/* Measurement Markers */}
          {effectiveMeasurePoints.map((p, i) => (
            <ReferenceDot key={`measure-${i}`} x={p.x} y={p.y} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
          ))}
          {/* Measurement Preview (Rubber-band) */}
          {isMeasuring && effectiveMeasurePoints.length === 1 && hoverData && (
            <ReferenceLine
              segment={[{ x: effectiveMeasurePoints[0].x, y: effectiveMeasurePoints[0].y }, { x: hoverData.x, y: hoverData.y }]}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              opacity={0.8}
              strokeWidth={2}
            >
              <Label
                value={`ΔT: ${Math.abs(hoverData.x - effectiveMeasurePoints[0].x)} | ΔY: ${(hoverData.y - effectiveMeasurePoints[0].value).toFixed(1)}`}
                position="top"
                fill="#3b82f6"
                fontSize={11}
                fontWeight="bold"
                offset={10}
              />
            </ReferenceLine>
          )}

          {/* Crosshair Cursor */}
          {config.showCrosshair && hoverData && !isMeasuring && (
            <>
              <ReferenceLine x={hoverData.x} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.4} />
              <ReferenceLine y={hoverData.y} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.4} />
            </>
          )}

          {effectiveMeasurePoints.length === 2 && (
            <ReferenceLine
              segment={[{ x: effectiveMeasurePoints[0].x, y: effectiveMeasurePoints[0].y }, { x: effectiveMeasurePoints[1].x, y: effectiveMeasurePoints[1].y }]}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              strokeWidth={2}
            >
              <Label
                value={`ΔT: ${Math.abs(effectiveMeasurePoints[1].x - effectiveMeasurePoints[0].x)} | ΔY: ${(effectiveMeasurePoints[1].value - effectiveMeasurePoints[0].value).toFixed(1)}`}
                position="top"
                fill="#3b82f6"
                fontSize={12}
                fontWeight="bold"
                offset={10}
              />
            </ReferenceLine>
          )}

          {/* Trend Line - simple linear regression approximation */}
          {/* Trend Line - safe rendering */}
          {config.showTrendLine && chartData.length > 1 &&
            chartData[0]?.time !== undefined &&
            chartData[chartData.length - 1]?.time !== undefined && (
              <ReferenceLine
                segment={[
                  {
                    x: chartData[0].time,
                    y: (typeof chartData[0].active === 'number' && Number.isFinite(chartData[0].active)) ? chartData[0].active : 0
                  },
                  {
                    x: chartData[chartData.length - 1].time,
                    y: (typeof chartData[chartData.length - 1].active === 'number' && Number.isFinite(chartData[chartData.length - 1].active)) ? chartData[chartData.length - 1].active : 0
                  }
                ]}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="8 4"
                ifOverflow="extendDomain"
              />
            )}

          {/* Reference Line */}
          {config.showReferenceLine && (
            <ReferenceLine
              y={config.referenceValue || 0}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{ value: `Ref: ${config.referenceValue}`, position: 'right', fontSize: 10, fill: '#94a3b8' }}
            />
          )}

          {refAreaLeft && refAreaRight && (
            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioFlowChart;
