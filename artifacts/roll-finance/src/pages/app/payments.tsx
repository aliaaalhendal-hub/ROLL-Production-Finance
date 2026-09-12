import {
  useGetProjectDashboard,
  useListPaymentRequests,
  useListPayments,
  useCreatePayment,
  useProcessPayment,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, CreditCard, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/lib/project-context";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

export default function Payments() {
  const { projectId, activeProject, isLoading: isProjectLoading } = useActiveProject();
  const { data: dashboard, isLoading } = useGetProjectDashboard(projectId ?? "");
  const { data: requests = [] } = useListPaymentRequests(projectId ?? "");
  const { data: payments = [] } = useListPayments(projectId ?? "");
  const createPayment = useCreatePayment();
  const processPayment = useProcessPayment();
  const queryClient = useQueryClient();
  const { t, tStatus } = useTranslation();

  const [activeTab, setActiveTab] = useState("READY TO PAY");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<"review" | "processing" | "success">("review");
  const [completedPayment, setCompletedPayment] = useState<any>(null);

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const upcoming = (dashboard?.upcomingPayments || []).map((payment) => ({
    ...payment,
    sourceType: "REQUEST",
    sourceId: payment.id,
  }));
  const readyToPay = requests
    .filter((request) => request.status.toUpperCase().replaceAll("_", " ") === "APPROVED")
    .map((request) => ({
      id: request.id,
      label: request.description,
      recipient: request.recipient,
      amount: request.amount,
      dueDate: request.dueDate,
      daysUntilDue: Math.ceil((new Date(request.dueDate).getTime() - Date.now()) / 86400000),
      sourceType: "REQUEST",
      sourceId: request.id,
    }));
  const processing = payments.filter((payment) => payment.status.toUpperCase() === "PROCESSING");
  const completed = payments.filter((payment) => payment.status.toUpperCase() === "PAID");
  const failed = payments.filter((payment) => payment.status.toUpperCase() === "FAILED");

  const currentList: any[] =
    activeTab === "UPCOMING" ? upcoming :
    activeTab === "READY TO PAY" ? readyToPay :
    activeTab === "PROCESSING" ? processing :
    activeTab === "FAILED" ? failed :
    completed;

  const handlePayNow = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentStep("review");
  };

  const handleTestPayment = async (mode: string) => {
    if (!projectId || !selectedPayment) return;
    setPaymentStep("processing");
    
    try {
      const payRecord = await createPayment.mutateAsync({
        projectId,
        data: {
          recipient: selectedPayment.recipient,
          reason: selectedPayment.label,
          amount: selectedPayment.amount,
          status: "PENDING",
          mode: "TEST",
          method: mode,
          relatedRequestId: selectedPayment.sourceType === "REQUEST" ? selectedPayment.sourceId : null,
          sourceType: selectedPayment.sourceType,
          sourceId: selectedPayment.sourceId,
        } as any
      });
      const result = await processPayment.mutateAsync({ projectId, paymentId: payRecord.id });
      setCompletedPayment(result);
      await queryClient.invalidateQueries();
      setTimeout(() => {
        setPaymentStep("success");
      }, 800);
    } catch (e) {
      console.error(e);
      setPaymentStep("review");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("payments.title")}</h1>
          <p className="text-muted-foreground font-light">{t("payments.subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-8 border-b border-border">
        {["UPCOMING", "READY TO PAY", "PROCESSING", "COMPLETED", "FAILED"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-xs font-semibold uppercase tracking-widest transition-colors relative",
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tStatus(tab)}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {currentList.map(pay => (
          <div key={pay.id} className="p-6 border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">{pay.label}</div>
              <h3 className="font-serif text-2xl">{pay.recipient}</h3>
              <div className="text-sm text-muted-foreground mt-1">{t("invoice.dueDate")} {pay.daysUntilDue} • {new Date(pay.dueDate).toLocaleDateString()}</div>
            </div>
            
            <div className="flex items-center gap-8 md:border-l md:border-border md:pl-8">
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{t("common.amount")}</div>
                 <div className="font-serif text-3xl text-foreground">{activeProject?.currency} {pay.amount.toLocaleString()}</div>
              </div>
              
              {activeTab === "READY TO PAY" && (
                 <button onClick={() => handlePayNow(pay)} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90">
                  {t("payment.payNow")}
                </button>
              )}
            </div>
          </div>
        ))}
        {currentList.length === 0 && (
          <div className="p-12 text-center border border-border border-dashed text-muted-foreground font-light">
             <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
             {t("empty.payments")}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border border-border rounded-none p-0">
          {paymentStep === "review" && selectedPayment && (
            <div className="p-8">
              <DialogHeader><DialogTitle className="font-serif text-3xl mb-6">{t("payment.summary")}</DialogTitle></DialogHeader>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("payment.recipient")}</div>
                  <div className="font-serif text-xl">{selectedPayment.recipient}</div>
                </div>
                <div>
                   <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("common.amount")}</div>
                   <div className="font-serif text-2xl text-primary">{activeProject?.currency} {selectedPayment.amount.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-background/50 border border-border">
                   <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{t("payment.positionBefore")}</div>
                   <div className="flex justify-between items-center">
                     <span>{t("payment.availableFunds")}</span>
                     <span className="font-serif text-xl">{activeProject?.currency} {(dashboard?.totals.actuallyAvailable ?? 0).toLocaleString()}</span>
                   </div>
                </div>
                
                <div className="p-6 bg-background/50 border border-border">
                   <div className="text-xs uppercase tracking-widest text-primary mb-4">{t("payment.afterThis")}</div>
                   <div className="flex justify-between items-center">
                     <span>{t("payment.projectedAvailable")}</span>
                     <span className="font-serif text-xl">{activeProject?.currency} {((dashboard?.totals.actuallyAvailable ?? 0) - selectedPayment.amount).toLocaleString()}</span>
                   </div>
                </div>
                
                <div className="p-4 border border-border bg-card flex gap-4 items-center">
                  <div className="p-2 bg-primary/10 text-primary uppercase text-xs font-bold tracking-widest border border-primary/20">{t("payment.lowRisk")}</div>
                  <div className="text-sm text-muted-foreground">{t("payment.riskDesc")}</div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button onClick={() => handleTestPayment("KNET")} className="flex-1 bg-primary text-primary-foreground p-4 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 flex justify-center items-center gap-2">
                  <CreditCard className="w-4 h-4" /> {t("payment.knet")}
                </button>
                <button onClick={() => handleTestPayment("CARD")} className="flex-1 border border-border text-foreground p-4 text-sm font-semibold uppercase tracking-widest hover:bg-accent flex justify-center items-center gap-2">
                  <CreditCard className="w-4 h-4" /> {t("payment.card")}
                </button>
              </div>
            </div>
          )}

          {paymentStep === "processing" && (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
              <h2 className="font-serif text-2xl mb-2">{t("payment.processingTitle")}</h2>
              <p className="text-muted-foreground">{t("payment.processingDesc")}</p>
            </div>
          )}

          {paymentStep === "success" && selectedPayment && (
            <div className="p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <CheckCircle2 className="w-32 h-32" />
              </div>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="font-serif text-3xl mb-2 text-green-500">{t("payment.successTitle")}</h2>
              <p className="text-muted-foreground mb-8">
                {t("payment.transaction")} {completedPayment?.transactionReference || "ROLL TEST"}
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mb-8 border border-border p-6">
                 <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("payment.recipient")}</div>
                 <div className="font-medium text-right">{selectedPayment.recipient}</div>
                 <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("common.amount")}</div>
                 <div className="font-serif text-primary text-right">{activeProject?.currency} {selectedPayment.amount.toLocaleString()}</div>
                 <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("common.title")}</div>
                 <div className="font-medium text-right">{activeProject?.name}</div>
              </div>

              <div className="flex gap-4 justify-center">
                 <button onClick={() => setSelectedPayment(null)} className="border border-border px-6 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-accent">
                   {t("payment.viewProject")}
                 </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}