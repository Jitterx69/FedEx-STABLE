import { useState } from 'react';
import { Plus, Trash2, X, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ThresholdAlert {
  id: string;
  metric: 'active' | 'recovered' | 'escalated';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  enabled: boolean;
  color?: string;
  label: string;
}

interface Props {
  alerts: ThresholdAlert[];
  onAdd: (alert: Omit<ThresholdAlert, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<ThresholdAlert>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const METRIC_OPTIONS = [
  { value: 'active', label: 'Active', color: '#3b82f6' },
  { value: 'recovered', label: 'Recovered', color: '#10b981' },
  { value: 'escalated', label: 'Escalated', color: '#ef4444' },
] as const;

const OPERATOR_OPTIONS = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
  { value: '==', label: '=' },
] as const;

const ThresholdAlerts = ({
  alerts,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
  isOpen,
  onClose
}: Props) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newAlert, setNewAlert] = useState<Omit<ThresholdAlert, 'id'>>({
    metric: 'escalated',
    operator: '>',
    value: 10,
    enabled: true,
    label: 'New Alert',
    color: '#ef4444',
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newAlert.label.trim()) return;
    onAdd(newAlert);
    setNewAlert({
      metric: 'escalated',
      operator: '>',
      value: 10,
      enabled: true,
      label: 'New Alert',
      color: '#ef4444',
    });
    setIsAdding(false);
  };

  const getMetricColor = (metric: string) => {
    return METRIC_OPTIONS.find(m => m.value === metric)?.color || '#64748b';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Threshold Alerts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Existing Alerts */}
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No threshold alerts configured</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-all ${
                    alert.enabled 
                      ? 'bg-slate-800/70 border-slate-600' 
                      : 'bg-slate-800/30 border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggle(alert.id)}
                        className={`p-1 rounded ${alert.enabled ? 'text-emerald-400' : 'text-slate-500'}`}
                        title={alert.enabled ? 'Disable' : 'Enable'}
                      >
                        {alert.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                      <span className="text-xs font-medium text-white">{alert.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      onClick={() => onDelete(alert.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span 
                      className="px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: getMetricColor(alert.metric) }}
                    >
                      {alert.metric}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {OPERATOR_OPTIONS.find(o => o.value === alert.operator)?.label}
                    </span>
                    <span className="text-white font-medium">{alert.value}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add New Alert */}
          {!isAdding ? (
            <Button 
              onClick={() => setIsAdding(true)}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Threshold Alert
            </Button>
          ) : (
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Alert Label</label>
                <input
                  type="text"
                  value={newAlert.label}
                  onChange={(e) => setNewAlert({ ...newAlert, label: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                  placeholder="Enter alert name..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Metric</label>
                  <select
                    value={newAlert.metric}
                    onChange={(e) => setNewAlert({ 
                      ...newAlert, 
                      metric: e.target.value as typeof newAlert.metric,
                      color: getMetricColor(e.target.value)
                    })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                  >
                    {METRIC_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Operator</label>
                  <select
                    value={newAlert.operator}
                    onChange={(e) => setNewAlert({ ...newAlert, operator: e.target.value as typeof newAlert.operator })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                  >
                    {OPERATOR_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Value</label>
                  <input
                    type="number"
                    value={newAlert.value}
                    onChange={(e) => setNewAlert({ ...newAlert, value: Number(e.target.value) })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAdd}
                  className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                  disabled={!newAlert.label.trim()}
                >
                  Add Alert
                </Button>
                <Button 
                  onClick={() => setIsAdding(false)}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500">
          <p>Enabled alerts will display reference lines on the chart and trigger visual indicators when thresholds are crossed.</p>
        </div>
      </div>
    </div>
  );
};

export default ThresholdAlerts;
