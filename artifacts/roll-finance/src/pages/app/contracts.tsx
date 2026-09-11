import {
  useCreateContract,
  useCreatePayment,
  useGetProjectDashboard,
  useListContracts,
  useProcessPayment,
} from "@workspace/api-client-react";
import { Loader2, FileText, Download, Plus } from "lucide-react";
import { useActiveProject } from "@/lib/project-context";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Contracts() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: contracts, isLoading, refetch } = useListContracts(projectId ?? "");
  const { data: dashboard } = useGetProjectDashboard(projectId ?? "");
  const createContract = useCreateContract();
  const createPayment = useCreatePayment();
  const processPayment = useProcessPayment();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingInstallment, setPendingInstallment] = useState<{
    contractId: string;
    contractTitle: string;
    recipient: string;
    installmentId: string;
    amount: number;
  } | null>(null);
  const [form, setForm] = useState({
    title: "",
    party: "",
    role: "",
    department: "",
    value: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "ACTIVE",
    notes: "",
  });

  const submitContract = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || !activeProject || !form.title || !form.party || form.value <= 0) return;
    const first = Math.round(form.value * 0.25 * 100) / 100;
    const second = Math.round((form.value - first) / 2 * 100) / 100;
    const third = form.value - first - second;
    await createContract.mutateAsync({
      projectId,
      data: {
        ...form,
        currency: activeProject.currency,
        startDate: form.startDate,
        endDate: form.endDate,
        paymentSchedule: [
          { label: "INSTALLMENT 01", amount: first, dueDate: form.startDate, status: "UPCOMING" },
          { label: "INSTALLMENT 02", amount: second, dueDate: form.endDate, status: "UPCOMING" },
          { label: "INSTALLMENT 03", amount: third, dueDate: form.endDate, status: "UPCOMING" },
        ],
      },
    });
    setIsCreateOpen(false);
    setForm((current) => ({ ...current, title: "", party: "", role: "", department: "", value: 0, notes: "" }));
    await refetch();
    await queryClient.invalidateQueries();
  };

  const confirmInstallmentPayment = async () => {
    if (!projectId || !pendingInstallment) return;
    const payment = await createPayment.mutateAsync({
      projectId,
      data: {
        recipient: pendingInstallment.recipient,
        reason: `${pendingInstallment.contractTitle} installment`,
        amount: pendingInstallment.amount,
        relatedContractId: pendingInstallment.contractId,
        status: "PENDING",
        mode: "TEST",
      },
    });
    await processPayment.mutateAsync({ projectId, paymentId: payment.id });
    setPendingInstallment(null);
    await queryClient.invalidateQueries();
  };

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Contracts</h1>
          <p className="text-muted-foreground font-light">Crew, cast, and vendor agreements with payment schedules.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-primary-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Contract
        </button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border border-border rounded-none">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Create Contract</DialogTitle></DialogHeader>
          <form onSubmit={submitContract} className="grid grid-cols-2 gap-4 pt-4">
            {[
              ["title", "Contract Title"],
              ["party", "Contract Party"],
              ["role", "Role / Service"],
              ["department", "Department"],
            ].map(([name, label]) => (
              <label key={name} className="space-y-2 text-xs uppercase tracking-widest">
                <span>{label}</span>
                <input
                  required
                  value={form[name as keyof typeof form] as string}
                  onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                  className="w-full bg-input border border-border p-3 text-foreground normal-case tracking-normal"
                />
              </label>
            ))}
            <label className="space-y-2 text-xs uppercase tracking-widest">
              <span>Contract Value ({activeProject?.currency})</span>
              <input required min="1" type="number" value={form.value} onChange={(event) => setForm({ ...form, value: Number(event.target.value) })} className="w-full bg-input border border-border p-3 text-foreground" />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-widest">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full bg-input border border-border p-3 text-foreground">
                <option>DRAFT</option><option>ACTIVE</option><option>COMPLETED</option><option>CANCELLED</option>
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-widest">
              <span>Start Date</span>
              <input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="w-full bg-input border border-border p-3 text-foreground" />
            </label>
            <label className="space-y-2 text-xs uppercase tracking-widest">
              <span>End Date</span>
              <input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="w-full bg-input border border-border p-3 text-foreground" />
            </label>
            <label className="col-span-2 space-y-2 text-xs uppercase tracking-widest">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full bg-input border border-border p-3 text-foreground normal-case tracking-normal" />
            </label>
            <button disabled={createContract.isPending} className="col-span-2 bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest">
              {createContract.isPending ? "Creating..." : "Create Contract"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-2 gap-6">
        {contracts?.map(contract => (
          <div key={contract.id} className="border border-border bg-card">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{contract.department}</div>
                <h3 className="font-serif text-2xl mb-1">{contract.title}</h3>
                <p className="text-muted-foreground">{contract.party} • {contract.role}</p>
              </div>
              <div className="text-right">
                 <div className="font-serif text-2xl text-foreground">{contract.currency} {contract.value.toLocaleString()}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{contract.status}</div>
              </div>
            </div>
            
            <div className="p-6 bg-background/50">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Payment Schedule</div>
              <div className="space-y-3">
                {contract.paymentSchedule.map(payment => (
                  <div key={payment.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="font-medium mr-4">{payment.label}</span>
                      <span className="text-muted-foreground">{new Date(payment.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="font-serif">{contract.currency} {payment.amount.toLocaleString()}</span>
                      <span className="text-xs px-2 py-0.5 border border-border uppercase tracking-wider bg-card">
                         {payment.status}
                      </span>
                       {payment.status.toLowerCase() !== "paid" && (
                         <button
                           type="button"
                           onClick={() => setPendingInstallment({
                             contractId: contract.id,
                             contractTitle: contract.title,
                             recipient: contract.party,
                             installmentId: payment.id,
                             amount: payment.amount,
                           })}
                           className="text-xs uppercase tracking-widest text-primary font-semibold"
                         >
                           Pay
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-between items-center bg-card">
              <div className="text-sm">
                <span className="text-muted-foreground mr-2">Remaining:</span>
                 <span className="font-serif text-primary text-lg">{activeProject?.currency} {contract.remainingAmount.toLocaleString()}</span>
              </div>
              <button className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground hover:text-primary transition-colors font-semibold">
                <Download className="w-4 h-4" /> Doc
              </button>
            </div>
          </div>
        ))}
        {contracts?.length === 0 && (
          <div className="col-span-full p-12 text-center border border-border border-dashed text-muted-foreground font-light">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No contracts found.
          </div>
        )}
      </div>

      <Dialog open={Boolean(pendingInstallment)} onOpenChange={(open) => !open && setPendingInstallment(null)}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-none">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Confirm Test Payment</DialogTitle></DialogHeader>
          {pendingInstallment && (
            <div className="space-y-4 pt-4">
              {[
                ["Recipient", pendingInstallment.recipient],
                ["Amount", `${activeProject?.currency} ${pendingInstallment.amount.toLocaleString()}`],
                ["Reason", `${pendingInstallment.contractTitle} installment`],
                ["Related Contract", pendingInstallment.contractTitle],
                ["Available Before Payment", `${activeProject?.currency} ${(dashboard?.totals.actuallyAvailable ?? 0).toLocaleString()}`],
                ["Available After Payment", `${activeProject?.currency} ${((dashboard?.totals.actuallyAvailable ?? 0) - pendingInstallment.amount).toLocaleString()}`],
                ["ROLL AI Risk", pendingInstallment.amount > (dashboard?.totals.actuallyAvailable ?? 0) * 0.15 ? "MODERATE" : "LOW"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 border-b border-border pb-3 text-sm">
                  <span className="text-muted-foreground uppercase tracking-widest text-xs">{label}</span>
                  <span className="text-right">{value}</span>
                </div>
              ))}
              <div className="flex gap-4 pt-3">
                <button type="button" onClick={() => setPendingInstallment(null)} className="flex-1 border border-border p-3 text-xs uppercase tracking-widest font-semibold">Cancel</button>
                <button type="button" disabled={createPayment.isPending || processPayment.isPending} onClick={confirmInstallmentPayment} className="flex-1 bg-primary text-primary-foreground p-3 text-xs uppercase tracking-widest font-semibold">
                  {createPayment.isPending || processPayment.isPending ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
