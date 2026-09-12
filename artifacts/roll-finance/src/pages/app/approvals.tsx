import { 
  useListContracts, 
  useListInvoices, 
  useListExpenses, 
  useListPaymentRequests,
  useUpdateContract,
  useUpdateInvoice,
  useUpdateExpense,
  useUpdatePaymentRequest,
  useGetProjectDashboard
} from "@workspace/api-client-react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useActiveProject } from "@/lib/project-context";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";

export default function Approvals() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const queryClient = useQueryClient();
  const pId = projectId ?? "";
  const { t } = useTranslation();
  
  const { data: dashboard } = useGetProjectDashboard(pId);
  const { data: contracts, isLoading: isLoadingContracts } = useListContracts(pId);
  const { data: invoices, isLoading: isLoadingInvoices } = useListInvoices(pId);
  const { data: expenses, isLoading: isLoadingExpenses } = useListExpenses(pId);
  const { data: requests, isLoading: isLoadingRequests } = useListPaymentRequests(pId);
  
  const updateContract = useUpdateContract();
  const updateInvoice = useUpdateInvoice();
  const updateExpense = useUpdateExpense();
  const updateRequest = useUpdatePaymentRequest();

  const isLoading = isProjectLoading || isLoadingContracts || isLoadingInvoices || isLoadingExpenses || isLoadingRequests;

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const pendingContracts = contracts?.filter(c => c.status === "PENDING APPROVAL") || [];
  const pendingInvoices = invoices?.filter(i => i.status === "UNDER REVIEW") || [];
  const pendingExpenses = expenses?.filter(e => e.status === "PENDING") || [];
  const pendingRequests = requests?.filter(r => r.status === "UNDER REVIEW" || r.status === "REQUESTED") || [];

  const totalPending = pendingContracts.length + pendingInvoices.length + pendingExpenses.length + pendingRequests.length;

  const handleApprove = async (type: string, id: string) => {
    if (!projectId) return;
    if (type === "contract") await updateContract.mutateAsync({ projectId, contractId: id, data: { status: "ACTIVE" } });
    if (type === "invoice") {
      const inv = invoices?.find(i => i.id === id);
      if (inv) await updateInvoice.mutateAsync({ projectId, invoiceId: id, data: { ...inv, status: "APPROVED" } });
    }
    if (type === "expense") await updateExpense.mutateAsync({ projectId, expenseId: id, data: { status: "APPROVED" } });
    if (type === "request") await updateRequest.mutateAsync({ projectId, requestId: id, data: { status: "APPROVED" } });
    await queryClient.invalidateQueries();
  };

  const handleReject = async (type: string, id: string) => {
    if (!projectId) return;
    if (type === "contract") await updateContract.mutateAsync({ projectId, contractId: id, data: { status: "REJECTED" } });
    if (type === "invoice") {
      const inv = invoices?.find(i => i.id === id);
      if (inv) await updateInvoice.mutateAsync({ projectId, invoiceId: id, data: { ...inv, status: "REJECTED" } });
    }
    if (type === "expense") await updateExpense.mutateAsync({ projectId, expenseId: id, data: { status: "REJECTED" } });
    if (type === "request") await updateRequest.mutateAsync({ projectId, requestId: id, data: { status: "REJECTED" } });
    await queryClient.invalidateQueries();
  };

  const renderItem = (type: string, id: string, title: string, amount: number, department: string, party: string) => {
    const available = dashboard?.totals.actuallyAvailable ?? 0;
    const availableAfter = available - amount;
    const isHighRisk = availableAfter < 0;

    return (
      <div key={id} className="p-6 border border-border bg-card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{department} • {type.toUpperCase()}</div>
            <h3 className="font-serif text-2xl mb-1">{title}</h3>
            <p className="text-muted-foreground">{party}</p>
          </div>
          <div className="text-right">
             <div className="font-serif text-3xl text-foreground">{activeProject?.currency} {amount.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div className="p-4 bg-background border border-border">
             <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("approvals.before")}</div>
             <div className="font-serif text-lg">{activeProject?.currency} {available.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-background border border-border">
             <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("approvals.after")}</div>
             <div className={`font-serif text-lg ${isHighRisk ? 'text-destructive' : 'text-primary'}`}>
               {activeProject?.currency} {availableAfter.toLocaleString()}
             </div>
          </div>
          <div className="p-4 bg-background border border-border">
             <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("approvals.risk")}</div>
             <div className={`font-serif text-lg ${isHighRisk ? 'text-destructive' : 'text-green-500'}`}>
               {isHighRisk ? t("approvals.highRisk") : t("approvals.lowRisk")}
             </div>
          </div>
        </div>

        <div className="flex gap-4">
           <button onClick={() => handleApprove(type, id)} className="flex-1 bg-primary text-primary-foreground p-3 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-primary/90">
             <CheckCircle className="w-4 h-4" /> {t("common.approve")}
           </button>
           <button onClick={() => handleReject(type, id)} className="flex-1 border border-border text-foreground p-3 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-accent">
             <XCircle className="w-4 h-4" /> {t("common.reject")}
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("approvals.title")}</h1>
          <p className="text-muted-foreground font-light">{t("approvals.subtitle")}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("approvals.pendingItems")}</div>
          <div className="font-serif text-3xl">{totalPending}</div>
        </div>
      </div>

      <div className="space-y-6">
        {totalPending === 0 && (
          <div className="p-12 text-center border border-border border-dashed text-muted-foreground font-light">
             <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
             {t("empty.approvals")}
          </div>
        )}
        
        {pendingContracts.map(c => renderItem("contract", c.id, c.title, c.value, c.department, c.party))}
        {pendingInvoices.map(i => renderItem("invoice", i.id, i.description || i.invoiceNumber, i.amount, i.department, i.vendor))}
        {pendingExpenses.map(e => renderItem("expense", e.id, e.title, e.amount, e.department, e.vendor))}
        {pendingRequests.map(r => renderItem("request", r.id, r.description, r.amount, r.department, r.recipient))}
      </div>
    </div>
  );
}