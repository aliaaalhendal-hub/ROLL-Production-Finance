import { useGetProjectDashboard } from "@workspace/api-client-react";
import { Loader2, TrendingUp, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useActiveProject } from "@/lib/project-context";

export default function Dashboard() {
  const { projectId, activeProject, isLoading: isProjectLoading, error: projectError } = useActiveProject();
  const { data: dashboard, isLoading, error } = useGetProjectDashboard(projectId ?? "");

  if (isProjectLoading || isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projectError || error || !dashboard) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="font-serif text-2xl mb-2">Unable to load dashboard</h2>
        <p className="text-muted-foreground max-w-md">There was a problem fetching the financial data for this production. Please check your connection or try again later.</p>
      </div>
    );
  }

  const { totals, budgets, insights, upcomingPayments, productionProgress } = dashboard;

  const getInsightIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return AlertTriangle;
      case 'medium': return Info;
      default: return CheckCircle2;
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-destructive border-destructive/20 bg-destructive/5';
      case 'medium': return 'text-primary border-primary/20 bg-primary/5';
      default: return 'text-green-500 border-green-500/20 bg-green-500/5';
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl mb-2">{dashboard.project.name}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground uppercase tracking-widest font-semibold">
          <span>{dashboard.project.type}</span>
          <span>•</span>
          <span>{dashboard.project.location}</span>
          <span>•</span>
          <span className="text-primary">{dashboard.project.status}</span>
        </div>
      </div>

      {/* Primary Financial Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2 p-8 border border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Total Budget</div>
            <div className="font-serif text-5xl md:text-6xl text-primary mb-2">
               {activeProject?.currency} {totals.totalBudget.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {dashboard.project.currency}
            </div>
            <div className="flex gap-8 mt-6 pt-5 border-t border-border/60">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Spent</div>
                <div className="font-serif text-xl">{activeProject?.currency} {totals.spent.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Committed</div>
                <div className="font-serif text-xl">{activeProject?.currency} {totals.committed.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border border-border bg-card flex flex-col justify-center">
          <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Available</div>
          <div className="font-serif text-3xl mb-1">
            {activeProject?.currency} {totals.actuallyAvailable.toLocaleString()}
          </div>
          <div className="w-full bg-accent h-1 mt-4">
            <div 
              className="bg-primary h-full" 
              style={{ width: `${(totals.actuallyAvailable / totals.totalBudget) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-8 border border-border bg-card flex flex-col justify-center">
          <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Forecast Final</div>
          <div className="font-serif text-3xl mb-1">
            {activeProject?.currency} {totals.forecastFinalCost.toLocaleString()}
          </div>
          <div className={cn(
            "text-xs font-semibold uppercase tracking-widest mt-4",
            totals.forecastFinalCost > totals.totalBudget ? "text-destructive" : "text-green-500"
          )}>
            {totals.forecastFinalCost > totals.totalBudget ? 'Over Budget' : 'On Track'}
          </div>
        </div>
      </div>

      {/* Main Grid: AI Insights & Progress */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* AI Insights */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="font-serif text-2xl">ROLL AI Insights</h2>
          </div>
          
          <div className="grid gap-4">
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.severity);
              const colorClass = getInsightColor(insight.severity);
              
              return (
                <div key={insight.id} className={cn("p-6 border flex gap-4 items-start", colorClass)}>
                  <Icon className="w-6 h-6 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-serif text-xl mb-2">{insight.title}</h3>
                    <p className="text-sm opacity-90 leading-relaxed font-light">{insight.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4">
             <Link href="/app/ai" className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-2">
               Open Simulation Engine &rarr;
             </Link>
          </div>
        </div>

        {/* Sidebar: Progress & Upcoming */}
        <div className="space-y-10">
          
          {/* Production Progress */}
          <div className="p-6 border border-border bg-card">
            <h3 className="font-serif text-xl mb-6">Production Status</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold uppercase tracking-widest text-muted-foreground">{productionProgress.phase}</span>
                  <span>{productionProgress.percent}%</span>
                </div>
                <div className="w-full bg-accent h-1.5">
                  <div 
                    className="bg-primary h-full" 
                    style={{ width: `${productionProgress.percent}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground font-light">
                Day {productionProgress.daysCompleted} of {productionProgress.totalDays}
              </div>
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-serif text-xl">Due Next 14 Days</h3>
            </div>
            
            <div className="space-y-3">
              {upcomingPayments.map((payment) => (
                <div key={payment.id} className="p-4 border border-border bg-card hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm truncate pr-4">{payment.recipient}</div>
                     <div className="font-serif text-lg text-primary">{activeProject?.currency} {payment.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider">
                    <span>{payment.label}</span>
                    <span className={cn(payment.daysUntilDue <= 3 && "text-destructive font-semibold")}>
                      {payment.daysUntilDue === 0 ? 'Due Today' : `In ${payment.daysUntilDue} days`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {upcomingPayments.length === 0 && (
              <div className="p-6 text-center border border-border border-dashed text-muted-foreground text-sm font-light">
                No upcoming payments.
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
