import { useMemo } from 'react';
import { calculateCorrelationMatrix } from '@/utils/chartAnalytics';

interface DataPoint {
  time: number;
  active: number;
  recovered: number;
  escalated: number;
}

interface Props {
  data: DataPoint[];
  isOpen: boolean;
  onClose: () => void;
}

const CorrelationMatrixPanel = ({ data, isOpen, onClose }: Props) => {
  const correlations = useMemo(() => {
    if (!data || data.length < 3) return null;
    return calculateCorrelationMatrix(data);
  }, [data]);

  if (!isOpen || !correlations) return null;

  const getCorrelationColor = (value: number): string => {
    const abs = Math.abs(value);
    if (value > 0) {
      // Positive correlation: Blue
      return `rgba(59, 130, 246, ${0.2 + abs * 0.6})`;
    } else {
      // Negative correlation: Red
      return `rgba(239, 68, 68, ${0.2 + abs * 0.6})`;
    }
  };

  const formatCorrelation = (value: number): string => {
    return value.toFixed(3);
  };

  const getCorrelationLabel = (value: number): string => {
    const abs = Math.abs(value);
    if (abs > 0.8) return 'Very Strong';
    if (abs > 0.6) return 'Strong';
    if (abs > 0.4) return 'Moderate';
    if (abs > 0.2) return 'Weak';
    return 'Very Weak';
  };

  const metrics = ['Active', 'Recovered', 'Escalated'];
  
  // Build matrix data
  const matrix = [
    [1, correlations.activeRecovered, correlations.activeEscalated],
    [correlations.activeRecovered, 1, correlations.recoveredEscalated],
    [correlations.activeEscalated, correlations.recoveredEscalated, 1]
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">Correlation Matrix</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Matrix */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-1 text-xs">
            {/* Header row */}
            <div className="p-2"></div>
            {metrics.map((metric, i) => (
              <div
                key={`header-${i}`}
                className="p-2 text-center font-medium text-slate-400"
              >
                {metric}
              </div>
            ))}

            {/* Data rows */}
            {metrics.map((rowMetric, rowIndex) => (
              <>
                <div
                  key={`row-label-${rowIndex}`}
                  className="p-2 text-right font-medium text-slate-400"
                >
                  {rowMetric}
                </div>
                {matrix[rowIndex].map((value, colIndex) => (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="p-3 rounded text-center transition-all hover:scale-105 cursor-default"
                    style={{ backgroundColor: getCorrelationColor(value) }}
                    title={`${getCorrelationLabel(value)} ${value >= 0 ? 'positive' : 'negative'} correlation`}
                  >
                    <div className="text-white font-mono font-semibold">
                      {rowIndex === colIndex ? '1.000' : formatCorrelation(value)}
                    </div>
                    {rowIndex !== colIndex && (
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {getCorrelationLabel(value)}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}></div>
                <span>Negative Correlation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }}></div>
                <span>Positive Correlation</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Values range from -1 (perfect negative) to +1 (perfect positive). 
              Values near 0 indicate no linear relationship.
            </p>
          </div>

          {/* Insights */}
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
            <h4 className="text-xs font-medium text-slate-300 mb-2">Insights</h4>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>
                • Active ↔ Recovered: {' '}
                <span className={correlations.activeRecovered > 0 ? 'text-blue-400' : 'text-red-400'}>
                  {formatCorrelation(correlations.activeRecovered)}
                </span>
                {' '}— {correlations.activeRecovered > 0.3 
                  ? 'Higher activity correlates with more recoveries' 
                  : correlations.activeRecovered < -0.3 
                    ? 'Higher activity correlates with fewer recoveries'
                    : 'Weak relationship'}
              </li>
              <li>
                • Active ↔ Escalated: {' '}
                <span className={correlations.activeEscalated > 0 ? 'text-blue-400' : 'text-red-400'}>
                  {formatCorrelation(correlations.activeEscalated)}
                </span>
                {' '}— {correlations.activeEscalated > 0.3 
                  ? 'Higher activity correlates with more escalations' 
                  : correlations.activeEscalated < -0.3 
                    ? 'Higher activity correlates with fewer escalations'
                    : 'Weak relationship'}
              </li>
              <li>
                • Recovered ↔ Escalated: {' '}
                <span className={correlations.recoveredEscalated > 0 ? 'text-blue-400' : 'text-red-400'}>
                  {formatCorrelation(correlations.recoveredEscalated)}
                </span>
                {' '}— {correlations.recoveredEscalated < -0.3 
                  ? 'Recovery reduces escalations (good!)' 
                  : correlations.recoveredEscalated > 0.3 
                    ? 'Recovery and escalation move together'
                    : 'Independent metrics'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrixPanel;
