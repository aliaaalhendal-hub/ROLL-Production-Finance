import { useListBudgets, useCreateBudget, useUpdateBudget } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Plus, Edit2, AlertCircle, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { useAuthenticatedDelete } from "@/lib/use-authenticated-delete";
import { useTranslation } from "@/lib/i18n";

const budgetSchema = z.object({
  department: z.string().min(1, "Department is required"),
  allocated: z.coerce.number().min(0, "Must be positive")
});

export default function Budgets() {
  const { projectId, isLoading: isProjectLoading } = useActiveProject();
  const { data: budgets, isLoading, refetch } = useListBudgets(projectId ?? "");
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const { mutateAsync: deleteBudget } = useAuthenticatedDelete();
  const { t, tStatus } = useTranslation();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      department: "",
      allocated: 0
    }
  });

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const onSubmit = async (values: z.infer<typeof budgetSchema>) => {
    if (!projectId) return;
    try {
      if (editingId) {
        await updateBudget.mutateAsync({ projectId, budgetId: editingId, data: values });
      } else {
        await createBudget.mutateAsync({ projectId, data: values });
      }
      setIsCreateOpen(false);
      setEditingId(null);
      form.reset();
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (budget: any) => {
    setEditingId(budget.id);
    form.reset({ department: budget.department, allocated: budget.allocated });
    setIsCreateOpen(true);
  };

  const handleDelete = async (budgetId: string) => {
    if (!projectId) return;
    if (window.confirm(t("common.deleteConfirm") || "Are you sure you want to delete this?")) {
      try {
        await deleteBudget(`/api/projects/${projectId}/budgets/${budgetId}`);
        refetch();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("budget.title")}</h1>
          <p className="text-muted-foreground font-light">{t("budget.subtitle")}</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) { setEditingId(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t("budget.add")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border border-border rounded-none">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{editingId ? t("budget.edit") : t("budget.addDialog")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-widest text-muted-foreground">{t("budget.deptName")}</FormLabel>
                      <FormControl>
                        <input {...field} className="w-full bg-input border-border border p-3 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Camera, Art, Locations" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allocated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-widest text-muted-foreground">{t("budget.allocatedAmount")}</FormLabel>
                      <FormControl>
                        <input type="number" {...field} className="w-full bg-input border-border border p-3 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <button type="submit" disabled={createBudget.isPending || updateBudget.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex justify-center items-center">
                  {(createBudget.isPending || updateBudget.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : t("budget.save")}
                </button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {budgets?.map(budget => {
          const percentUsed = ((budget.paid + budget.committed) / budget.allocated) * 100;
          const isOver = percentUsed > 100;
          
          return (
            <div key={budget.id} className="p-6 border border-border bg-card group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-serif text-2xl text-foreground">{budget.department}</h3>
                  <div className="flex gap-4 mt-2 text-xs font-semibold uppercase tracking-widest">
                    <span className="text-muted-foreground">{t("budget.allocatedLabel")} <span className="text-foreground">${budget.allocated.toLocaleString()}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(budget.id)} className="p-2 border border-border text-muted-foreground hover:text-destructive hover:border-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(budget)} className="p-2 border border-border text-muted-foreground hover:text-primary hover:border-primary opacity-0 group-hover:opacity-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-background border border-border">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("common.paid")}</div>
                  <div className="font-serif text-xl">${budget.paid.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-background border border-border">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("dashboard.committed")}</div>
                  <div className="font-serif text-xl">${budget.committed.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-background border border-border">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("common.remaining")}</div>
                  <div className="font-serif text-xl text-primary">${budget.remaining.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-background border border-border">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("dashboard.forecast")}</div>
                  <div className={cn("font-serif text-xl", budget.forecast > budget.allocated && "text-destructive")}>
                    ${budget.forecast.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-widest">
                  <span className="text-muted-foreground">{t("budget.utilization")}</span>
                  <span className={isOver ? "text-destructive flex items-center gap-1" : "text-primary"}>
                    {isOver && <AlertCircle className="w-3 h-3" />}
                    {percentUsed.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-accent h-2 flex">
                  <div className="bg-foreground h-full" style={{ width: `${(budget.paid / budget.allocated) * 100}%` }} title="Paid" />
                  <div className="bg-primary/50 h-full" style={{ width: `${(budget.committed / budget.allocated) * 100}%` }} title="Committed" />
                  {isOver && <div className="bg-destructive h-full" style={{ width: `${percentUsed - 100}%` }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
