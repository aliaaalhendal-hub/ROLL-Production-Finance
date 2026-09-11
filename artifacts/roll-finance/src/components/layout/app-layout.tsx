import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { 
  Film, LayoutDashboard, Wallet, Receipt, FileText, 
  Send, CreditCard, Activity, Box, BrainCircuit, History, 
  Settings, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/budget", label: "Budget", icon: Wallet },
  { href: "/app/expenses", label: "Expenses", icon: Receipt },
  { href: "/app/contracts", label: "Contracts", icon: FileText },
  { href: "/app/requests", label: "Requests", icon: Send },
  { href: "/app/payments", label: "Payments", icon: CreditCard },
  { href: "/app/cash-flow", label: "Cash Flow", icon: Activity },
  { href: "/app/assets", label: "Assets", icon: Box },
  { href: "/app/ai", label: "ROLL AI", icon: BrainCircuit },
  { href: "/app/history", label: "History", icon: History },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/app" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <Film className="w-6 h-6 text-primary" />
            <span className="font-serif text-xl font-bold tracking-widest text-primary">ROLL</span>
          </Link>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Current Production</div>
          <div className="font-serif text-lg">DEMO PRODUCTIONS</div>
          <div className="text-sm text-muted-foreground">The Grand Budapest (Demo)</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? location === item.href 
              : location.startsWith(item.href);
            
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link 
            href="/app/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-medium",
              location === "/app/settings"
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button 
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center px-4 md:hidden shrink-0">
          <Link href="/app" className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-bold tracking-widest text-primary">ROLL</span>
          </Link>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
