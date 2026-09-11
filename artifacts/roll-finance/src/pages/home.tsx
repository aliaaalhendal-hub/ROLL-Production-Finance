import { Link } from "wouter";
import { Film, ArrowRight, Play, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 p-6 md:p-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          <span className="font-serif text-2xl font-bold tracking-widest text-primary">ROLL</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in">
            <button className="text-sm font-medium uppercase tracking-widest hover:text-primary transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center px-6 md:px-20 pt-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 cinematic-gradient"></div>
        
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-primary/30 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Finance Behind the Frame
          </div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-tight mb-8">
            The true cost of <br/>
            <span className="text-primary italic">every frame.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 font-light leading-relaxed">
            ROLL is the cinematic operating system where producers see the true financial position of a production and understand the cost of a decision before approving it.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link href="/sign-up">
              <button className="bg-primary text-primary-foreground px-8 py-4 text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2">
                Enter ROLL <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <button
              type="button"
              onClick={() => document.getElementById("demo-productions")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 text-sm font-semibold uppercase tracking-widest border border-border hover:border-primary transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" /> Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-32 px-6 md:px-20 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Designed for Producers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
              We replaced spreadsheets with a unified system that tracks every dollar from greenlight to wrap.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Live Budgets",
                description: "Real-time visibility into allocated, committed, and paid funds across all departments."
              },
              {
                title: "ROLL AI",
                description: "Simulate the financial impact of production decisions before making them."
              },
              {
                title: "Cash Flow",
                description: "Automated cash flow timeline visualizing exactly when funds are needed."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 border border-border bg-background hover:border-primary/50 transition-colors group">
                <CheckCircle2 className="w-8 h-8 text-primary mb-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-serif text-2xl mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Projects Gallery */}
      <section id="demo-productions" className="py-32 px-6 md:px-20 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <h2 className="font-serif text-4xl md:text-5xl">DEMO PRODUCTIONS</h2>
            <span className="text-sm font-semibold uppercase tracking-widest text-primary hidden md:block">Showcase</span>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative aspect-[4/3] overflow-hidden border border-border">
              <img 
                src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop" 
                alt="Demo Production 1" 
                className="object-cover w-full h-full opacity-60 group-hover:opacity-80 transition-opacity duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                 <span className="text-primary text-xs font-semibold uppercase tracking-widest mb-2">DEMO PRODUCTION · AUTOMOTIVE COMMERCIAL</span>
                 <h3 className="font-serif text-3xl text-white">PORSCHE — NIGHT DRIVE</h3>
              </div>
            </div>
            
            <div className="group relative aspect-[4/3] overflow-hidden border border-border">
              <img 
                src="https://images.unsplash.com/photo-1604928141064-207cea6f5722?q=80&w=2127&auto=format&fit=crop" 
                alt="Demo Production 2" 
                className="object-cover w-full h-full opacity-60 group-hover:opacity-80 transition-opacity duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                 <span className="text-primary text-xs font-semibold uppercase tracking-widest mb-2">DEMO PRODUCTION · SPORTS COMMERCIAL</span>
                 <h3 className="font-serif text-3xl text-white">NIKE — RUN AFTER DARK</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 md:px-20 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-bold tracking-widest text-primary">ROLL</span>
          </div>
          <p className="text-sm text-muted-foreground font-light">
            © {new Date().getFullYear()} ROLL Finance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
