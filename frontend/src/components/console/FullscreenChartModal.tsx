import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Minimize2, ChevronDown, LayoutGrid, LayoutTemplate,
  TrendingUp, BarChart3, Target, Crosshair, Ruler,
  Activity, Download, Play, Pause,
  SkipBack, SkipForward, Mountain, LineChart, Minus,
  History, Save, FileClock, Trash2, AlertTriangle, X,
  BrainCircuit, Sparkles, Grid3X3,
  Layers, BarChart2, Grid, ScatterChart, MessageSquare, Bell
} from 'lucide-react';
import PortfolioFlowChart, { MeasurePoint } from './charts/PortfolioFlowChart';
import CorrelationMatrixPanel from './charts/CorrelationMatrixPanel';

import StackedAreaChart from './charts/StackedAreaChart';
import WaterfallChart from './charts/WaterfallChart';
import HeatmapTimeline from './charts/HeatmapTimeline';
import ScatterPlotChart from './charts/ScatterPlotChart';
import AnnotationPanel from './charts/AnnotationPanel';
import ThresholdAlerts from './charts/ThresholdAlerts';
import { Annotation, ThresholdAlert } from '@/stores/annotationTypes';
import MACDPanel from './charts/MACDPanel';
import DrilldownModal from './charts/DrilldownModal';
import { calculateRSI, calculateMACD, MACDResult } from '@/utils/chartAnalytics';

type ViewMode = 'rateOfChange' | 'cumulative' | 'recoveryRate';

// ... existing ViewMode labels ...

interface SavedSession {
  id: string;
  name: string;
  timestamp: number;
  viewMode: ViewMode;
  isStableMode: boolean;
  comparisonMode: boolean;
  chartConfig: {
    showMovingAvg5: boolean;
    showMovingAvg10: boolean;
    showMovingAvg20: boolean;
    showTrendLine: boolean;
    showReferenceLine: boolean;
    referenceValue: number;
    showCrosshair: boolean;
    showPeakValley: boolean;
    showActive: boolean;
    showRecovered: boolean;
    showEscalated: boolean;
    normalizeView: boolean;
  };
  measurePoints: MeasurePoint[];
}

