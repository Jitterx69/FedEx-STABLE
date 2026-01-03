import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export const RecoveryPerformanceChart = () => {
    const data = [
        { name: 'Alpha', predicted: 75, actual: 78 },
        { name: 'Beta', predicted: 50, actual: 45 },
        { name: 'Gamma', predicted: 20, actual: 25 },
        { name: 'Delta', predicted: 10, actual: 5 },
    ];

    return (
        <Card className="h-full bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader className="py-2 border-b border-slate-800">
                <CardTitle className="text-sm font-medium text-slate-300">Recovery Variance</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} unit="%" />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#e2e8f0', marginBottom: '0.25rem' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="predicted" fill="#60a5fa" name="AI Predicted" radius={[0, 4, 4, 0]} barSize={10} />
                        <Bar dataKey="actual" fill="#4ade80" name="Actual" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
