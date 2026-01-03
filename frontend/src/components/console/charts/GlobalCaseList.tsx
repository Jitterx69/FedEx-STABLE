import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Account } from "../../../api"; // Import Account type

interface GlobalCaseListProps {
    accounts: Account[];
}

export const GlobalCaseList = ({ accounts }: GlobalCaseListProps) => {
    return (
        <Card className="bg-slate-900 border-slate-800 flex-1 min-h-[400px] flex flex-col">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-sm font-medium text-slate-400">Global Case Ledger (Real-Time)</h3>
                <Badge variant="secondary" className="text-xs">{accounts.length} Active</Badge>
            </div>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 sticky top-0 bg-opacity-90 backdrop-blur-sm z-10">
                            <tr>
                                <th className="p-3 font-medium text-slate-500">Account ID</th>
                                <th className="p-3 font-medium text-slate-500 text-right">Balance</th>
                                <th className="p-3 font-medium text-slate-500 text-center">DoPD</th>
                                <th className="p-3 font-medium text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {accounts.map((c) => (
                                <tr key={c.account_id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-mono text-slate-300">{c.account_id}</td>
                                    <td className="p-3 text-right text-slate-300">${c.outstanding_balance.toFixed(2)}</td>
                                    <td className="p-3 text-center text-slate-400">{c.days_past_due}</td>
                                    <td className="p-3">
                                        <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 border-none 
                                            ${c.status === 'resolved' ? 'bg-green-900/40 text-green-400' :
                                                c.status === 'escalated' ? 'text-red-400 bg-red-900/40' :
                                                    c.status === 'assigned' ? 'bg-emerald-900/40 text-emerald-400' :
                                                        'bg-blue-900/40 text-blue-400'}`}>
                                            {c.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                        No active accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
