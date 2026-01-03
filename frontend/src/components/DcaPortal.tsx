import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { fetchDcaAssignments, resolveAccount, DcaAssignment } from '../api';
import { X, User, Phone, Calendar, DollarSign, Activity } from 'lucide-react';
import { AssignedCasesModal, ActiveValueModal, ProbabilityModal } from './DcaAnalyticsModals';

const CaseDetailsModal = ({
    assignment,
    isOpen,
    onClose
}: {
    assignment: DcaAssignment | null,
    isOpen: boolean,
    onClose: () => void
}) => {
    if (!isOpen || !assignment) return null;

    // Mock details that aren't in the API yet
    const mockDetails = {
        name: "John Doe", // Placeholder
        phone: "+1 (555) 0123-4567",
        email: "john.doe@example.com",
        lastContact: "2 days ago",
        notes: [
            { date: "2024-01-02", author: "System", text: "Account assigned to DCA_ALPHA" },
            { date: "2023-12-28", author: "Internal", text: "Promise to pay broke. Escalated." }
        ]
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Case Details</h2>
                            <p className="text-sm text-slate-400 font-mono">{assignment.account_id}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Outstanding Balance</div>
                            <div className="text-2xl font-bold text-white flex items-center gap-1">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                {assignment.balance.toFixed(2)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Days Past Due</div>
                            <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {assignment.dpd}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Assignment Status</div>
                            <Badge className={`mt-1 text-sm ${assignment.status === 'assigned' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200'}`}>
                                {assignment.status}
                            </Badge>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                            <User className="w-4 h-4" /> Customer Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-slate-800 bg-slate-950/30">
                            <div>
                                <div className="text-xs text-slate-500">Name</div>
                                <div className="text-sm text-slate-200">{mockDetails.name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Last Contact</div>
                                <div className="text-sm text-slate-200">{mockDetails.lastContact}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Phone</div>
                                <div className="text-sm text-slate-200 flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-slate-400" /> {mockDetails.phone}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Email</div>
                                <div className="text-sm text-slate-200">{mockDetails.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Notes */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Activity History
                        </h3>
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                            {mockDetails.notes.map((note, idx) => (
                                <div key={idx} className="flex gap-3 text-sm">
                                    <div className="w-24 flex-none text-xs text-slate-500 pt-1 text-right">{note.date}</div>
                                    <div className="flex-1 p-3 rounded bg-slate-800/50 border border-slate-800">
                                        <p className="text-slate-300">{note.text}</p>
                                        <div className="text-[10px] text-slate-500 mt-1">by {note.author}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                        Close
                    </Button>
                    {assignment.status === 'assigned' && (
                        <Button className="bg-green-600 hover:bg-green-700">
                            Resolve Case
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const DcaPortal = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [dcaId, setDcaId] = useState('DCA_ALPHA');
    const [assignments, setAssignments] = useState<DcaAssignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<DcaAssignment | null>(null);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchId, setSearchId] = useState('');
    const [minBalance, setMinBalance] = useState('');
    const [maxBalance, setMaxBalance] = useState('');

    // Summary Card Modal State
    const [activeModal, setActiveModal] = useState<'cases' | 'value' | 'probability' | null>(null);

    useEffect(() => {
        if (isLoggedIn) {
            loadAssignments();
        }
    }, [isLoggedIn, dcaId]);

    const loadAssignments = async () => {
        try {
            const data = await fetchDcaAssignments(dcaId);
            setAssignments(data);
        } catch (error) {
            console.error("Failed to fetch assignments", error);
        }
    };

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleResolve = async (assignment: DcaAssignment) => {
        if (confirm(`Confirm resolution for account ${assignment.account_id}?`)) {
            try {
                await resolveAccount(assignment.account_id, assignment.balance); // Resolving for full balance for simplicity
                await loadAssignments(); // Refresh list
                if (selectedAssignment?.assignment_id === assignment.assignment_id) {
                    setSelectedAssignment(null);
                }
            } catch (error) {
                console.error("Failed to resolve", error);
                alert("Failed to resolve account");
            }
        }
    };

    // Filter Logic
    const filteredAssignments = assignments.filter(a => {
        const matchesStatus = filterStatus === 'all' || a.status.toLowerCase() === filterStatus.toLowerCase();
        const matchesId = a.account_id.toLowerCase().includes(searchId.toLowerCase());
        const matchesMinBal = minBalance === '' || a.balance >= Number(minBalance);
        const matchesMaxBal = maxBalance === '' || a.balance <= Number(maxBalance);
        return matchesStatus && matchesId && matchesMinBal && matchesMaxBal;
    });

    // Calculate Stats (on full dataset, not filtered)
    const totalAssigned = assignments.length;
    const activeValue = assignments.filter(a => a.status === 'assigned' || a.status === 'active').reduce((sum, a) => sum + a.balance, 0);
    // Note: Gateway doesn't return probability yet, so we'll mock or omitted it.
    // For now, let's omit avg prob or keep it static/mocked if we want to preserve UI layout.
    const avgProb = 0.72; // Placeholder until integrated

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <Card className="w-[350px] bg-slate-900 border-slate-800 text-white">
                    <CardHeader>
                        <CardTitle>DCA Partner Portal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Agency ID</label>
                            <Input
                                value={dcaId}
                                onChange={(e) => setDcaId(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
                            Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold">DCA Workspace</h1>
                        <p className="text-slate-400">Logged in as <span className="text-blue-400">{dcaId}</span></p>
                    </div>
                    <Button variant="outline" onClick={() => setIsLoggedIn(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        Logout
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                        className="bg-slate-900 border-slate-800 text-white cursor-pointer hover:border-blue-500/50 transition-colors"
                        onClick={() => setActiveModal('cases')}
                    >
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Assigned Cases</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{totalAssigned}</div></CardContent>
                    </Card>
                    <Card
                        className="bg-slate-900 border-slate-800 text-white cursor-pointer hover:border-emerald-500/50 transition-colors"
                        onClick={() => setActiveModal('value')}
                    >
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Active Value</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-400">${activeValue.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card
                        className="bg-slate-900 border-slate-800 text-white cursor-pointer hover:border-blue-500/50 transition-colors"
                        onClick={() => setActiveModal('probability')}
                    >
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Avg Probability (Est)</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-blue-400">{(avgProb * 100).toFixed(0)}%</div></CardContent>
                    </Card>
                </div>

                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Your Case Load</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="text-slate-400 hover:text-white"
                        >
                            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {showFilters && (
                            <div className="mb-6 p-4 rounded-lg bg-slate-950/50 border border-slate-800 space-y-4 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Status</label>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="active">Active</option>
                                            <option value="recovered">Recovered</option>
                                            <option value="escalated">Escalated</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Search Account ID</label>
                                        <Input
                                            placeholder="e.g. 3b2b..."
                                            value={searchId}
                                            onChange={(e) => setSearchId(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Min Balance</label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={minBalance}
                                            onChange={(e) => setMinBalance(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Max Balance</label>
                                        <Input
                                            type="number"
                                            placeholder="Any"
                                            value={maxBalance}
                                            onChange={(e) => setMaxBalance(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredAssignments.length === 0 && (
                                <div className="text-center p-8 text-slate-500">
                                    {assignments.length === 0 ? `No assignments found for ${dcaId}` : 'No cases match your filters'}
                                </div>
                            )}
                            {filteredAssignments.map(a => (
                                <div key={a.assignment_id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-lg text-slate-200">{a.account_id}</span>
                                            <Badge className={
                                                ['assigned', 'active'].includes(a.status.toLowerCase()) ? 'bg-blue-900/50 text-blue-200 border-blue-800' :
                                                    a.status.toLowerCase() === 'recovered' ? 'bg-emerald-900/50 text-emerald-200 border-emerald-800' :
                                                        'bg-red-900/50 text-red-200 border-red-800'
                                            }>
                                                {a.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            DPD: <span className="text-slate-200">{a.dpd}</span> • Bal: <span className="text-slate-200 font-medium">${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                                            onClick={() => setSelectedAssignment(a)}
                                        >
                                            View
                                        </Button>
                                        {['assigned', 'active'].includes(a.status.toLowerCase()) && (
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20" onClick={() => handleResolve(a)}>Resolve</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CaseDetailsModal
                assignment={selectedAssignment}
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
            />

            {activeModal === 'cases' && (
                <AssignedCasesModal assignments={assignments} onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'value' && (
                <ActiveValueModal assignments={assignments} onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'probability' && (
                <ProbabilityModal dcaId={dcaId} onClose={() => setActiveModal(null)} />
            )}
        </div>
    );
};

export default DcaPortal;
