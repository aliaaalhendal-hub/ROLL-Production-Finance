import { useListAssets, useCreateAsset } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Box, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthenticatedDelete } from "@/lib/use-authenticated-delete";
import { useTranslation } from "@/lib/i18n";

export default function Assets() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: assets, isLoading, refetch } = useListAssets(projectId ?? "");
  const createAsset = useCreateAsset();
  const { mutateAsync: deleteAsset } = useAuthenticatedDelete();
  const { t, tStatus } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "Cinema Camera Package", vendor: "", cost: 0,
    rentalStart: new Date().toISOString().split('T')[0],
    rentalEnd: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    department: "", paymentStatus: "Pending"
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      await createAsset.mutateAsync({ projectId, data: form });
      setIsOpen(false);
      setForm({ ...form, name: "", vendor: "", cost: 0, department: "" });
      refetch();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (assetId: string) => {
    if (!projectId) return;
    if (window.confirm(t("common.deleteConfirm") || "Are you sure you want to delete this?")) {
      try {
        await deleteAsset(`/api/projects/${projectId}/assets/${assetId}`);
        refetch();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("assets.title")}</h1>
          <p className="text-muted-foreground font-light">{t("assets.subtitle")}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t("asset.add")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl bg-card border border-border rounded-none max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif text-2xl">{t("asset.add")}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("asset.name")}</span>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("common.category")}</span>
                  <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("common.vendor")}</span>
                  <input required value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("common.department")}</span>
                  <input required value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("common.cost")} ({activeProject?.currency})</span>
                  <input type="number" required min="0" value={form.cost} onChange={e => setForm({...form, cost: Number(e.target.value)})} className="w-full bg-input border border-border p-2" />
                </label>
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("asset.status")}</span>
                  <select value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})} className="w-full bg-input border border-border p-2">
                    <option value="Pending">{tStatus("PENDING")}</option>
                    <option value="Paid">{tStatus("PAID")}</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("asset.rentalStart")}</span>
                  <input type="date" required value={form.rentalStart} onChange={e => setForm({...form, rentalStart: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
                <label className="space-y-2 text-xs uppercase tracking-widest">
                  <span>{t("asset.rentalEnd")}</span>
                  <input type="date" required value={form.rentalEnd} onChange={e => setForm({...form, rentalEnd: e.target.value})} className="w-full bg-input border border-border p-2" />
                </label>
              </div>
              <button disabled={createAsset.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest">
                {createAsset.isPending ? t("common.loading") : t("common.save")}
              </button>
            </form>
          </DialogContent>
        </Dialog>
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
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("common.cost")}</div>
                  <div className="font-serif text-xl">${asset.cost.toLocaleString()}</div>
                </div>
                <div>
                   <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("common.status")}</div>
                   <div className={cn("font-medium", asset.paymentStatus.toLowerCase() === 'paid' ? "text-green-500" : "text-primary")}>
                     {tStatus(asset.paymentStatus)}
                   </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-3 border-t border-border bg-background text-xs font-mono text-muted-foreground flex justify-between items-center">
              <div>
                <span>{new Date(asset.rentalStart).toLocaleDateString()}</span>
                <span className="mx-2">&rarr;</span>
                <span>{new Date(asset.rentalEnd).toLocaleDateString()}</span>
              </div>
              <button onClick={() => handleDelete(asset.id)} className="text-destructive hover:text-destructive/80 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {assets?.length === 0 && (
          <div className="col-span-full p-12 text-center border border-border border-dashed text-muted-foreground font-light">
             <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
             {t("empty.assets")}
          </div>
        )}
      </div>
    </div>
  );
}
