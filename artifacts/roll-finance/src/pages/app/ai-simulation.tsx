import { useSimulateDecision, useApproveDecision, useRejectDecision } from "@workspace/api-client-react";
import { useState } from "react";
import { BrainCircuit, Loader2, Play, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_PROJECT_ID = "demo-1";

export default function AiSimulation() {
  const [prompt, setPrompt] = useState("");
  const simulate = useSimulateDecision();
  const approve = useApproveDecision();
  const reject = useRejectDecision();

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await simulate.mutateAsync({ projectId: DEMO_PROJECT_ID, data: { description: prompt } });
  };

  const handleApprove = async () => {
    if (!simulate.data) return;
    await approve.mutateAsync({ projectId: DEMO_PROJECT_ID, decisionId: simulate.data.id });
    setPrompt("");
    simulate.reset();
  };

  const handleReject = async () => {
    if (!simulate.data) return;
    await reject.mutateAsync({ projectId: DEMO_PROJECT_ID, decisionId: simulate.data.id });
    setPrompt("");
    simulate.reset();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2 flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-primary" /> 
            ROLL AI
          </h1>
          <p className="text-muted-foreground font-light">Simulate the financial impact of a production decision before committing.</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSimulate} className="mb-10">
          <label className="block text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Describe the decision to simulate
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Add one additional shoot day in London"
              className="flex-1 bg-input border border-border p-4 text-lg focus:outline-none focus:border-primary transition-colors"
              disabled={simulate.isPending || !!simulate.data}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || simulate.isPending || !!simulate.data}
              className="bg-primary text-primary-foreground px-8 py-4 font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {simulate.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Run
            </button>
          </div>
        </form>

        {simulate.data && (
          <div className="border border-border bg-card animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-border">
              <h2 className="font-serif text-3xl mb-2">Simulation Impact</h2>
              <p className="text-muted-foreground">"{simulate.data.description}"</p>
            </div>
            
            <div className="grid md:grid-cols-2">
              <div className="p-8 border-r border-border border-b md:border-b-0">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Financial Shifts</div>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Available Funds</div>
                    <div className="flex items-center gap-4">
                      <span className="font-serif text-xl line-through opacity-50">${simulate.data.currentAvailable.toLocaleString()}</span>
                      <span className="text-primary">&rarr;</span>
                      <span className="font-serif text-3xl">${simulate.data.newAvailable.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Estimated Cost</div>
                    <div className="font-serif text-3xl text-destructive">
                      -${simulate.data.estimatedCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-background/50">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Risk Assessment</div>
                
                <div className="mb-6 flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 text-xs font-semibold uppercase tracking-widest border",
                    simulate.data.riskLevel === 'High' ? "border-destructive text-destructive bg-destructive/10" : "border-primary text-primary bg-primary/10"
                  )}>
                    {simulate.data.riskLevel} Risk
                  </span>
                  {simulate.data.riskLevel === 'High' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                </div>
                
                <div className="mb-2 text-sm text-muted-foreground">Affected Departments:</div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {simulate.data.affectedDepartments.map(d => (
                    <span key={d} className="px-2 py-1 bg-card border border-border text-xs uppercase tracking-widest">{d}</span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-4 bg-background">
              <button
                onClick={handleReject}
                disabled={approve.isPending || reject.isPending}
                className="px-6 py-3 border border-border text-foreground text-sm font-semibold uppercase tracking-widest hover:bg-accent transition-colors flex items-center gap-2"
              >
                {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Reject Idea
              </button>
              <button
                onClick={handleApprove}
                disabled={approve.isPending || reject.isPending}
                className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve & Execute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
