import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Crosshair, Network, FileTerminal,
  KanbanSquare, X, BookOpen, Menu, MessageSquare,
  Search, Users, Activity, ChevronDown, ChevronRight, Cog, ShieldAlert,
} from "lucide-react";

// ─── Navigation structure (3-tier) ───────────────────────────────────────────
const mainNav = [
  { name: "Atlas",    href: "/",          icon: Activity },
  { name: "Search",   href: "/search",    icon: Search },
  { name: "Profiles", href: "/profiles",  icon: Users },
  { name: "Network",  href: "/network",   icon: Network },
];

const workspaceNav = [
  { name: "Research Sessions",  href: "/research",  icon: FileTerminal },
  { name: "Outreach Assistant", href: "/outreach",  icon: MessageSquare },
  { name: "Pipeline",           href: "/pipeline",  icon: KanbanSquare },
];

const systemNav = [
  { name: "Background Jobs", href: "/jobs",   icon: Cog },
  { name: "Field Manual",    href: "/manual", icon: BookOpen },
];

// All nav items flattened (used for mobile top bar active-page lookup)
const allNav = [...mainNav, ...workspaceNav, ...systemNav];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    // Auto-expand section if current route lives inside it
    if (workspaceNav.some(i => location === i.href || location.startsWith(i.href))) {
      setWorkspaceOpen(true);
    }
    if (systemNav.some(i => location === i.href || location.startsWith(i.href))) {
      setSystemOpen(true);
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
        {/* Main */}
        <div className="space-y-0.5">
          {mainNav.map(item => <NavLink key={item.href} item={item} />)}
        </div>

        {/* Workspace (collapsible) */}
        <SectionToggle label="Workspace" open={workspaceOpen} onToggle={() => setWorkspaceOpen(o => !o)} />
        {workspaceOpen && (
          <div className="space-y-0.5">
            {workspaceNav.map(item => <NavLink key={item.href} item={item} />)}
          </div>
        )}

        {/* System (collapsible) */}
        <SectionToggle label="System" open={systemOpen} onToggle={() => setSystemOpen(o => !o)} />
        {systemOpen && (
          <div className="space-y-0.5">
            {systemNav.map(item => <NavLink key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="px-3 py-2 flex flex-col gap-1 text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
          <div>Atlas · v1.0</div>
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors mr-3 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Crosshair className="h-4 w-4 text-primary mr-2 shrink-0" />
          <span className="text-sm font-bold tracking-widest text-primary uppercase font-mono truncate mr-2">
            APEX ATLAS
          </span>
          <span className="text-muted-foreground/30 mr-2 shrink-0">·</span>
          <span className="text-xs font-mono text-muted-foreground truncate uppercase mt-0.5">
            {allNav.find(item =>
              location === item.href || (item.href !== "/" && location.startsWith(item.href))
            )?.name || "Atlas"}
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
            backgroundPosition: "center",
          }}
        />

        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
