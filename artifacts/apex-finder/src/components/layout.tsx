import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Crosshair, Activity, Network, FileTerminal,
  KanbanSquare, Database, ShieldAlert, X, BookOpen, Menu, BrainCircuit, Bot, Radio, Copy, Telescope,
} from "lucide-react";

const navItems = [
  { name: "Intelligence HQ",   href: "/",             icon: Activity },
  { name: "Deep Search",       href: "/deep-search",  icon: BrainCircuit },
  { name: "Network Graph",     href: "/graph",        icon: Network },
  { name: "Intel Terminal",    href: "/research",     icon: FileTerminal },
  { name: "Pipeline CRM",      href: "/crm",          icon: KanbanSquare },
  { name: "Entity Ledger",     href: "/entities",     icon: Database },
  { name: "Persona Loop",      href: "/improvements", icon: Bot },
  { name: "Duplicates",        href: "/duplicates",   icon: Copy },
  { name: "Data Sources",      href: "/data-sources", icon: Radio },
  { name: "OSINT Tools",       href: "/osint-tools",  icon: Telescope },
  { name: "Field Manual",      href: "/manual",       icon: BookOpen },
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
          ? "w-[min(288px,85vw)] h-full"
          : "w-64 flex-shrink-0 h-full"
      )}
    >
      <div className="h-14 md:h-16 flex items-center px-5 border-b border-border shrink-0">
        <Crosshair className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
        <h1 className="text-base md:text-lg font-bold tracking-widest text-primary uppercase font-mono leading-tight truncate">
          ApexFinder Pro
        </h1>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2A3045]">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium transition-colors gap-2.5 border-l-2 rounded-r-md",
                isActive
                  ? "bg-primary/10 text-primary border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border shrink-0">
        <div className="px-3 py-2 flex flex-col gap-1 text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
          <div>v0.2 · 32.5k entities</div>
          <div className="text-[10px] opacity-70">PRIVATE INTELLIGENCE</div>
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
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-card flex-shrink-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors mr-3 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Crosshair className="h-4 w-4 text-primary mr-2 shrink-0" />
          <span className="text-sm font-bold tracking-widest text-primary uppercase font-mono truncate mr-2">
            ApexFinder Pro
          </span>
          <span className="text-muted-foreground/30 mr-2 shrink-0">·</span>
          <span className="text-xs font-mono text-muted-foreground truncate uppercase mt-0.5">
            {navItems.find(item => 
              location === item.href || (item.href !== "/" && location.startsWith(item.href))
            )?.name || "Dashboard"}
          </span>
        </div>

        {/* Compliance Disclaimer Banner */}
        {!bannerDismissed && (
          <div className="flex-shrink-0 bg-amber-950/40 border-b border-amber-600/25 px-3 md:px-4 py-2 flex items-start justify-between z-30 gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-mono text-amber-400/80 leading-snug">
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

        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
