import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Crosshair, Network, Terminal,
  KanbanSquare, X, BookOpen, Menu, MessageSquare,
  Search, Users, Activity, Cog, Telescope,
  Copy, Database, Bot, ChevronDown, ChevronRight, ShieldAlert, List,
} from "lucide-react";

// ─── Navigation structure ─────────────────────────────────────────────────────
const mainNav = [
  { name: "Intel HQ",      href: "/",          icon: Activity },
  { name: "Entity Ledger", href: "/profiles",  icon: List },
  { name: "Search",        href: "/search",    icon: Search },
  { name: "Network Graph", href: "/network",   icon: Network },
  { name: "Intel Terminal",href: "/research",  icon: Terminal },
  { name: "CRM Pipeline",  href: "/pipeline",  icon: KanbanSquare },
  { name: "Outreach",      href: "/outreach",  icon: MessageSquare },
];

const toolsNav = [
  { name: "Persona Loop",  href: "/improvements",  icon: Bot },
  { name: "Data Sources",  href: "/data-sources",  icon: Database },
  { name: "OSINT Tools",   href: "/osint-tools",   icon: Telescope },
  { name: "Duplicates",    href: "/duplicates",    icon: Copy },
  { name: "Background Jobs", href: "/jobs",        icon: Cog },
  { name: "Field Manual",  href: "/manual",        icon: BookOpen },
];

// All nav items flattened (used for mobile top bar active-page lookup)
const allNav = [...mainNav, ...toolsNav];

// ─── Bottom nav items ─────────────────────────────────────────────────────────
const bottomNavItems = [
  { href: "/",         icon: Activity, label: "Home" },
  { href: "/search",   icon: Search,   label: "Search" },
  { href: "/profiles", icon: List,     label: "Profiles" },
  { href: "/network",  icon: Network,  label: "Graph" },
];

function MobileBottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const [location] = useLocation();
  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[60px] bg-background border-t border-border flex items-center md:hidden z-50"
      aria-label="Mobile navigation"
    >
      {bottomNavItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
            isActive(href) ? "text-primary" : "text-muted-foreground"
          )}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon className="w-5 h-5" strokeWidth={isActive(href) ? 2.5 : 2} />
          <span className="text-[9px] font-medium">{label}</span>
        </Link>
      ))}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground"
        aria-label="More navigation options"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[9px] font-medium">More</span>
      </button>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Close mobile sidebar on route change; auto-expand section for active route
  useEffect(() => {
    setSidebarOpen(false);
    if (toolsNav.some(i => location === i.href || location.startsWith(i.href))) {
      setToolsOpen(true);
    }
  }, [location]);

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const NavLink = ({ item }: { item: typeof allNav[0] }) => (
    <Link
      href={item.href}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={cn(
        "flex items-center px-3 py-2.5 text-sm font-medium transition-colors gap-2.5 border-l-2 rounded-r-md",
        isActive(item.href)
          ? "bg-primary/10 text-primary border-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive(item.href) ? "text-primary" : "text-muted-foreground")} />
      <span className="truncate">{item.name}</span>
    </Link>
  );

  const SectionToggle = ({
    label,
    open,
    onToggle,
  }: { label: string; open: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 pt-4 pb-1 group"
    >
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
        {label}
      </span>
      {open
        ? <ChevronDown className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        : <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      }
    </button>
  );

  const Sidebar = ({ mobile }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex flex-col bg-card border-r border-border",
        mobile ? "w-[min(288px,85vw)] h-full" : "w-64 flex-shrink-0 h-full"
      )}
    >
      {/* Header */}
      <div className="h-14 md:h-16 flex items-center px-5 border-b border-border shrink-0">
        <Crosshair className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
        <h1 className="text-base md:text-lg font-bold tracking-widest text-primary uppercase font-mono leading-tight truncate">
          APEX ATLAS
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

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2A3045]">
        {/* Main investigation flow */}
        <div className="space-y-0.5">
          {mainNav.map(item => <NavLink key={item.href} item={item} />)}
        </div>

        {/* Tools & Admin (collapsible) */}
        <SectionToggle label="Tools & Admin" open={toolsOpen} onToggle={() => setToolsOpen(o => !o)} />
        {toolsOpen && (
          <div className="space-y-0.5">
            {toolsNav.map(item => <NavLink key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="px-3 py-2 flex flex-col gap-1 text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
          <div>Phase G · v0.3</div>
          <div className="text-[10px] opacity-70">PRIVATE INTELLIGENCE</div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">

      {/* Desktop Sidebar (md+) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-card flex-shrink-0 z-40">
          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors mr-1 shrink-0"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
          <Crosshair className="h-4 w-4 text-primary mr-2 shrink-0" />
          <span className="text-sm font-bold tracking-widest text-primary uppercase font-mono truncate">
            APEX ATLAS
          </span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="ml-auto p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Compliance Disclaimer Banner — desktop only */}
        {!bannerDismissed && (
          <div className="hidden md:flex flex-shrink-0 bg-amber-950/40 border-b border-amber-600/25 px-3 md:px-4 py-2 items-start justify-between z-30 gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-mono text-amber-400/80 leading-snug">
                <span className="text-amber-500 font-bold">COMPLIANCE:</span>{" "}
                Public-data research only. Sourced from public registries &amp; OSINT. GDPR/CCPA compliant use required.
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
            backgroundPosition: "center",
          }}
        />

        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden min-h-0 pb-[60px] md:pb-0">
          {children}
        </div>
      </main>

      <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
}
