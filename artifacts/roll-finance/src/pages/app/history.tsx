import { useListActivities } from "@workspace/api-client-react";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { useActiveProject } from "@/lib/project-context";

export default function History() {
  const { projectId, isLoading: isProjectLoading } = useActiveProject();
  const { data: activities, isLoading } = useListActivities(projectId ?? "");

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Financial Activity</h1>
          <p className="text-muted-foreground font-light">Immutable ledger of all financial actions on this production.</p>
        </div>
      </div>

      <div className="relative border-l border-border ml-4 space-y-8 py-4">
        {activities?.map(activity => (
          <div key={activity.id} className="relative pl-8 group">
            {/* Timeline node */}
            <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background group-hover:scale-150 transition-transform"></div>
            
            <div className="border border-border bg-card p-4 hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-sm uppercase tracking-widest text-primary">{activity.action}</div>
                <div className="text-xs font-mono text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleString()}
                </div>
              </div>
              <p className="text-foreground font-serif text-lg">{activity.detail}</p>
              {activity.actor && (
                <div className="text-xs text-muted-foreground mt-2">by {activity.actor}</div>
              )}
            </div>
          </div>
        ))}
        {activities?.length === 0 && (
          <div className="pl-8 text-muted-foreground font-light">
             <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
             No activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
