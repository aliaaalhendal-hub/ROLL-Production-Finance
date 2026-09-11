import { useListExpenses, useCreateExpense } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Plus, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DEMO_PROJECT_ID = "demo-1";

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
  const { data: expenses, isLoading, refetch } = useListExpenses(DEMO_PROJECT_ID);
  const createExpense = useCreateExpense();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "", department: "", vendor: "", amount: 0, date: new Date().toISOString().split('T')[0], category: "General", notes: "", status: "Pending"
    }
  });

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    try {
      await createExpense.mutateAsync({ projectId: DEMO_PROJECT_ID, data: values });
      setIsOpen(false);
      form.reset();
      refetch();
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Expenses</h1>
          <p className="text-muted-foreground font-light">Track petty cash, purchases, and ad-hoc production costs.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Expense
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border border-border rounded-none">
            <DialogHeader><DialogTitle className="font-serif text-2xl">Log Expense</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Title</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Amount ($)</FormLabel>
                    <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Department</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="vendor" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Vendor</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Date</FormLabel>
                    <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                   <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">Category</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <button type="submit" disabled={createExpense.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest mt-6">
                  {createExpense.isPending ? 'Saving...' : 'Save Expense'}
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
              <th className="p-4 font-semibold">Title</th>
              <th className="p-4 font-semibold">Vendor</th>
              <th className="p-4 font-semibold">Dept</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold text-right">Amount</th>
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
              </tr>
            ))}
            {expenses?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground font-light border-dashed">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
