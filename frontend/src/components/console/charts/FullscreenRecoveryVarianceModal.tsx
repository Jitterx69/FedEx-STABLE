import { useState, useEffect, useMemo } from 'react';
import { Minimize2, ChevronDown, Download, TrendingUp, TrendingDown, Activity, BarChart3, LineChart as LineChartIcon, Check, AlertTriangle, Target, Calculator, Zap, Eye, EyeOff, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bar, Line, Tooltip, ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, ReferenceLine, Area, ComposedChart } from 'recharts';

interface ChartDataPoint {
    time: number;
    active: number;
    recovered: number;
    escalated: number;
    cumulativeActive: number;
    cumulativeRecovered: number;
    cumulativeEscalated: number;
}


interface FullscreenRecoveryVarianceModalProps {
    isOpen: boolean;
    onClose: () => void;
    isStableMode: boolean;
    history: ChartDataPoint[];
}

// Reusable Dropdown (Local)
interface ToolDropdownProps {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    badge?: number | null;
}

const ToolDropdown = ({ label, icon: Icon, children, isOpen, onToggle, badge }: ToolDropdownProps) => (
    <div className="relative">
        <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            className="gap-1.5 text-slate-300 hover:bg-slate-800 hover:text-white h-8 px-2.5 border border-transparent hover:border-slate-700"
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs">{label}</span>
            {badge && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-500/20 text-blue-300 ml-1">
                    {badge}
                </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
        </Button>
        {isOpen && (
            <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 min-w-[220px] py-1 animate-in fade-in zoom-in-95 duration-100">
                {children}
            </div>
        )}
    </div>
);

const FullscreenRecoveryVarianceModal = ({
    isOpen,
    onClose,
    isStableMode,
    history
}: FullscreenRecoveryVarianceModalProps) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
    const [showDataPoints, setShowDataPoints] = useState(30);

    // Analytics States
    const [showMovingAverage, setShowMovingAverage] = useState(false);
    const [movingAverageWindow, setMovingAverageWindow] = useState(5);
    const [showAnomalies, setShowAnomalies] = useState(false);
    const [anomalyThreshold, setAnomalyThreshold] = useState(2); // Standard deviations
    const [showThresholdLines, setShowThresholdLines] = useState(false);
    const [upperThreshold, setUpperThreshold] = useState(3);
    const [lowerThreshold, setLowerThreshold] = useState(-2);
    const [showStatPanel, setShowStatPanel] = useState(false);
    const [showConfidenceBand, setShowConfidenceBand] = useState(false);
    const [showTrendProjection, setShowTrendProjection] = useState(false);
    const [showGoldenBaseline, setShowGoldenBaseline] = useState(false);

    // Simulation States
    const [showSimulation, setShowSimulation] = useState(false);
    const [simulationEfficiency, setSimulationEfficiency] = useState(50); // 0-100 scale, 50 is neutral/current

    // Count active analytics features
    const activeAnalyticsCount = [showMovingAverage, showAnomalies, showThresholdLines, showConfidenceBand, showTrendProjection, showGoldenBaseline].filter(Boolean).length;

    // Process chart data with analytics
    const { chartData, analyticsStats } = useMemo(() => {
        const recentHistory = history.slice(-showDataPoints);

        if (recentHistory.length === 0) {
            return {
                chartData: Array.from({ length: showDataPoints }, (_, i) => ({
                    name: i, time: i, variance: 0, actualVariance: 0, isPositive: true,
                    recovered: 0, escalated: 0, cumulativeVariance: 0, movingAvg: 0,
                    isAnomaly: false, upperBand: 0, lowerBand: 0
                })),
                analyticsStats: { mean: 0, stdDev: 0, min: 0, max: 0, median: 0, volatility: 0, skewness: 0 }
            };
        }

        // Calculate variances
        const variances = recentHistory.map(p => p.recovered - p.escalated);

        // Statistical calculations
        const mean = variances.reduce((a, b) => a + b, 0) / variances.length;
        const squaredDiffs = variances.map(v => Math.pow(v - mean, 2));
        const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / variances.length);
        const sortedVariances = [...variances].sort((a, b) => a - b);
        const median = sortedVariances[Math.floor(sortedVariances.length / 2)];
        const min = Math.min(...variances);
        const max = Math.max(...variances);

        // Volatility (standard deviation of changes)
        const changes = variances.slice(1).map((v, i) => v - variances[i]);
        const volatility = changes.length > 0
            ? Math.sqrt(changes.map(c => c * c).reduce((a, b) => a + b, 0) / changes.length)
            : 0;

        // Skewness
        const cubedDiffs = variances.map(v => Math.pow(v - mean, 3));
        const skewness = stdDev > 0
            ? (cubedDiffs.reduce((a, b) => a + b, 0) / variances.length) / Math.pow(stdDev, 3)
            : 0;

        // Calculate moving average
        const calculateMA = (data: number[], window: number, idx: number): number => {
            const start = Math.max(0, idx - window + 1);
            const slice = data.slice(start, idx + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        };

        let cumulativeVariance = 0;
        const processedData = recentHistory.map((point, i) => {
            const variance = point.recovered - point.escalated;
            cumulativeVariance += variance;
            const ma = calculateMA(variances, movingAverageWindow, i);
            const isAnomaly = Math.abs(variance - mean) > anomalyThreshold * stdDev;

            return {
                name: i,
                time: point.time,
                variance: Math.abs(variance) || 0.2,
                actualVariance: variance,
                isPositive: variance >= 0,
                recovered: point.recovered,
                escalated: point.escalated,
                cumulativeVariance,
                movingAvg: ma,
                isAnomaly,
                upperBand: ma + stdDev,
                lowerBand: ma - stdDev,
                trend: null as number | null,
                golden: undefined as number | undefined,
                simulated: undefined as number | undefined
            };
        });

        // --- TREND PROJECTION LOGIC ---
        if (showTrendProjection && recentHistory.length > 1) {
            // ... (existing trend logic) ...
            // Simple Linear Regression (Least Squares)
            const n = recentHistory.length;
            const x = Array.from({ length: n }, (_, i) => i);
            const y = variances;

            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
            const sumXX = x.reduce((a, b) => a + b * b, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            // calculate trend for existing points
            processedData.forEach((d, i) => {
                d.trend = slope * i + intercept;
            });

            // project 5 steps into future
            const lastTime = processedData[processedData.length - 1].time;
            for (let i = 1; i <= 5; i++) {
                const nextIndex = n - 1 + i;
                const nextVal = slope * nextIndex + intercept;
                processedData.push({
                    name: nextIndex,
                    time: lastTime + i, // Mock time increment
                    variance: 0, // Placeholder
                    actualVariance: 0,
                    isPositive: true,
                    recovered: 0,
                    escalated: 0,
                    cumulativeVariance: 0,
                    movingAvg: 0, // No MA for future
                    isAnomaly: false,
                    upperBand: 0,
                    lowerBand: 0,
                    trend: nextVal,
                    golden: undefined,
                    simulated: undefined
                });
            }
        }

        // --- GOLDEN BASELINE LOGIC ---
        if (showGoldenBaseline) {
            // Generate an "Ideal" curve: A slight sine wave around 0 with decaying amplitude (stabilizing)
            processedData.forEach((d, i) => {
                // Skip future points from trend projection if they exist
                if (d.variance === 0 && d.actualVariance === 0 && d.trend !== null && i >= recentHistory.length) return;

                const decay = Math.exp(-i * 0.1);
                // Golden baseline simulates a perfect recovery dampening: starts with some variance, quickly goes to 0
                d.golden = Math.sin(i * 0.5) * 2 * decay;
            });
        }

        // --- SIMULATION LOGIC ---
        if (showSimulation) {
            // Efficiency factor: 50 is neutral (1.0x). 100 is 2x improvement (0.5x variance). 0 is 0.5x improvement (2x variance).
            // Formula: variance * (1 - (efficiency - 50) / 100)
            const multiplier = 1 - (simulationEfficiency - 50) / 100;

            processedData.forEach(d => {
                // Apply to actual variance, but keep it roughly consistent direction-wise
                if (d.actualVariance !== 0) {
                    d.simulated = d.actualVariance * multiplier;
                } else if (d.trend != null) {
                    // Also affect trend if it exists
                    d.simulated = d.trend * multiplier;
                }
            });
        }

        return {
            chartData: processedData,
            analyticsStats: { mean, stdDev, min, max, median, volatility, skewness }
        };
    }, [history, showDataPoints, movingAverageWindow, anomalyThreshold, showTrendProjection, showGoldenBaseline, showSimulation, simulationEfficiency]);

    // Calculate basic statistics
    const stats = useMemo(() => {
        const recentHistory = history.slice(-showDataPoints);
        const totalRecovered = recentHistory.reduce((sum, p) => sum + p.recovered, 0);
        const totalEscalated = recentHistory.reduce((sum, p) => sum + p.escalated, 0);
        const netVariance = totalRecovered - totalEscalated;

        const midpoint = Math.floor(recentHistory.length / 2);
        const firstHalf = recentHistory.slice(0, midpoint);
        const secondHalf = recentHistory.slice(midpoint);

        const firstHalfVariance = firstHalf.reduce((sum, p) => sum + (p.recovered - p.escalated), 0);
        const secondHalfVariance = secondHalf.reduce((sum, p) => sum + (p.recovered - p.escalated), 0);
        const trend = secondHalfVariance > firstHalfVariance ? 'improving' : secondHalfVariance < firstHalfVariance ? 'declining' : 'stable';

        const total = totalRecovered + totalEscalated;
        const efficiencyRate = total > 0 ? (totalRecovered / total) * 100 : 0;

        return { totalRecovered, totalEscalated, netVariance, trend, efficiencyRate, dataPoints: recentHistory.length };
    }, [history, showDataPoints]);

    // Export as CSV
    const exportAsCSV = () => {
        const headers = ['Time', 'Recovered', 'Escalated', 'Variance', 'Cumulative Variance', 'Moving Avg', 'Is Anomaly'];
        const rows = chartData.map(d => [
            d.time.toString(), d.recovered.toString(), d.escalated.toString(),
            d.actualVariance.toString(), d.cumulativeVariance.toString(),
            d.movingAvg.toFixed(2), d.isAnomaly.toString()
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `recovery_variance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setActiveDropdown(null);
    };

    // Esc key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Click outside dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.relative')) setActiveDropdown(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const anomalyCount = chartData.filter(d => d.isAnomaly).length;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 flex-none">
                <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-slate-100">Recovery Variance Analysis</h2>
                    <div className="h-4 w-px bg-slate-800" />

                    {/* Toolbar Area */}
                    <div className="flex items-center gap-1">
                        {/* Visuals Menu */}
                        <ToolDropdown
                            label="Visuals"
                            icon={BarChart3}
                            isOpen={activeDropdown === 'visuals'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'visuals' ? null : 'visuals')}
                        >
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Chart Type</div>
                            {[
                                { type: 'bar', label: 'Bar Chart', icon: BarChart3 },
                                { type: 'line', label: 'Line Chart', icon: LineChartIcon },
                                { type: 'area', label: 'Area Chart', icon: Activity }
                            ].map(({ type, label, icon: Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => { setChartType(type as 'bar' | 'line' | 'area'); setActiveDropdown(null); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                                >
                                    <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</div>
                                    {chartType === type && <Check className="w-3 h-3 text-emerald-400" />}
                                </button>
                            ))}
                            <div className="my-1 border-t border-slate-700/50" />
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data Range</div>
                            {[15, 30, 50, 100].map(n => (
                                <button
                                    key={n}
                                    onClick={() => { setShowDataPoints(n); setActiveDropdown(null); }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                                >
                                    Last {n} points
                                    {showDataPoints === n && <Check className="w-3 h-3 text-blue-400" />}
                                </button>
                            ))}
                        </ToolDropdown>

                        {/* Analytics Menu - NEW */}
                        <ToolDropdown
                            label="Analytics"
                            icon={Layers}
                            isOpen={activeDropdown === 'analytics'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'analytics' ? null : 'analytics')}
                            badge={activeAnalyticsCount > 0 ? activeAnalyticsCount : null}
                        >
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Overlays</div>

                            {/* Trend Projection - NEW */}
                            <button
                                onClick={() => setShowTrendProjection(!showTrendProjection)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                                    Trend Projection (Linear)
                                </div>
                                {showTrendProjection && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>

                            {/* Golden Baseline - NEW */}
                            <button
                                onClick={() => setShowGoldenBaseline(!showGoldenBaseline)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-amber-400" />
                                    Compare to Best (Golden)
                                </div>
                                {showGoldenBaseline && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>

                            {/* Moving Average */}
                            <button
                                onClick={() => setShowMovingAverage(!showMovingAverage)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Moving Average
                                </div>
                                {showMovingAverage && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                            {showMovingAverage && (
                                <div className="px-3 py-2 bg-slate-900/50">
                                    <div className="text-[10px] text-slate-500 mb-1">Window Size</div>
                                    <div className="flex gap-1">
                                        {[3, 5, 7, 10].map(w => (
                                            <button
                                                key={w}
                                                onClick={() => setMovingAverageWindow(w)}
                                                className={`px-2 py-1 text-[10px] rounded ${movingAverageWindow === w ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Confidence Band */}
                            <button
                                onClick={() => setShowConfidenceBand(!showConfidenceBand)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5" />
                                    Confidence Band (±1σ)
                                </div>
                                {showConfidenceBand && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>

                            <div className="my-1 border-t border-slate-700/50" />
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Detection</div>

                            {/* Anomaly Detection */}
                            <button
                                onClick={() => setShowAnomalies(!showAnomalies)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Anomaly Detection
                                    {showAnomalies && anomalyCount > 0 && (
                                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{anomalyCount}</Badge>
                                    )}
                                </div>
                                {showAnomalies && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                            {showAnomalies && (
                                <div className="px-3 py-2 bg-slate-900/50">
                                    <div className="text-[10px] text-slate-500 mb-1">Sensitivity (σ)</div>
                                    <div className="flex gap-1">
                                        {[1.5, 2, 2.5, 3].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setAnomalyThreshold(t)}
                                                className={`px-2 py-1 text-[10px] rounded ${anomalyThreshold === t ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                {t}σ
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Threshold Lines */}
                            <button
                                onClick={() => setShowThresholdLines(!showThresholdLines)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5" />
                                    Threshold Lines
                                </div>
                                {showThresholdLines && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                            {showThresholdLines && (
                                <div className="px-3 py-2 bg-slate-900/50 space-y-2">
                                    <div>
                                        <div className="text-[10px] text-emerald-400 mb-1">Upper: +{upperThreshold}</div>
                                        <input
                                            type="range" min="1" max="10" value={upperThreshold}
                                            onChange={(e) => setUpperThreshold(Number(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-red-400 mb-1">Lower: {lowerThreshold}</div>
                                        <input
                                            type="range" min="-10" max="0" value={lowerThreshold}
                                            onChange={(e) => setLowerThreshold(Number(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="my-1 border-t border-slate-700/50" />

                            {/* Statistics Panel Toggle */}
                            <button
                                onClick={() => setShowStatPanel(!showStatPanel)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between text-slate-300"
                            >
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-3.5 h-3.5" />
                                    Statistical Summary
                                </div>
                                {showStatPanel ? <Eye className="w-3 h-3 text-blue-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                            </button>
                        </ToolDropdown>

                        {/* Data Menu */}
                        <ToolDropdown
                            label="Data"
                            icon={Download}
                            isOpen={activeDropdown === 'data'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'data' ? null : 'data')}
                        >
                            <button onClick={exportAsCSV} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center gap-2 text-slate-300">
                                <Download className="w-3.5 h-3.5" /> Export as CSV
                            </button>
                        </ToolDropdown>

                        {/* Simulation Toggle - NEW */}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSimulation(!showSimulation)}
                            className={`h-8 px-2.5 gap-1.5 ${showSimulation ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} border border-transparent`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span className="text-xs">Prophecy</span>
                        </Button>
                    </div>
                </div>

                {/* Right: Close Controls */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`bg-transparent ${isStableMode ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                        {isStableMode ? 'STABLE' : 'BASELINE'}
                    </Badge>
                    <div className="w-px h-5 bg-slate-700 mx-2" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={onClose}>
                        <Minimize2 className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex relative">
                {/* Sidebar */}
                <div className="w-72 border-r border-slate-800 bg-slate-900/30 flex-none p-4 space-y-6 overflow-y-auto">
                    {/* Summary Stats */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance Summary</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3">
                                <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Recovered</div>
                                <div className="text-xl font-bold text-emerald-400">{stats.totalRecovered}</div>
                            </div>
                            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                                <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Escalated</div>
                                <div className="text-xl font-bold text-red-400">{stats.totalEscalated}</div>
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg border ${stats.netVariance >= 0 ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Net Variance</div>
                            <div className={`text-2xl font-bold ${stats.netVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stats.netVariance >= 0 ? '+' : ''}{stats.netVariance}
                            </div>
                        </div>
                    </div>

                    {/* Recovery Rate */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovery Rate</h3>
                        <div className="bg-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-300">{stats.efficiencyRate.toFixed(1)}%</span>
                                <span className="text-[10px] text-slate-500">{stats.dataPoints} data points</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${stats.efficiencyRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(100, stats.efficiencyRate)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Trend */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend</h3>
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${stats.trend === 'improving' ? 'bg-emerald-950/20 border-emerald-900/50' :
                            stats.trend === 'declining' ? 'bg-red-950/20 border-red-900/50' : 'bg-slate-800/50 border-slate-700/50'
                            }`}>
                            {stats.trend === 'improving' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                                stats.trend === 'declining' ? <TrendingDown className="w-5 h-5 text-red-400" /> :
                                    <Activity className="w-5 h-5 text-slate-400" />}
                            <div>
                                <div className={`text-sm font-medium ${stats.trend === 'improving' ? 'text-emerald-400' :
                                    stats.trend === 'declining' ? 'text-red-400' : 'text-slate-300'
                                    }`}>
                                    {stats.trend === 'improving' ? 'Improving' : stats.trend === 'declining' ? 'Declining' : 'Stable'}
                                </div>
                                <div className="text-[10px] text-slate-500">Compared to previous period</div>
                            </div>
                        </div>
                    </div>

                    {/* Statistical Summary Panel */}
                    {showStatPanel && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calculator className="w-3 h-3" /> Statistical Summary
                            </h3>
                            <div className="bg-slate-800 rounded-lg p-3 space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-slate-500">Mean</span><span className="text-slate-300 font-mono">{analyticsStats.mean.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Std Dev</span><span className="text-slate-300 font-mono">{analyticsStats.stdDev.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Median</span><span className="text-slate-300 font-mono">{analyticsStats.median.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Min / Max</span><span className="text-slate-300 font-mono">{analyticsStats.min} / {analyticsStats.max}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Volatility</span><span className="text-slate-300 font-mono">{analyticsStats.volatility.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Skewness</span>
                                    <span className={`font-mono ${analyticsStats.skewness > 0.5 ? 'text-emerald-400' : analyticsStats.skewness < -0.5 ? 'text-red-400' : 'text-slate-300'}`}>
                                        {analyticsStats.skewness.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Anomaly Alert */}
                    {showAnomalies && anomalyCount > 0 && (
                        <div className="p-3 rounded-lg border bg-amber-950/20 border-amber-900/50">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-medium text-amber-400">Anomalies Detected</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                {anomalyCount} data point{anomalyCount > 1 ? 's' : ''} exceed{anomalyCount === 1 ? 's' : ''} {anomalyThreshold}σ threshold.
                                These are highlighted in the chart.
                            </p>
                        </div>
                    )}

                    {/* Hint Box */}
                    <div className={`p-3 rounded-lg border ${isStableMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-amber-950/20 border-amber-900/50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className={`w-4 h-4 ${isStableMode ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className={`text-xs font-medium ${isStableMode ? 'text-emerald-400' : 'text-amber-400'}`}>Analysis Tip</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            {isStableMode
                                ? "STABLE mode optimizes recovery strategies. Use Analytics menu for moving averages and anomaly detection."
                                : "BASELINE mode shows unoptimized patterns. Enable threshold lines to identify problem areas."}
                        </p>
                    </div>

                    {/* Simulation Control Panel */}
                    {showSimulation && (
                        <div className="p-4 rounded-lg border bg-purple-950/20 border-purple-900/50 mt-4 animate-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-medium text-purple-400">Prophecy Simulation</span>
                                </div>
                                <span className="text-xs font-mono text-purple-300">{simulationEfficiency > 50 ? '+' : ''}{simulationEfficiency - 50}% Efficiency</span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={simulationEfficiency}
                                onChange={(e) => setSimulationEfficiency(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />

                            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                                <span>Degraded</span>
                                <span>Neutral</span>
                                <span>Optimized</span>
                            </div>

                            <p className="text-[10px] text-purple-300/70 mt-3 leading-relaxed">
                                Adjust the efficiency slider to simulate how recovery variance would change under different operational conditions.
                            </p>
                        </div>
                    )}
                </div>

                {/* Chart Area */}
                <div className="flex-1 bg-slate-950 p-6 overflow-hidden flex flex-col">
                    <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 p-6">
                        <div className="text-xs text-slate-400 mb-4 font-medium flex items-center gap-2">
                            Recovery Variance Over Time
                            <span className="text-slate-600">|</span>
                            <span className="text-slate-500">{chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart</span>
                            {showMovingAverage && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-cyan-500/20 text-cyan-300">MA({movingAverageWindow})</Badge>}
                            {showAnomalies && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-300">Anomalies</Badge>}
                        </div>
                        <div className="h-[calc(100%-2rem)]">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'bar' ? (
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <ReferenceLine y={0} stroke="#475569" />
                                        {showThresholdLines && <ReferenceLine y={upperThreshold} stroke="#10b981" strokeDasharray="5 5" label={{ value: `+${upperThreshold}`, fill: '#10b981', fontSize: 10 }} />}
                                        {showThresholdLines && <ReferenceLine y={lowerThreshold} stroke="#ef4444" strokeDasharray="5 5" label={{ value: lowerThreshold, fill: '#ef4444', fontSize: 10 }} />}
                                        <Tooltip cursor={false} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                                                        <div className="text-xs text-slate-400 mb-1">Time: {d.time}</div>
                                                        <div className="text-xs text-emerald-400">Recovered: {d.recovered}</div>
                                                        <div className="text-xs text-red-400">Escalated: {d.escalated}</div>
                                                        <div className={`text-xs font-medium mt-1 ${d.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            Variance: {d.actualVariance >= 0 ? '+' : ''}{d.actualVariance}
                                                        </div>
                                                        {showMovingAverage && <div className="text-xs text-cyan-400 mt-1">MA: {d.movingAvg.toFixed(2)}</div>}
                                                        {d.isAnomaly && <div className="text-xs text-amber-400 mt-1 font-medium">⚠ Anomaly</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`}
                                                    fill={showAnomalies && entry.isAnomaly ? '#f59e0b' : entry.isPositive ? '#10b981' : '#ef4444'}
                                                    fillOpacity={isStableMode ? 0.9 : 0.7}
                                                    stroke={showAnomalies && entry.isAnomaly ? '#f59e0b' : undefined}
                                                    strokeWidth={showAnomalies && entry.isAnomaly ? 2 : 0}
                                                />
                                            ))}
                                        </Bar>
                                        {showTrendProjection && <Line type="monotone" dataKey="trend" stroke="#60a5fa" strokeWidth={2} strokeDasharray="3 3" dot={false} />}
                                        {showGoldenBaseline && <Line type="monotone" dataKey="golden" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 2" dot={false} />}
                                        {showSimulation && <Line type="monotone" dataKey="simulated" stroke="#a855f7" strokeWidth={2} strokeDasharray="2 2" dot={false} />}
                                        {showMovingAverage && <Line type="monotone" dataKey="movingAvg" stroke="#06b6d4" strokeWidth={2} dot={false} />}
                                    </ComposedChart>
                                ) : chartType === 'area' ? (
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <ReferenceLine y={0} stroke="#475569" />
                                        {showThresholdLines && <ReferenceLine y={upperThreshold} stroke="#10b981" strokeDasharray="5 5" />}
                                        {showThresholdLines && <ReferenceLine y={lowerThreshold} stroke="#ef4444" strokeDasharray="5 5" />}
                                        {showTrendProjection && <Line type="monotone" dataKey="trend" stroke="#60a5fa" strokeWidth={2} strokeDasharray="3 3" dot={false} />}
                                        {showGoldenBaseline && <Area type="monotone" dataKey="golden" stroke="#fbbf24" fill="transparent" strokeWidth={2} strokeDasharray="4 2" />}
                                        {showSimulation && <Line type="monotone" dataKey="simulated" stroke="#a855f7" strokeWidth={2} strokeDasharray="2 2" dot={false} />}
                                        {showConfidenceBand && <Area type="monotone" dataKey="upperBand" stroke="transparent" fill="#3b82f6" fillOpacity={0.1} />}
                                        {showConfidenceBand && <Area type="monotone" dataKey="lowerBand" stroke="transparent" fill="#3b82f6" fillOpacity={0.1} />}
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                                                        <div className="text-xs text-slate-400 mb-1">Time: {d.time}</div>
                                                        <div className={`text-xs font-medium ${d.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            Variance: {d.actualVariance >= 0 ? '+' : ''}{d.actualVariance}
                                                        </div>
                                                        {showMovingAverage && <div className="text-xs text-cyan-400">MA: {d.movingAvg.toFixed(2)}</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Area type="monotone" dataKey="actualVariance" stroke={isStableMode ? '#10b981' : '#f59e0b'} fill={isStableMode ? '#10b981' : '#f59e0b'} fillOpacity={0.3} />
                                        {showTrendProjection && <Line type="monotone" dataKey="trend" stroke="#60a5fa" strokeWidth={2} strokeDasharray="3 3" dot={false} />}
                                        {showGoldenBaseline && <Line type="monotone" dataKey="golden" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 2" dot={false} />}
                                        {showMovingAverage && <Line type="monotone" dataKey="movingAvg" stroke="#06b6d4" strokeWidth={2} dot={false} />}
                                    </ComposedChart>
                                ) : (
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                                        <ReferenceLine y={0} stroke="#475569" />
                                        {showThresholdLines && <ReferenceLine y={upperThreshold} stroke="#10b981" strokeDasharray="5 5" />}
                                        {showThresholdLines && <ReferenceLine y={lowerThreshold} stroke="#ef4444" strokeDasharray="5 5" />}
                                        {showConfidenceBand && <Area type="monotone" dataKey="upperBand" stroke="transparent" fill="#3b82f6" fillOpacity={0.1} />}
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                                                        <div className="text-xs text-slate-400 mb-1">Time: {d.time}</div>
                                                        <div className="text-xs text-emerald-400">Recovered: {d.recovered}</div>
                                                        <div className="text-xs text-red-400">Escalated: {d.escalated}</div>
                                                        <div className={`text-xs font-medium mt-1 ${d.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            Variance: {d.actualVariance >= 0 ? '+' : ''}{d.actualVariance}
                                                        </div>
                                                        <div className="text-xs text-blue-400 mt-1">Cumulative: {d.cumulativeVariance >= 0 ? '+' : ''}{d.cumulativeVariance}</div>
                                                        {showMovingAverage && <div className="text-xs text-cyan-400">MA: {d.movingAvg.toFixed(2)}</div>}
                                                        {d.isAnomaly && <div className="text-xs text-amber-400 mt-1 font-medium">⚠ Anomaly</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Line type="monotone" dataKey="actualVariance" stroke={isStableMode ? '#10b981' : '#f59e0b'} strokeWidth={2}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            dot={(props: any) => {
                                                const { cx, cy, payload } = props;
                                                return (
                                                    <circle cx={cx} cy={cy} r={showAnomalies && payload.isAnomaly ? 6 : 3}
                                                        fill={showAnomalies && payload.isAnomaly ? '#f59e0b' : isStableMode ? '#10b981' : '#f59e0b'}
                                                        stroke={showAnomalies && payload.isAnomaly ? '#fff' : 'none'} strokeWidth={2} />
                                                );
                                            }}
                                        />
                                        {showTrendProjection && <Line type="monotone" dataKey="trend" stroke="#60a5fa" strokeWidth={2} strokeDasharray="3 3" dot={false} />}
                                        {showGoldenBaseline && <Line type="monotone" dataKey="golden" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 2" dot={false} />}
                                        {showSimulation && <Line type="monotone" dataKey="simulated" stroke="#a855f7" strokeWidth={2} strokeDasharray="2 2" dot={false} />}
                                        <Line type="monotone" dataKey="cumulativeVariance" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        {showMovingAverage && <Line type="monotone" dataKey="movingAvg" stroke="#06b6d4" strokeWidth={2} dot={false} />}
                                    </ComposedChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullscreenRecoveryVarianceModal;
