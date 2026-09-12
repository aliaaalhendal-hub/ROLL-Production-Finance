import { useListExpenses, useCreateExpense, useUpdateExpense } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Plus, Receipt, CheckCircle, Clock, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { useAuthenticatedDelete } from "@/lib/use-authenticated-delete";
import { useTranslation } from "@/lib/i18n";

const expenseSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  vendor: z.string().min(1),
  amount: z.coerce.number().min(0),
  date: z.string(),
  category: z.string().min(1),
  notes: z.string(),
  status: z.string()
});

export default function Expenses() {
  const { projectId, isLoading: isProjectLoading } = useActiveProject();
  const { data: expenses, isLoading, refetch } = useListExpenses(projectId ?? "");
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { mutateAsync: deleteExpense } = useAuthenticatedDelete();
  const { t, tStatus } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "", department: "", vendor: "", amount: 0, date: new Date().toISOString().split('T')[0], category: "General", notes: "", status: "PENDING"
    }
  });

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    if (!projectId) return;
    try {
      await createExpense.mutateAsync({ projectId, data: values });
      setIsOpen(false);
      form.reset();
      refetch();
    } catch (e) { console.error(e); }
  };
  
  const changeStatus = async (expenseId: string, status: string) => {
    if (!projectId) return;
    await updateExpense.mutateAsync({ projectId, expenseId, data: { status } });
    refetch();
  };

  const handleDelete = async (expenseId: string) => {
    if (!projectId) return;
    if (window.confirm(t("common.deleteConfirm") || "Are you sure you want to delete this?")) {
      try {
        await deleteExpense(`/api/projects/${projectId}/expenses/${expenseId}`);
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
          <h1 className="font-serif text-4xl mb-2">{t("expense.title")}</h1>
          <p className="text-muted-foreground font-light">{t("expense.subtitle")}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t("expense.log")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border border-border rounded-none">
            <DialogHeader><DialogTitle className="font-serif text-2xl">{t("expense.log")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.title")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.amount")}</FormLabel>
                    <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.department")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="vendor" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.vendor")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.date")}</FormLabel>
                    <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                   <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.category")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.notes")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" placeholder="Optional" /></FormControl></FormItem>
                )} />
                <button type="submit" disabled={createExpense.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest mt-6">
                  {createExpense.isPending ? t("expense.saving") : t("expense.save")}
                </button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-background/50">
            <tr>
              <th className="p-4 font-semibold">{t("common.title")}</th>
              <th className="p-4 font-semibold">{t("common.vendor")}</th>
              <th className="p-4 font-semibold">{t("common.department")}</th>
              <th className="p-4 font-semibold">{t("common.date")}</th>
              <th className="p-4 font-semibold text-right">{t("common.amount")}</th>
              <th className="p-4 font-semibold text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses?.map(exp => (
              <tr key={exp.id} className="hover:bg-accent/50 transition-colors">
                <td className="p-4 font-serif text-base">{exp.title}</td>
                <td className="p-4 text-muted-foreground">{exp.vendor}</td>
                <td className="p-4 text-muted-foreground">{exp.department}</td>
                <td className="p-4 text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="p-4 font-serif text-lg text-primary text-right">${exp.amount.toLocaleString()}</td>
                <td className="p-4 text-right">
                  {exp.status.toLowerCase() === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => changeStatus(exp.id, "APPROVED")} className="px-3 py-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest">{t("common.approve")}</button>
                      <button onClick={() => changeStatus(exp.id, "REJECTED")} className="px-3 py-1 border border-border text-foreground text-xs uppercase tracking-widest hover:bg-accent">{t("common.reject")}</button>
                      <button onClick={() => handleDelete(exp.id)} className="px-3 py-1 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : exp.status.toLowerCase() === "approved" ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => changeStatus(exp.id, "PAID")} className="px-3 py-1 bg-green-500 text-white text-xs uppercase tracking-widest">{t("action.markPaid")}</button>
                      <button onClick={() => handleDelete(exp.id)} className="px-3 py-1 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 items-center">
                      <span className={cn(
                        "px-2 py-1 text-xs uppercase tracking-widest border",
                        exp.status.toLowerCase() === 'paid' ? "text-green-500 border-green-500/30 bg-green-500/5" : "text-destructive border-destructive/30 bg-destructive/5"
                      )}>{tStatus(exp.status)}</span>
                      <button onClick={() => handleDelete(exp.id)} className="px-3 py-1 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {expenses?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground font-light border-dashed">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  {t("empty.expenses")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
