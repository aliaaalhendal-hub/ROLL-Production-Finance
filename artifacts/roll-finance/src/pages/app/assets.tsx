import { useListAssets } from "@workspace/api-client-react";
import { Loader2, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";

export default function Assets() {
  const { projectId, isLoading: isProjectLoading } = useActiveProject();
  const { data: assets, isLoading } = useListAssets(projectId ?? "");

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Production Assets</h1>
          <p className="text-muted-foreground font-light">Track rented and purchased equipment across departments.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {assets?.map(asset => (
          <div key={asset.id} className="border border-border bg-card hover:border-primary/50 transition-colors flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase tracking-widest border border-border px-2 py-1">{asset.category}</span>
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">{asset.department}</span>
              </div>
              <h3 className="font-serif text-2xl mb-1">{asset.name}</h3>
              <p className="text-muted-foreground text-sm">via {asset.vendor}</p>
            </div>
            
            <div className="p-6 bg-background/50 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Cost</div>
                  <div className="font-serif text-xl">${asset.cost.toLocaleString()}</div>
                </div>
                <div>
                   <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Status</div>
                   <div className={cn("font-medium", asset.paymentStatus === 'Paid' ? "text-green-500" : "text-primary")}>
                     {asset.paymentStatus}
                   </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-3 border-t border-border bg-background text-xs font-mono text-muted-foreground flex justify-between">
              <span>{new Date(asset.rentalStart).toLocaleDateString()}</span>
              <span>&rarr;</span>
              <span>{new Date(asset.rentalEnd).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {assets?.length === 0 && (
          <div className="col-span-full p-12 text-center border border-border border-dashed text-muted-foreground font-light">
             <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
             No assets tracked yet.
          </div>
        )}
      </div>
    </div>
  );
}
