import { useListPaymentRequests, useCreatePaymentRequest, useUpdatePaymentRequest } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Plus, Send, Clock, CheckCircle, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { useAuthenticatedDelete } from "@/lib/use-authenticated-delete";
import { useTranslation } from "@/lib/i18n";

const requestSchema = z.object({
  recipient: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  dueDate: z.string(),
  department: z.string().min(1),
  notes: z.string().default(""),
  status: z.string().default("REQUESTED")
});

export default function PaymentRequests() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: requests, isLoading, refetch } = useListPaymentRequests(projectId ?? "");
  const createRequest = useCreatePaymentRequest();
  const updateRequest = useUpdatePaymentRequest();
  const { mutateAsync: deleteRequest } = useAuthenticatedDelete();
  const { t, tStatus } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      recipient: "", description: "", amount: 0, dueDate: new Date().toISOString().split('T')[0], department: "", notes: "", status: "REQUESTED"
    }
  });

  const onSubmit = async (values: z.infer<typeof requestSchema>) => {
    if (!projectId) return;
    try {
      await createRequest.mutateAsync({ projectId, data: values });
      setIsOpen(false);
      form.reset();
      refetch();
    } catch (e) { console.error(e); }
  };

  const changeStatus = async (requestId: string, status: string) => {
    if (!projectId) return;
    await updateRequest.mutateAsync({ projectId, requestId, data: { status } });
    await refetch();
  };

  const handleDelete = async (requestId: string) => {
    if (!projectId) return;
    if (window.confirm(t("common.deleteConfirm") || "Are you sure you want to delete this?")) {
      try {
        await deleteRequest(`/api/projects/${projectId}/payment-requests/${requestId}`);
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
          <h1 className="font-serif text-4xl mb-2">{t("requests.title")}</h1>
          <p className="text-muted-foreground font-light">{t("requests.subtitle")}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t("request.new")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border border-border rounded-none">
            <DialogHeader><DialogTitle className="font-serif text-2xl">{t("request.new")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="recipient" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("request.recipient")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("request.amount")} ({activeProject?.currency})</FormLabel>
                    <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("request.description")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.department")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("request.dueDate")}</FormLabel>
                    <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.notes")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" placeholder="Optional" /></FormControl></FormItem>
                )} />
                <button type="submit" disabled={createRequest.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest mt-6">
                  {createRequest.isPending ? t("request.submitting") : t("request.submit")}
                </button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {requests?.map(req => (
          <div key={req.id} className="p-6 border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                 {['requested', 'under review', 'pending'].includes(req.status.toLowerCase().replace('_', ' ')) ? <Clock className="w-6 h-6 text-primary" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{req.department}</div>
                <h3 className="font-serif text-xl">{req.recipient}</h3>
                <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                <div className="text-xs text-muted-foreground mt-2 font-mono">{t("request.dueDate")}: {new Date(req.dueDate).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-8 md:border-l md:border-border md:pl-8">
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{t("request.amount")}</div>
                 <div className="font-serif text-3xl text-foreground">{activeProject?.currency} {req.amount.toLocaleString()}</div>
              </div>
              
               {['requested', 'under review', 'pending'].includes(req.status.toLowerCase().replace('_', ' ')) && (
                <div className="flex flex-col gap-2">
                   <button onClick={() => changeStatus(req.id, "APPROVED")} className="bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.approve")}
                  </button>
                   <button onClick={() => changeStatus(req.id, "REJECTED")} className="border border-border text-foreground px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-accent">
                    {t("common.reject")}
                  </button>
                  <button onClick={() => handleDelete(req.id)} className="text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.delete")}
                  </button>
                </div>
              )}
               {!['requested', 'under review', 'pending'].includes(req.status.toLowerCase().replace('_', ' ')) && (
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "px-4 py-2 border text-xs font-semibold uppercase tracking-widest text-center",
                     req.status.toLowerCase() === 'approved' ? "border-green-500/30 text-green-500 bg-green-500/5" : "border-destructive/30 text-destructive bg-destructive/5"
                  )}>
                    {tStatus(req.status)}
                  </div>
                  <button onClick={() => handleDelete(req.id)} className="text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {requests?.length === 0 && (
          <div className="p-12 text-center border border-border border-dashed text-muted-foreground font-light">
            <Send className="w-12 h-12 mx-auto mb-4 opacity-20" />
            {t("empty.requests")}
          </div>
        )}
      </div>
    </div>
  );
}
