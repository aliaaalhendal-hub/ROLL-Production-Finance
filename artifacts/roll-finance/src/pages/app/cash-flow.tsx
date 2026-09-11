import { useGetCashFlow } from "@workspace/api-client-react";
import { Loader2, Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useActiveProject } from "@/lib/project-context";

export default function CashFlow() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: entries, isLoading } = useGetCashFlow(projectId ?? "");

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Format data for chart
  const chartData = entries?.map(e => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: e.projectedBalance,
    amount: Math.abs(e.amount), // for tooltip
    label: e.label,
    phase: e.phase
  })) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Cash Flow Timeline</h1>
          <p className="text-muted-foreground font-light">Projected balance and funding requirements across production phases.</p>
        </div>
      </div>

      <div className="p-8 border border-border bg-card">
        <h3 className="font-serif text-2xl mb-8">Balance Projection</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43 74% 49%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(43 74% 49%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `${activeProject?.currency} ${(val / 1000).toFixed(0)}k`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 0 }}
                itemStyle={{ color: 'hsl(var(--primary))' }}
                formatter={(value: number) => [`${activeProject?.currency} ${value.toLocaleString()}`, 'Balance']}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-2xl">Timeline Events</h3>
        <div className="grid gap-2">
          {entries?.map(entry => (
            <div key={entry.id} className="p-4 border border-border bg-card flex justify-between items-center group hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="text-sm font-mono text-muted-foreground bg-background px-3 py-1 border border-border">
                  {new Date(entry.date).toLocaleDateString()}
                </div>
                <div>
                  <div className="font-serif text-lg">{entry.label}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{entry.phase}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-serif text-xl ${entry.amount > 0 ? 'text-green-500' : 'text-foreground'}`}>
                  {entry.amount > 0 ? '+' : '-'}{activeProject?.currency} {Math.abs(entry.amount).toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                  Bal: {activeProject?.currency} {entry.projectedBalance.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {entries?.length === 0 && (
             <div className="p-12 text-center border border-border border-dashed text-muted-foreground font-light bg-card">
               <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
               No cash flow projections available.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
