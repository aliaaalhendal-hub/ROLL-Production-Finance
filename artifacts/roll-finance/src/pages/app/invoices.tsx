import { useListInvoices, useCreateInvoice, useUpdateInvoice } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { Loader2, Plus, FileText, CheckCircle, Clock, Upload, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { useAuthenticatedDelete } from "@/lib/use-authenticated-delete";
import { useUploadFile } from "@/lib/use-upload-file";
import { useTranslation } from "@/lib/i18n";

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  vendor: z.string().min(1),
  department: z.string().min(1),
  description: z.string(),
  amount: z.coerce.number().min(0),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.string(),
  attachmentPath: z.string().optional()
});

export default function Invoices() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: invoices, isLoading, refetch } = useListInvoices(projectId ?? "");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { mutateAsync: deleteInvoice } = useAuthenticatedDelete();
  const uploadFile = useUploadFile();
  const { t, tStatus } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: "", vendor: "", department: "", description: "", amount: 0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: "RECEIVED", attachmentPath: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    if (!projectId) return;
    try {
      await createInvoice.mutateAsync({ projectId, data: values });
      setIsOpen(false);
      form.reset();
      refetch();
    } catch (e) { console.error(e); }
  };

  const changeStatus = async (invoiceId: string, status: string) => {
    if (!projectId) return;
    const inv = invoices?.find(i => i.id === invoiceId);
    if (!inv) return;
    await updateInvoice.mutateAsync({ 
      projectId, 
      invoiceId, 
      data: {
        invoiceNumber: inv.invoiceNumber,
        vendor: inv.vendor,
        contractId: inv.contractId,
        department: inv.department,
        description: inv.description,
        amount: inv.amount,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        attachmentPath: inv.attachmentPath,
        status
      }
    });
    refetch();
  };

  const handleDelete = async (invoiceId: string) => {
    if (!projectId) return;
    if (window.confirm(t("common.deleteConfirm") || "Are you sure you want to delete this?")) {
      try {
        await deleteInvoice(`/api/projects/${projectId}/invoices/${invoiceId}`);
        refetch();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadFile.mutateAsync(file);
      form.setValue("attachmentPath", path);
    } catch (e) {
      console.error(e);
    }
  };

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("nav.invoices")}</h1>
          <p className="text-muted-foreground font-light">{t("requests.subtitle")}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t("invoice.add")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl bg-card border border-border rounded-none">
            <DialogHeader><DialogTitle className="font-serif text-2xl">{t("invoice.add")}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("invoice.number")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="vendor" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.vendor")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.department")}</FormLabel>
                    <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("common.amount")} ({activeProject?.currency})</FormLabel>
                    <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="issueDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("invoice.issueDate")}</FormLabel>
                    <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("invoice.dueDate")}</FormLabel>
                    <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("invoice.description")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="attachmentPath" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest">{t("common.notes")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <input {...field} className="w-full bg-input border-border border p-2 rounded-none focus:outline-none focus:border-primary" placeholder="" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-accent px-4 flex items-center justify-center border border-border hover:bg-border transition-colors">
                          {uploadFile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </button>
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
                <button type="submit" disabled={createInvoice.isPending || uploadFile.isPending} className="w-full bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest mt-6">
                  {createInvoice.isPending ? t("common.loading") : t("common.save")}
                </button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {invoices?.map(inv => (
          <div key={inv.id} className="p-6 border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                 {['received', 'under review'].includes(inv.status.toLowerCase().replace('_', ' ')) ? <Clock className="w-6 h-6 text-primary" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{inv.department} • {inv.invoiceNumber}</div>
                <h3 className="font-serif text-xl">{inv.vendor}</h3>
                <p className="text-sm text-muted-foreground mt-1">{inv.description}</p>
                <div className="text-xs text-muted-foreground mt-2 font-mono">{t("invoice.dueDate")}: {new Date(inv.dueDate).toLocaleDateString()}</div>
                {inv.attachmentPath && (
                  <a href={inv.attachmentPath.startsWith("/objects") ? `/api${inv.attachmentPath}` : inv.attachmentPath} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-2 block">
                    {t("common.viewAttachment")}
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-8 md:border-l md:border-border md:pl-8">
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{t("common.amount")}</div>
                 <div className="font-serif text-3xl text-foreground">{activeProject?.currency} {inv.amount.toLocaleString()}</div>
              </div>
              
               {['received', 'under review'].includes(inv.status.toLowerCase().replace('_', ' ')) && (
                <div className="flex flex-col gap-2">
                   <button onClick={() => changeStatus(inv.id, "APPROVED")} className="bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.approve")}
                  </button>
                   <button onClick={() => changeStatus(inv.id, "REJECTED")} className="border border-border text-foreground px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-accent">
                    {t("common.reject")}
                  </button>
                  <button onClick={() => handleDelete(inv.id)} className="text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.delete")}
                  </button>
                </div>
              )}
               {['approved'].includes(inv.status.toLowerCase().replace('_', ' ')) && (
                <div className="flex flex-col gap-2">
                   <button onClick={() => changeStatus(inv.id, "READY TO PAY")} className="bg-green-500 text-white px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("action.markReady")}
                  </button>
                  <button onClick={() => handleDelete(inv.id)} className="text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.delete")}
                  </button>
                </div>
              )}
               {!['received', 'under review', 'approved'].includes(inv.status.toLowerCase().replace('_', ' ')) && (
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "px-4 py-2 border text-xs font-semibold uppercase tracking-widest text-center",
                     inv.status.toLowerCase() === 'ready to pay' ? "border-green-500/30 text-green-500 bg-green-500/5" :
                     inv.status.toLowerCase() === 'paid' ? "border-green-500/30 text-green-500 bg-green-500/5" : "border-destructive/30 text-destructive bg-destructive/5"
                  )}>
                    {tStatus(inv.status)}
                  </div>
                  <button onClick={() => handleDelete(inv.id)} className="text-destructive hover:bg-destructive/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {invoices?.length === 0 && (
          <div className="p-12 text-center border border-border border-dashed text-muted-foreground font-light">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            {t("empty.invoices")}
          </div>
        )}
      </div>
    </div>
  );
}