import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { 
  Film, LayoutDashboard, Wallet, Receipt, FileText, ReceiptText, ClipboardCheck,
  Send, CreditCard, Activity, Box, BrainCircuit, History, 
  Settings, LogOut, Globe, Plus, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectProvider, useActiveProject } from "@/lib/project-context";
import { useTranslation } from "@/lib/i18n";
import { useCreateProject } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const NAV_ITEMS = [
  { href: "/app", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/budget", labelKey: "nav.budget", icon: Wallet },
  { href: "/app/expenses", labelKey: "nav.expenses", icon: Receipt },
  { href: "/app/contracts", labelKey: "nav.contracts", icon: FileText },
  { href: "/app/invoices", labelKey: "nav.invoices", icon: ReceiptText },
  { href: "/app/approvals", labelKey: "nav.approvals", icon: ClipboardCheck },
  { href: "/app/requests", labelKey: "nav.requests", icon: Send },
  { href: "/app/payments", labelKey: "nav.payments", icon: CreditCard },
  { href: "/app/cash-flow", labelKey: "nav.cashFlow", icon: Activity },
  { href: "/app/assets", labelKey: "nav.assets", icon: Box },
  { href: "/app/ai", labelKey: "nav.ai", icon: BrainCircuit },
  { href: "/app/history", labelKey: "nav.history", icon: History },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ProjectProvider>
  );
}

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { activeProject, projects, selectProject, isLoading, error } = useActiveProject();
  const { t, lang, setLang } = useTranslation();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const createProject = useCreateProject();

  const [projectForm, setProjectForm] = useState({
    name: "",
    type: "Feature Film",
    location: "",
    currency: "USD",
    totalBudget: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    productionDays: 30,
    status: "IN PRODUCTION",
    imageUrl: ""
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProj = await createProject.mutateAsync({ data: projectForm });
      selectProject(newProj.id);
      setIsCreateProjectOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <div className="h-screen bg-background" />;
  }

  if (error || !activeProject) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load productions.</p>
      </div>
    );
  }

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
        
        <div className="p-4 border-b border-border relative">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{t("project.current")}</div>
          <div className="font-serif text-lg">
            {activeProject?.name === "THE LAST FRAME" ? t("project.demo") : activeProject?.name || t("project.user")}
          </div>
          <select
            value={activeProject?.id ?? ""}
            onChange={(event) => selectProject(event.target.value)}
            aria-label="Current production"
            className="mt-1 w-full bg-transparent text-sm text-muted-foreground outline-none"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id} className="bg-card text-foreground">
                {project.name}
              </option>
            ))}
          </select>
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <button className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border border-border text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                <Plus className="w-3 h-3" /> {t("project.new")}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border border-border rounded-none">
              <DialogHeader><DialogTitle className="font-serif text-2xl">{t("project.create")}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Project Name</label>
                  <input required value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className="w-full bg-input border border-border p-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Type</label>
                    <input value={projectForm.type} onChange={e => setProjectForm({...projectForm, type: e.target.value})} className="w-full bg-input border border-border p-2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Currency</label>
                    <input value={projectForm.currency} onChange={e => setProjectForm({...projectForm, currency: e.target.value})} className="w-full bg-input border border-border p-2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Location</label>
                  <input value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} className="w-full bg-input border border-border p-2" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Total Budget</label>
                  <input type="number" required min="0" value={projectForm.totalBudget} onChange={e => setProjectForm({...projectForm, totalBudget: Number(e.target.value)})} className="w-full bg-input border border-border p-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">Start Date</label>
                    <input type="date" required value={projectForm.startDate} onChange={e => setProjectForm({...projectForm, startDate: e.target.value})} className="w-full bg-input border border-border p-2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">End Date</label>
                    <input type="date" required value={projectForm.endDate} onChange={e => setProjectForm({...projectForm, endDate: e.target.value})} className="w-full bg-input border border-border p-2" />
                  </div>
                </div>
                <button type="submit" disabled={createProject.isPending} className="w-full bg-primary text-primary-foreground p-3 text-sm font-semibold uppercase tracking-widest">
                  {createProject.isPending ? "Creating..." : "Create"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
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
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
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
            {t("nav.settings")}
          </Link>
          <button 
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden shrink-0">
          <Link href="/app" className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-bold tracking-widest text-primary">ROLL</span>
          </Link>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="p-2 text-muted-foreground hover:text-primary"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>
        {isMobileMenuOpen && (
          <div className="absolute z-50 top-16 inset-x-0 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-card md:hidden">
            <div className="p-4 border-b border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t("project.current")}</div>
              <select
                value={activeProject.id}
                onChange={(event) => {
                  selectProject(event.target.value);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-input border border-border p-3 text-sm text-foreground"
              >
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <nav className="grid grid-cols-2 gap-1 p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact ? location === item.href : location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn("flex items-center gap-2 p-3 text-sm", isActive ? "text-primary bg-primary/10" : "text-muted-foreground")}
                  >
                    <Icon className="w-4 h-4" /> {t(item.labelKey)}
                  </Link>
                );
              })}
              <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" /> {lang === "en" ? "العربية" : "English"}
              </button>
              <button onClick={() => signOut({ redirectUrl: "/" })} className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <LogOut className="w-4 h-4" /> {t("nav.signOut")}
              </button>
            </nav>
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="w-full min-w-0 max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
