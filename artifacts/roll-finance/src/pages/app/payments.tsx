import { useListPayments } from "@workspace/api-client-react";
import { Loader2, CreditCard, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_PROJECT_ID = "demo-1";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments(DEMO_PROJECT_ID);

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Payments</h1>
          <p className="text-muted-foreground font-light">Executed transfers and settled invoices.</p>
        </div>
      </div>

      <div className="border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border bg-background/50">
            <tr>
              <th className="p-4 font-semibold">Recipient</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Mode</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments?.map(pay => (
              <tr key={pay.id} className="hover:bg-accent/50 transition-colors">
                <td className="p-4 font-serif text-lg">{pay.recipient}</td>
                <td className="p-4 text-muted-foreground">{pay.reason}</td>
                <td className="p-4 text-muted-foreground">{pay.date ? new Date(pay.date).toLocaleDateString() : 'N/A'}</td>
                <td className="p-4">
                  <span className="text-xs uppercase tracking-widest border border-border px-2 py-1 bg-background">
                    {pay.mode}
                  </span>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "text-xs uppercase tracking-widest px-2 py-1",
                    pay.status === 'Completed' ? "text-green-500 bg-green-500/10" : "text-primary bg-primary/10"
                  )}>
                    {pay.status}
                  </span>
                </td>
                <td className="p-4 font-serif text-xl text-primary text-right flex justify-end items-center gap-2">
                  ${pay.amount.toLocaleString()}
                </td>
              </tr>
            ))}
            {payments?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground font-light border-dashed">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No payments executed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
