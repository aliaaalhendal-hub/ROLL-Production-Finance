import { useListContracts } from "@workspace/api-client-react";
import { Loader2, FileText, Download } from "lucide-react";

const DEMO_PROJECT_ID = "demo-1";

export default function Contracts() {
  const { data: contracts, isLoading } = useListContracts(DEMO_PROJECT_ID);

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Contracts</h1>
          <p className="text-muted-foreground font-light">Crew, cast, and vendor agreements with payment schedules.</p>
        </div>
      </div>

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
                <div className="font-serif text-2xl text-foreground">${contract.value.toLocaleString()}</div>
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
                      <span className="font-serif">${payment.amount.toLocaleString()}</span>
                      <span className="text-xs px-2 py-0.5 border border-border uppercase tracking-wider bg-card">
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-between items-center bg-card">
              <div className="text-sm">
                <span className="text-muted-foreground mr-2">Remaining:</span>
                <span className="font-serif text-primary text-lg">${contract.remainingAmount.toLocaleString()}</span>
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
    </div>
  );
}