// Helper Modal Component
const SimpleModal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Alert Component
const SimpleAlert = ({ isOpen, title, description, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }: { isOpen: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void; confirmText?: string; cancelText?: string; isDestructive?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-slate-700 text-slate-300'}`}>
            {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 mb-6 pl-12">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-slate-300 hover:text-white">{cancelText}</Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            className={isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};


const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  rateOfChange: 'Rate of Change',
  cumulative: 'Cumulative Totals',
  recoveryRate: 'Recovery Rate %',
};

interface FullscreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStableMode: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stableHistory: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baselineHistory: any[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Dropdown Menu Component
const ToolDropdown = ({
  label,
  icon: Icon,
  children,
  isOpen,
  onToggle
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="relative">
    <Button
      size="sm"
      variant="ghost"
      onClick={onToggle}
      className="gap-1.5 text-slate-300 hover:bg-slate-800 hover:text-white h-8 px-2.5"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
      <ChevronDown className="w-3 h-3" />
    </Button>
    {isOpen && (
      <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 min-w-[180px] py-1">
        {children}
      </div>
    )}
  </div>
);

// Menu Item Component
const MenuItem = ({
  label,
  icon: Icon,
  checked,
  onClick,
  disabled
}: {
  label: string;
  icon?: React.ElementType;
  checked?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${checked ? 'text-emerald-400' : 'text-slate-300'}`}
  >
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {checked !== undefined && (
      <span className={`w-3 h-3 rounded-sm border ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
        {checked && <span className="block w-full h-full text-white text-[8px] text-center leading-3">✓</span>}
      </span>
    )}
    <span className="flex-1">{label}</span>
  </button>
);

// Statistics Panel Component
const StatsPanel = ({ data, viewMode }: { data: { active?: number; recovered?: number; escalated?: number }[]; viewMode: ViewMode }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const active = data.map(d => d.active || 0);
    const recovered = data.map(d => d.recovered || 0);
    const escalated = data.map(d => d.escalated || 0);

    const calcStats = (arr: number[]) => {
      const sum = arr.reduce((a, b) => a + b, 0);
      const mean = sum / arr.length;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
      const stdDev = Math.sqrt(variance);
      const first = arr[0] || 0;
      const last = arr[arr.length - 1] || 0;
      const growthRate = first !== 0 ? ((last - first) / first) * 100 : 0;
      return { min, max, mean, stdDev, growthRate, sum };
    };

    const activeStats = calcStats(active);
    const recoveredStats = calcStats(recovered);
    const escalatedStats = calcStats(escalated);

    const totalRecovered = recoveredStats.sum;
    const totalEscalated = escalatedStats.sum;
    const recoveryRatio = totalEscalated > 0 ? (totalRecovered / totalEscalated).toFixed(2) : '∞';

    return { active: activeStats, recovered: recoveredStats, escalated: escalatedStats, recoveryRatio };
  }, [data]);

  if (!stats) return null;

  const format = (v: number) => viewMode === 'recoveryRate' ? `${v.toFixed(1)}%` : v.toFixed(1);

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-slate-500 mb-2 font-medium">Metric</div>
          <div className="space-y-1">
            <div className="text-slate-400">Min</div>
            <div className="text-slate-400">Max</div>
            <div className="text-slate-400">Mean</div>
            <div className="text-slate-400">Std Dev</div>
            <div className="text-slate-400">Growth %</div>
          </div>
        </div>
        <div>
          <div className="text-blue-400 mb-2 font-medium">Active</div>
          <div className="space-y-1 text-slate-300">
            <div>{format(stats.active.min)}</div>
            <div>{format(stats.active.max)}</div>
            <div>{format(stats.active.mean)}</div>
            <div>{format(stats.active.stdDev)}</div>
            <div>{stats.active.growthRate.toFixed(1)}%</div>
          </div>
        </div>
        <div>
          <div className="text-emerald-400 mb-2 font-medium">Recovered</div>
          <div className="space-y-1 text-slate-300">
            <div>{format(stats.recovered.min)}</div>
            <div>{format(stats.recovered.max)}</div>
            <div>{format(stats.recovered.mean)}</div>
            <div>{format(stats.recovered.stdDev)}</div>
            <div>{stats.recovered.growthRate.toFixed(1)}%</div>
          </div>
        </div>
        <div>
          <div className="text-red-400 mb-2 font-medium">Escalated</div>
          <div className="space-y-1 text-slate-300">
            <div>{format(stats.escalated.min)}</div>
            <div>{format(stats.escalated.max)}</div>
            <div>{format(stats.escalated.mean)}</div>
            <div>{format(stats.escalated.stdDev)}</div>
            <div>{stats.escalated.growthRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
        <span className="text-slate-400">Recovery Ratio (Recovered ÷ Escalated):</span>
        <span className="text-emerald-400 font-semibold">{stats.recoveryRatio}</span>
      </div>
    </div>
  );
};

const FullscreenChartModal = ({
  isOpen,
  onClose,
  isStableMode,
  stableHistory,
  baselineHistory,
  viewMode,
  onViewModeChange
}: FullscreenChartModalProps) => {
  // UI State
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Tool State
  const [showMovingAvg5, setShowMovingAvg5] = useState(false);
  const [showMovingAvg10, setShowMovingAvg10] = useState(false);
  const [showMovingAvg20, setShowMovingAvg20] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [showReferenceLine, setShowReferenceLine] = useState(false);
  const [referenceValue, setReferenceValue] = useState(0);

  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showPeakValley, setShowPeakValley] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const [showActive, setShowActive] = useState(true);
  const [showRecovered, setShowRecovered] = useState(true);
  const [showEscalated, setShowEscalated] = useState(true);
  const [normalizeView, setNormalizeView] = useState(false);

  const [rangeFilter, setRangeFilter] = useState<'all' | 'last50' | 'last100'>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  // Advanced Analytics State
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [bollingerPeriod, setBollingerPeriod] = useState(20);
  const [bollingerStdDev, setBollingerStdDev] = useState(2);
  const [showRSI, setShowRSI] = useState(false);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [showMACD, setShowMACD] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState(2.5);

  // Forecasting State
  const [showForecast, setShowForecast] = useState(false);
  const [forecastPeriods, setForecastPeriods] = useState(10);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);

  // Correlation Matrix State
  const [showCorrelationMatrix, setShowCorrelationMatrix] = useState(false);

  // Chart Type State
  type ChartType = 'line' | 'stacked' | 'waterfall' | 'heatmap' | 'scatter';
  const [chartType, setChartType] = useState<ChartType>('line');

  // Annotation State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false);

  // Threshold Alerts State
  const [thresholdAlerts, setThresholdAlerts] = useState<ThresholdAlert[]>([
    { id: 'default-high', metric: 'escalated', operator: '>', value: 10, enabled: false, color: '#ef4444', label: 'High Escalation' },
  ]);
  const [showThresholdAlerts, setShowThresholdAlerts] = useState(false);

  // Drilldown State
  // const [drilldownPoint, setDrilldownPoint] = useState<any>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Reset measuring when closed
  useEffect(() => {
    if (!isOpen) {
      // Defer state update to avoid cascading effect
      const t = setTimeout(() => setIsMeasuring(false), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // State Initialization
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [sessionNameInput, setSessionNameInput] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUnsavedAlertOpen, setIsUnsavedAlertOpen] = useState(false);
  const [lastSavedHash, setLastSavedHash] = useState("");

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sgc_chart_sessions');
      if (stored) {
        // Defer loaded state set
        setTimeout(() => setSavedSessions(JSON.parse(stored)), 0);
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, []);

  // Compute current state hash to detect changes
  const currentHash = useMemo(() => {
    const state = {
      viewMode,
      isStableMode,
      comparisonMode,
      measurePoints,
      chartConfig: {
        showMovingAvg5, showMovingAvg10, showMovingAvg20,
        showTrendLine, showReferenceLine, referenceValue,
        showCrosshair, showPeakValley,
        showActive, showRecovered, showEscalated, normalizeView
      }
    };
    return JSON.stringify(state);
  }, [
    viewMode, isStableMode, comparisonMode, measurePoints,
    showMovingAvg5, showMovingAvg10, showMovingAvg20,
    showTrendLine, showReferenceLine, referenceValue,
    showCrosshair, showPeakValley,
    showActive, showRecovered, showEscalated, normalizeView
  ]);

  // Update hash when saving or loading
  const updateLastSavedHash = () => setLastSavedHash(currentHash);

  // Initialize hash on open
  useEffect(() => {
    if (isOpen && !lastSavedHash) {
      // Defer hash update
      setTimeout(() => updateLastSavedHash(), 0);
    }
  }, [isOpen]); // Only run once on open roughly

  // Logic: Handle Save
  const handleSaveSession = () => {
    if (!sessionNameInput.trim()) return;

    const newSession: SavedSession = {
      id: crypto.randomUUID(),
      name: sessionNameInput,
      timestamp: Date.now(),
      viewMode,
      isStableMode,
      comparisonMode,
      measurePoints,
      chartConfig: {
        showMovingAvg5, showMovingAvg10, showMovingAvg20,
        showTrendLine, showReferenceLine, referenceValue,
        showCrosshair, showPeakValley,
        showActive, showRecovered, showEscalated, normalizeView
      }
    };

    const updatedSessions = [newSession, ...savedSessions];
    setSavedSessions(updatedSessions);
    localStorage.setItem('sgc_chart_sessions', JSON.stringify(updatedSessions));

    updateLastSavedHash();
    setIsSaveModalOpen(false);
    setSessionNameInput("");
  };

  // Logic: Handle Load
  const handleLoadSession = (session: SavedSession) => {
    onViewModeChange(session.viewMode);
    setComparisonMode(session.comparisonMode);
    setMeasurePoints(session.measurePoints || []);

    // Set Config
    setShowMovingAvg5(session.chartConfig.showMovingAvg5);
    setShowMovingAvg10(session.chartConfig.showMovingAvg10);
    setShowMovingAvg20(session.chartConfig.showMovingAvg20);
    setShowTrendLine(session.chartConfig.showTrendLine);
    setShowReferenceLine(session.chartConfig.showReferenceLine);
    setReferenceValue(session.chartConfig.referenceValue);
    setShowCrosshair(session.chartConfig.showCrosshair);
    setShowPeakValley(session.chartConfig.showPeakValley);
    setShowActive(session.chartConfig.showActive);
    setShowRecovered(session.chartConfig.showRecovered);
    setShowEscalated(session.chartConfig.showEscalated);
    setNormalizeView(session.chartConfig.normalizeView);

    setIsHistoryModalOpen(false);
    // After state updates flush (next render), hash will match. 
    // We can't synchronously update hash here perfectly but checking hash against new state later works.
    setTimeout(() => updateLastSavedHash(), 100);
  };

  // Logic: Handle Delete
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter(s => s.id !== id);
    setSavedSessions(updated);
    localStorage.setItem('sgc_chart_sessions', JSON.stringify(updated));
  };

  // Logic: Handle Close with Check
  const handleAttemptClose = () => {
    if (currentHash !== lastSavedHash) {
      setIsUnsavedAlertOpen(true);
    } else {
      onClose();
    }
  };

  // Playback animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackIndex(prev => {
        const maxIndex = (isStableMode ? stableHistory : baselineHistory).length;
        if (prev >= maxIndex) {
          // Defer state update to avoid side-effect in reducer/updater
          setTimeout(() => setIsPlaying(false), 0);
          return 0;
        }
        return prev + 1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, stableHistory, baselineHistory, isStableMode]);

  // Current data based on mode and range filter
  const currentData = useMemo(() => {
    const raw = isStableMode ? stableHistory : baselineHistory;
    let filtered = raw;

    if (rangeFilter === 'last50') {
      filtered = raw.slice(-50);
    } else if (rangeFilter === 'last100') {
      filtered = raw.slice(-100);
    }

    if (isPlaying && playbackIndex > 0) {
      filtered = filtered.slice(0, playbackIndex);
    }

    return filtered;
  }, [isStableMode, stableHistory, baselineHistory, rangeFilter, isPlaying, playbackIndex]);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  // Export functions
  const exportPNG = () => {
    if (chartRef.current) {
      // Use html2canvas or similar - for now just alert
      alert('PNG Export: Feature ready for implementation with html2canvas library');
    }
  };

  const exportCSV = () => {
    const headers = ['Time', 'Active', 'Recovered', 'Escalated'];
    const rows = currentData.map(d => [d.time, d.active, d.recovered, d.escalated].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-behavior-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart config for PortfolioFlowChart
  const chartConfig = {
    showMovingAvg5,
    showMovingAvg10,
    showMovingAvg20,
    showTrendLine,
    showReferenceLine,
    referenceValue,
    showCrosshair,
    showPeakValley,
    showActive,
    showRecovered,
    showEscalated,
    normalizeView,
    // Advanced Analytics
    showBollingerBands,
    bollingerPeriod,
    bollingerStdDev,
    showRSI,
    rsiPeriod,
    showMACD,
    showAnomalies,
    anomalyThreshold,
    // Forecasting
    showForecast,
    forecastPeriods,
    showConfidenceInterval,
  };

  // RSI/MACD calculations for sub-panels
  const rsiData = useMemo(() => {
    if (!showRSI || !currentData || currentData.length === 0) return [];
    const activeVals = currentData.map(d => d.active);
    return calculateRSI(activeVals, rsiPeriod);
  }, [currentData, showRSI, rsiPeriod]);

  const macdData = useMemo((): MACDResult[] => {
    if (!showMACD || !currentData || currentData.length === 0) return [];
    const activeVals = currentData.map(d => d.active);
    return calculateMACD(activeVals);
  }, [currentData, showMACD]);

  // Annotation handlers
  const handleAddAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  // Threshold alert handlers
  const handleAddThresholdAlert = useCallback((alert: Omit<ThresholdAlert, 'id'>) => {
    const newAlert: ThresholdAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setThresholdAlerts(prev => [...prev, newAlert]);
  }, []);



  const handleDeleteThresholdAlert = useCallback((id: string) => {
    setThresholdAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleToggleThresholdAlert = useCallback((id: string) => {
    setThresholdAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }, []);

  // Chart type options
  const CHART_TYPES = [
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'stacked', label: 'Stacked Area', icon: Layers },
    { value: 'waterfall', label: 'Waterfall', icon: BarChart2 },
    { value: 'heatmap', label: 'Heatmap', icon: Grid },
    { value: 'scatter', label: 'Scatter Plot', icon: ScatterChart },
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed left-0 right-0 bottom-0 top-[30px] z-40 bg-slate-950 flex flex-col">
      {/* Header with Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 flex-none bg-slate-900/50">
        {/* Tools - Primary Group */}
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          {/* Overlays Menu */}
          <ToolDropdown
            label="Overlays"
            icon={TrendingUp}
            isOpen={activeDropdown === 'overlays'}
            onToggle={() => toggleDropdown('overlays')}
          >
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Moving Averages</div>
            <MenuItem label="5-Point MA" checked={showMovingAvg5} onClick={() => setShowMovingAvg5(!showMovingAvg5)} />
            <MenuItem label="10-Point MA" checked={showMovingAvg10} onClick={() => setShowMovingAvg10(!showMovingAvg10)} />
            <MenuItem label="20-Point MA" checked={showMovingAvg20} onClick={() => setShowMovingAvg20(!showMovingAvg20)} />
            <div className="border-t border-slate-700 my-1" />
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Lines</div>
            <MenuItem label="Trend Line" icon={TrendingUp} checked={showTrendLine} onClick={() => setShowTrendLine(!showTrendLine)} />
            <MenuItem label="Reference Line" icon={Minus} checked={showReferenceLine} onClick={() => setShowReferenceLine(!showReferenceLine)} />
            {showReferenceLine && (
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Value:</span>
                <input
                  type="number"
                  value={referenceValue}
                  onChange={(e) => setReferenceValue(Number(e.target.value))}
                  className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-white"
                />
              </div>
            )}
          </ToolDropdown>

          {/* Statistics */}
          <Button
            size="sm"
            variant={showStatsPanel ? "secondary" : "ghost"}
            onClick={() => setShowStatsPanel(!showStatsPanel)}
            className={`gap-1.5 h-8 px-2.5 ${showStatsPanel ? 'bg-blue-600 hover:bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">Stats</span>
          </Button>

          {/* Analytics Menu */}
          <ToolDropdown
            label="Analytics"
            icon={BrainCircuit}
            isOpen={activeDropdown === 'analytics'}
            onToggle={() => toggleDropdown('analytics')}
          >
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Technical Indicators</div>
            <MenuItem label="Bollinger Bands" checked={showBollingerBands} onClick={() => setShowBollingerBands(!showBollingerBands)} />
            {showBollingerBands && (
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Period:</span>
                <input
                  type="number"
                  value={bollingerPeriod}
                  onChange={(e) => setBollingerPeriod(Number(e.target.value))}
                  className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white"
                  min="5" max="50"
                />
                <span className="text-[10px] text-slate-400">σ:</span>
                <input
                  type="number"
                  value={bollingerStdDev}
                  onChange={(e) => setBollingerStdDev(Number(e.target.value))}
                  className="w-10 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white"
                  min="1" max="4" step="0.5"
                />
              </div>
            )}
            <MenuItem label="RSI (Momentum)" checked={showRSI} onClick={() => setShowRSI(!showRSI)} />
            {showRSI && (
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Period:</span>
                <input
                  type="number"
                  value={rsiPeriod}
                  onChange={(e) => setRsiPeriod(Number(e.target.value))}
                  className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white"
                  min="5" max="30"
                />
              </div>
            )}
            <MenuItem label="MACD" checked={showMACD} onClick={() => setShowMACD(!showMACD)} />
            <div className="border-t border-slate-700 my-1" />
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Detection</div>
            <MenuItem label="Anomaly Detection" checked={showAnomalies} onClick={() => setShowAnomalies(!showAnomalies)} />
            {showAnomalies && (
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Threshold (σ):</span>
                <input
                  type="number"
                  value={anomalyThreshold}
                  onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                  className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white"
                  min="1" max="5" step="0.5"
                />
              </div>
            )}
            <div className="border-t border-slate-700 my-1" />
            <MenuItem label="Correlation Matrix" icon={Grid3X3} onClick={() => setShowCorrelationMatrix(true)} />
          </ToolDropdown>

          {/* Forecast Menu */}
          <ToolDropdown
            label="Forecast"
            icon={Sparkles}
            isOpen={activeDropdown === 'forecast'}
            onToggle={() => toggleDropdown('forecast')}
          >
            <MenuItem label="Show Forecast" checked={showForecast} onClick={() => setShowForecast(!showForecast)} />
            {showForecast && (
              <>
                <div className="px-3 py-1 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Periods:</span>
                  <input
                    type="number"
                    value={forecastPeriods}
                    onChange={(e) => setForecastPeriods(Number(e.target.value))}
                    className="w-12 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white"
                    min="5" max="50"
                  />
                </div>
                <MenuItem label="Confidence Interval" checked={showConfidenceInterval} onClick={() => setShowConfidenceInterval(!showConfidenceInterval)} />
              </>
            )}
          </ToolDropdown>

          {/* Chart Type Selector */}
          <ToolDropdown
            label="Chart"
            icon={CHART_TYPES.find(c => c.value === chartType)?.icon || LineChart}
            isOpen={activeDropdown === 'chartType'}
            onToggle={() => toggleDropdown('chartType')}
          >
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Chart Type</div>
            {CHART_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <MenuItem
                  key={type.value}
                  label={type.label}
                  icon={Icon}
                  checked={chartType === type.value}
                  onClick={() => setChartType(type.value)}
                />
              );
            })}
          </ToolDropdown>

          {/* Annotations Button */}
          <Button
            size="sm"
            variant={showAnnotationPanel ? "secondary" : "ghost"}
            onClick={() => setShowAnnotationPanel(!showAnnotationPanel)}
            className={`gap-1.5 h-8 px-2.5 ${showAnnotationPanel ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">Notes</span>
            {annotations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-purple-500/30 rounded-full">{annotations.length}</span>
            )}
          </Button>

          {/* Threshold Alerts Button */}
          <Button
            size="sm"
            variant={showThresholdAlerts ? "secondary" : "ghost"}
            onClick={() => setShowThresholdAlerts(true)}
            className={`gap-1.5 h-8 px-2.5 ${thresholdAlerts.some(a => a.enabled) ? 'text-amber-400' : 'text-slate-300'} hover:bg-slate-800 hover:text-white`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="text-xs">Alerts</span>
            {thresholdAlerts.filter(a => a.enabled).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500/30 rounded-full">{thresholdAlerts.filter(a => a.enabled).length}</span>
            )}
          </Button>

          {/* Range Menu */}
          <ToolDropdown
            label="Range"
            icon={Activity}
            isOpen={activeDropdown === 'range'}
            onToggle={() => toggleDropdown('range')}
          >
            <MenuItem label="All Data" checked={rangeFilter === 'all'} onClick={() => setRangeFilter('all')} />
            <MenuItem label="Last 100" checked={rangeFilter === 'last100'} onClick={() => setRangeFilter('last100')} />
            <MenuItem label="Last 50" checked={rangeFilter === 'last50'} onClick={() => setRangeFilter('last50')} />
            <div className="border-t border-slate-700 my-1" />
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">Playback</div>
            <div className="flex items-center gap-1 px-2 py-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPlaybackIndex(0)}>
                <SkipBack className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={isPlaying ? "secondary" : "ghost"}
                className="h-6 w-6 p-0"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPlaybackIndex(currentData.length)}>
                <SkipForward className="w-3 h-3" />
              </Button>
            </div>
          </ToolDropdown>

          {/* Measure Menu */}
          <ToolDropdown
            label="Measure"
            icon={Target}
            isOpen={activeDropdown === 'measure'}
            onToggle={() => toggleDropdown('measure')}
          >
            <MenuItem label="Crosshair Cursor" icon={Crosshair} checked={showCrosshair} onClick={() => setShowCrosshair(!showCrosshair)} />
            <MenuItem label="Peak/Valley Markers" icon={Mountain} checked={showPeakValley} onClick={() => setShowPeakValley(!showPeakValley)} />
            <MenuItem label="Distance Measure" icon={Ruler} checked={isMeasuring} onClick={() => setIsMeasuring(!isMeasuring)} />
          </ToolDropdown>

          {/* Lines Menu */}
          <ToolDropdown
            label="Lines"
            icon={LineChart}
            isOpen={activeDropdown === 'lines'}
            onToggle={() => toggleDropdown('lines')}
          >
            <MenuItem label="Active (Blue)" checked={showActive} onClick={() => setShowActive(!showActive)} />
            <MenuItem label="Recovered (Green)" checked={showRecovered} onClick={() => setShowRecovered(!showRecovered)} />
            <MenuItem label="Escalated (Red)" checked={showEscalated} onClick={() => setShowEscalated(!showEscalated)} />
            <div className="border-t border-slate-700 my-1" />
            <MenuItem label="Normalize (0-100%)" checked={normalizeView} onClick={() => setNormalizeView(!normalizeView)} />
          </ToolDropdown>

          {/* Export Menu */}
          <ToolDropdown
            label="Export"
            icon={Download}
            isOpen={activeDropdown === 'export'}
            onToggle={() => toggleDropdown('export')}
          >
            <MenuItem label="Download PNG" onClick={exportPNG} />
            <MenuItem label="Download CSV" onClick={exportCSV} />
          </ToolDropdown>

          {/* History & Save */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsHistoryModalOpen(true)}
            className="gap-1.5 h-8 px-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="text-xs">History</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSaveModalOpen(true)}
            className="gap-1.5 h-8 px-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Save Session"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="text-xs">Save</span>
          </Button>

          <div className="w-px h-6 bg-slate-700 mx-2" />
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="gap-2 text-slate-300 border-slate-700 bg-slate-800 hover:bg-slate-700 h-8"
            >
              <span className="text-xs">{VIEW_MODE_LABELS[viewMode]}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showViewDropdown && (
              <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[160px]">
                {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { onViewModeChange(mode); setShowViewDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${viewMode === mode ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300'}`}
                  >
                    {VIEW_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comparison Mode Toggle */}
          <Button
            size="sm"
            variant={comparisonMode ? "secondary" : "outline"}
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`gap-1.5 h-8 ${comparisonMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-300 border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
          >
            {comparisonMode ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutTemplate className="w-3.5 h-3.5" />}
            <span className="text-xs">Compare</span>
          </Button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Legend Indicators */}
          <div className="flex items-center gap-3 px-2">
            {showActive && (
              <div className="flex items-center gap-1.5" title="Active Accounts">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] text-slate-400">Active</span>
              </div>
            )}
            {showRecovered && (
              <div className="flex items-center gap-1.5" title="Recovered Accounts">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-slate-400">Recovered</span>
              </div>
            )}
            {showEscalated && (
              <div className="flex items-center gap-1.5" title="Escalated Accounts">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-slate-400">Escalated</span>
              </div>
            )}
            {/* If any legend item is shown, ensure separation */}
            {(showActive || showRecovered || showEscalated) && (
              <div className="w-px h-3 bg-slate-800 mx-1" />
            )}
          </div>
          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium ${isStableMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isStableMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isStableMode ? 'STABLE' : 'BASELINE'}
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
            onClick={handleAttemptClose}
            title="Close Fullscreen (ESC)"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Statistics Panel (Collapsible) */}
      {showStatsPanel && (
        <div className="px-6 pt-4 flex-none">
          <StatsPanel data={currentData} viewMode={viewMode} />
        </div>
      )}

      {/* Chart Area */}
      <div className="flex-1 p-6 min-h-0" ref={chartRef}>
        {comparisonMode ? (
          // Comparison Mode: Side-by-side charts
          <div className="h-full w-full grid grid-cols-2 gap-4">
            {/* STABLE Chart */}
            <div className="h-full bg-slate-900 rounded-lg border border-slate-800 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-none">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-emerald-400">STABLE Mode</span>
              </div>
              <div className="flex-1 min-h-0">
                <PortfolioFlowChart
                  isStableMode={true}
                  data={rangeFilter === 'all' ? stableHistory : stableHistory.slice(rangeFilter === 'last50' ? -50 : -100)}
                  viewMode={viewMode}
                  isFullscreen={true}
                  chartConfig={chartConfig}
                  isMeasuring={isMeasuring}
                  measurePoints={measurePoints}
                  onMeasurePointsChange={setMeasurePoints}
                />
              </div>
            </div>

            {/* Baseline Chart */}
            <div className="h-full bg-slate-900 rounded-lg border border-slate-800 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-none">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                <span className="text-sm font-medium text-slate-400">Baseline Mode</span>
              </div>
              <div className="flex-1 min-h-0">
                <PortfolioFlowChart
                  isStableMode={false}
                  data={rangeFilter === 'all' ? baselineHistory : baselineHistory.slice(rangeFilter === 'last50' ? -50 : -100)}
                  viewMode={viewMode}
                  isFullscreen={true}
                  chartConfig={chartConfig}
                  isMeasuring={isMeasuring}
                  measurePoints={measurePoints}
                  onMeasurePointsChange={setMeasurePoints}
                />
              </div>
            </div>
          </div>
        ) : (
          // Single Chart Mode with Chart Type Selection
          <div className="h-full w-full flex flex-col gap-2">
            {/* Main Chart Area */}
            <div className={`${(showRSI || showMACD) ? 'flex-1' : 'h-full'} min-h-0 bg-slate-900 rounded-lg border border-slate-800 p-4`}>
              {chartType === 'line' && (
                <PortfolioFlowChart
                  isStableMode={isStableMode}
                  data={currentData}
                  viewMode={viewMode}
                  isFullscreen={true}
                  chartConfig={chartConfig}
                  isMeasuring={isMeasuring}
                  measurePoints={measurePoints}
                  onMeasurePointsChange={setMeasurePoints}
                />
              )}

              {chartType === 'stacked' && (
                <StackedAreaChart data={currentData} stacked100={normalizeView} />
              )}
              {chartType === 'waterfall' && (
                <WaterfallChart data={currentData} />
              )}
              {chartType === 'heatmap' && (
                <HeatmapTimeline data={currentData} cellsPerRow={25} />
              )}
              {chartType === 'scatter' && (
                <ScatterPlotChart data={currentData} xMetric="active" yMetric="recovered" />
              )}
            </div>

            {/* RSI Sub-Panel */}
            {showRSI && rsiData.length > 0 && (
              <div className="h-24 bg-slate-900 rounded-lg border border-slate-800 p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-medium">RSI ({rsiPeriod})</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Current: </span>
                    <span className={`text-xs font-medium ${rsiData[rsiData.length - 1] > 70 ? 'text-red-400' :
                      rsiData[rsiData.length - 1] < 30 ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                      {rsiData[rsiData.length - 1]?.toFixed(1) || '--'}
                    </span>
                  </div>
                </div>
                <div className="h-14 flex items-end gap-px">
                  {rsiData.slice(-60).map((val, i) => {
                    const height = Math.max(2, (val / 100) * 100);
                    const bgColor = val > 70 ? 'bg-red-500/60' : val < 30 ? 'bg-emerald-500/60' : 'bg-purple-500/40';
                    return (
                      <div
                        key={i}
                        className={`flex-1 ${bgColor} rounded-t-sm transition-all`}
                        style={{ height: `${height}%` }}
                        title={`RSI: ${val.toFixed(1)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                  <span>Oversold &lt;30</span>
                  <span className="text-slate-400">50</span>
                  <span>Overbought &gt;70</span>
                </div>
              </div>
            )}

            {/* MACD Sub-Panel */}
            {/* MACD Sub-Panel */}
            {showMACD && macdData.length > 0 && (
              <MACDPanel data={macdData.slice(-60)} />
            )}
          </div>
        )}
      </div>



      {/* Keyboard Hints */}
      <div className="absolute bottom-6 left-6 text-[10px] text-slate-500">
        {comparisonMode ? 'Comparison Mode: STABLE vs Baseline' : 'Scroll: X-Zoom | Shift+Scroll: Y-Zoom | Drag: Select Range'} | ESC: Close
      </div>

      {/* --- SAVE MODAL --- */}
      <SimpleModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Analysis Session"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSession} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!sessionNameInput.trim()}>
              Save Session
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Session Name</label>
            <input
              autoFocus
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Q4 Analysis - Zoom Level 2"
              value={sessionNameInput}
              onChange={e => setSessionNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveSession()}
            />
          </div>
          <p className="text-xs text-slate-500">
            This will save your current view mode, comparison settings, chart tools, and any measurements you have active.
          </p>
        </div>
      </SimpleModal>

      {/* --- HISTORY MODAL --- */}
      <SimpleModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Analysis History"
      >
        <div className="space-y-2">
          {savedSessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              No saved sessions yet.
            </div>
          ) : (
            savedSessions.map(session => (
              <div
                key={session.id}
                className="group flex items-center justify-between p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
                onClick={() => handleLoadSession(session)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-700/50 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400">
                    <FileClock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200 group-hover:text-white">{session.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(session.timestamp).toLocaleString()} • {VIEW_MODE_LABELS[session.viewMode]}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SimpleModal>

      {/* --- UNSAVED CHANGES ALERT --- */}
      <SimpleAlert
        isOpen={isUnsavedAlertOpen}
        title="Unsaved Changes"
        description="You have ongoing analysis work that hasn't been saved. Do you want to save your progress before closing?"
        confirmText="Discard & Close"
        cancelText="Cancel"
        onConfirm={() => { setIsUnsavedAlertOpen(false); onClose(); }} // Discard
        onCancel={() => setIsUnsavedAlertOpen(false)} // Cancel
        isDestructive={true}
      />

      {/* --- CORRELATION MATRIX PANEL --- */}
      <CorrelationMatrixPanel
        data={currentData}
        isOpen={showCorrelationMatrix}
        onClose={() => setShowCorrelationMatrix(false)}
      />

      {/* --- ANNOTATION PANEL --- */}
      <AnnotationPanel
        annotations={annotations}
        onAdd={handleAddAnnotation}
        onUpdate={handleUpdateAnnotation}
        onDelete={handleDeleteAnnotation}
        currentTime={currentData.length > 0 ? currentData[currentData.length - 1].time : 0}
        isOpen={showAnnotationPanel}
        onClose={() => setShowAnnotationPanel(false)}
      />

      {/* --- THRESHOLD ALERTS MODAL --- */}
      <ThresholdAlerts
        alerts={thresholdAlerts}
        onAdd={handleAddThresholdAlert}
        onDelete={handleDeleteThresholdAlert}
        onToggle={handleToggleThresholdAlert}
        isOpen={showThresholdAlerts}
        onClose={() => setShowThresholdAlerts(false)}
      />

      {/* --- DRILLDOWN MODAL --- */}
      <DrilldownModal
        isOpen={showDrilldown}
        onClose={() => setShowDrilldown(false)}
        dataPoint={null}
        allData={currentData}
      />
    </div>
  );
};

export default FullscreenChartModal;
