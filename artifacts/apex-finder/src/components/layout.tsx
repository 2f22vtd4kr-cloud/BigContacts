import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Crosshair, Activity, Network, FileTerminal,
  KanbanSquare, Database, ShieldAlert, X, BookOpen, Menu, BrainCircuit, Bot, Radio,
} from "lucide-react";

const navItems = [
  { name: "Intelligence HQ",   href: "/",             icon: Activity },
  { name: "Deep Search",       href: "/deep-search",  icon: BrainCircuit },
  { name: "Network Graph",     href: "/graph",        icon: Network },
  { name: "MCTS Terminal",     href: "/research",     icon: FileTerminal },
  { name: "Pipeline CRM",      href: "/crm",          icon: KanbanSquare },
  { name: "Entity Ledger",     href: "/entities",     icon: Database },
  { name: "Persona Loop",      href: "/improvements",  icon: Bot },
  { name: "Data Sources",      href: "/data-sources",  icon: Radio },
  { name: "Field Manual",      href: "/manual",        icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex flex-col bg-card border-r border-border",
        mobile
          ? "w-72 h-full"
          : "w-64 flex-shrink-0 h-full"
      )}
    >
      <div className="h-14 md:h-16 flex items-center px-5 border-b border-border">
        <Crosshair className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
        <h1 className="text-base md:text-lg font-bold tracking-widest text-primary uppercase font-mono leading-tight">
          ApexFinder Pro
        </h1>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 mr-3 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="px-3 py-2 text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">
          v0.2 · Private Build
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">

      {/* ── Desktop Sidebar (md+) ── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 flex h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-card flex-shrink-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors mr-3"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Crosshair className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm font-bold tracking-widest text-primary uppercase font-mono">
            ApexFinder Pro
          </span>
        </div>

        {/* Compliance Disclaimer Banner */}
        {!bannerDismissed && (
          <div className="flex-shrink-0 bg-amber-950/40 border-b border-amber-600/25 px-3 md:px-4 py-2 flex items-start justify-between z-30 gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] md:text-[11px] font-mono text-amber-400/80 leading-relaxed">
                <span className="text-amber-500 font-bold">COMPLIANCE NOTICE:</span>{" "}
                For professional networking and public-data research only. All data sourced
                exclusively from public registries and OSINT. Comply with GDPR, CCPA, and all
                applicable local privacy legislation. Respect opt-outs immediately.
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-600/60 hover:text-amber-400 flex-shrink-0 transition-colors mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
