import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { X, DollarSign, Users, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DCABehaviorHeatmap from './console/charts/DCABehaviorHeatmap';
import RecoveryVarianceChart from './console/charts/RecoveryVarianceChart';
import type { DcaAssignment } from '../api';

// --- Shared Modal Layout ---
const ModalLayout = ({ title, icon: Icon, onClose, children }: { title: string, icon: LucideIcon, onClose: () => void, children: ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-none">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <X className="w-5 h-5" />
                </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
                {children}
            </div>
        </div>
    </div>
);

// --- Assigned Cases Modal ---
export const AssignedCasesModal = ({ assignments, onClose }: { assignments: DcaAssignment[], onClose: () => void }) => {
    const stats = useMemo(() => {
        const byStatus = [
            { name: 'Assigned', value: assignments.filter(a => a.status === 'assigned').length, color: '#3b82f6' },
            { name: 'Active', value: assignments.filter(a => a.status === 'active').length, color: '#f59e0b' },
            { name: 'Recovered', value: assignments.filter(a => a.status === 'recovered').length, color: '#10b981' },
            { name: 'Escalated', value: assignments.filter(a => a.status === 'escalated').length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const byDPD = [
            { name: '0-30', value: assignments.filter(a => a.dpd <= 30).length },
            { name: '31-60', value: assignments.filter(a => a.dpd > 30 && a.dpd <= 60).length },
            { name: '61-90', value: assignments.filter(a => a.dpd > 60 && a.dpd <= 90).length },
            { name: '90+', value: assignments.filter(a => a.dpd > 90).length },
        ];

        return { byStatus, byDPD };
    }, [assignments]);

    return (
        <ModalLayout title="Case Load Analysis" icon={Users} onClose={onClose}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex flex-col">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Distribution by Status</h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.byStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.byStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {stats.byStatus.map(s => (
                            <div key={s.name} className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}: {s.value}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex flex-col">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Age Distribution (DPD)</h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.byDPD}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="mt-6 p-4 rounded-lg bg-blue-900/10 border border-blue-900/30">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-blue-400">Inventory Insight</h4>
                        <p className="text-xs text-blue-300/70 mt-1">
                            Your caseload is concentrated in the early-stage delinquency buckets (0-60 DPD).
                            Focusing on "Active" status accounts in this range typically yields the highest recovery rates.
                        </p>
                    </div>
                </div>
            </div>
        </ModalLayout>
    );
};

// --- Active Value Modal ---
export const ActiveValueModal = ({ assignments, onClose }: { assignments: DcaAssignment[], onClose: () => void }) => {
    const stats = useMemo(() => {
        const valueByStatus = [
            { name: 'Assigned', value: assignments.filter(a => a.status === 'assigned').reduce((s, a) => s + a.balance, 0), color: '#3b82f6' },
            { name: 'Active', value: assignments.filter(a => a.status === 'active').reduce((s, a) => s + a.balance, 0), color: '#f59e0b' },
            { name: 'Recovered', value: assignments.filter(a => a.status === 'recovered').reduce((s, a) => s + a.balance, 0), color: '#10b981' },
            { name: 'Escalated', value: assignments.filter(a => a.status === 'escalated').reduce((s, a) => s + a.balance, 0), color: '#ef4444' },
        ];

        return { valueByStatus };
    }, [assignments]);

    return (
        <ModalLayout title="Portfolio Value Analysis" icon={DollarSign} onClose={onClose}>
            <div className="grid grid-cols-1 gap-6 h-full">
                <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-medium text-slate-400 mb-6">Value Distribution ($)</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.valueByStatus} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {stats.valueByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/30">
                    <div className="text-xs text-slate-500 uppercase">Total Liquidatable</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                        ${stats.valueByStatus.filter(x => x.name !== 'Recovered' && x.name !== 'Escalated').reduce((s, x) => s + x.value, 0).toLocaleString()}
                    </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/30">
                    <div className="text-xs text-slate-500 uppercase">Recovery Rate (Value)</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">
                        {(() => {
                            const total = stats.valueByStatus.reduce((s, x) => s + x.value, 0);
                            const rec = stats.valueByStatus.find(x => x.name === 'Recovered')?.value || 0;
                            return total > 0 ? `${((rec / total) * 100).toFixed(1)}%` : '0%';
                        })()}
                    </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/30">
                    <div className="text-xs text-slate-500 uppercase">Avg Balance</div>
                    <div className="text-2xl font-bold text-slate-200 mt-1">
                        ${(stats.valueByStatus.reduce((s, x) => s + x.value, 0) / (assignments.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>
        </ModalLayout>
    );
};

// --- Probability & Heatmap Modal ---
export const ProbabilityModal = ({ dcaId, onClose }: { dcaId: string, onClose: () => void }) => {
    // Static Mock Historical Data for Charts (deterministic to avoid ESLint impure function error)
    const historyData = useMemo(() => {
        // Generate deterministic data based on index
        return Array.from({ length: 30 }, (_, i) => ({
            time: i,
            active: 40 + (i % 20),
            recovered: 8 + (i % 12),
            escalated: 3 + (i % 7),
            cumulativeActive: 0,
            cumulativeRecovered: 0,
            cumulativeEscalated: 0
        }));
    }, []);

    // Mock Agency Data for Heatmap
    const agencyData = useMemo(() => ({
        [dcaId]: historyData
    }), [dcaId, historyData]);

    return (
        <ModalLayout title={`Performace Diagnostics: ${dcaId}`} icon={Zap} onClose={onClose}>
            <div className="space-y-6">
                {/* Heatmap Section */}
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 h-[250px] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-400">Activity Heatmap</h3>
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">30 Days</Badge>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DCABehaviorHeatmap
                            isStableMode={true}
                            agencyData={agencyData}
                            showSparklines={true}
                            isFullscreen={true} // Use simpler view logic
                        />
                    </div>
                </div>

                {/* Variance Section */}
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 h-[300px] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-400">Recovery Variance</h3>
                        <div className="text-xs text-slate-500">Target vs Actual Performance</div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <RecoveryVarianceChart
                            isStableMode={true}
                            history={historyData}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-900/10 border border-emerald-900/30">
                        <div className="text-xs text-emerald-400 uppercase font-medium">Model Confidence</div>
                        <div className="text-2xl font-bold text-white mt-1">72.4%</div>
                        <p className="text-[10px] text-emerald-400/70 mt-1">
                            High confidence in current recovery projections based on recent variance patterns.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-900/30">
                        <div className="text-xs text-blue-400 uppercase font-medium">Projected Uplift</div>
                        <div className="text-2xl font-bold text-white mt-1">+15%</div>
                        <p className="text-[10px] text-blue-400/70 mt-1">
                            Estimated improved recovery vs baseline if current active cases are worked priority.
                        </p>
                    </div>
                </div>
            </div>
        </ModalLayout>
    );
};
