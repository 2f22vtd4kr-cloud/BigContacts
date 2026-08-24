import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Cpu,
  Database,
  GitCompare,
  Bot,
  List,
  Menu,
  Network,
  Search,
  Settings2,
  Telescope,
  X,
} from "lucide-react";
import { ApiKeyHealth } from "@/components/api-key-health";
import { WorkspaceStatus } from "@/components/workspace-status";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";
import { BureauIntegrityBanner } from "@/components/bureau-integrity-banner";

const mainNav = [
  { name: "Overview", href: "/", icon: Crosshair },
  { name: "Entity ledger", href: "/profiles", icon: List },
  { name: "Discover", href: "/search", icon: Search },
  { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: Cpu },
];

const referenceNav = [
  { name: "Field manual", href: "/manual", icon: BookOpen },
];

const toolsNav = [
  { name: "System status", href: "/status", icon: Activity },
  { name: "Data sources", href: "/data-sources", icon: Database },
  { name: "Source directory", href: "/osint-tools", icon: Telescope },
  { name: "Persona review", href: "/improvements", icon: Bot },
  { name: "Duplicate review", href: "/duplicates", icon: GitCompare },
  { name: "Workspace activity", href: "/jobs", icon: Settings2 },
];

const allNav = [...mainNav, ...referenceNav, ...toolsNav];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  /** Desktop: sidebar can collapse so Reactor graph has room */
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const [edgeHot, setEdgeHot] = useState(false);
  const edgeHotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armEdgeHot = () => {
    if (edgeHotTimer.current) clearTimeout(edgeHotTimer.current);
    setEdgeHot(true);
  };
  const disarmEdgeHot = () => {
    if (edgeHotTimer.current) clearTimeout(edgeHotTimer.current);
    edgeHotTimer.current = setTimeout(() => setEdgeHot(false), 120);
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    if (toolsNav.some((item) => location === item.href || location.startsWith(item.href))) {
      setToolsOpen(true);
    }
  }, [location]);

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const NavLink = ({ item }: { item: typeof allNav[number] }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "atlas-pressable group flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200",
          active
            ? "atlas-nav-active"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-stone-200",
        )}
      >
        <item.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-primary" : "text-muted-foreground/80")} />
        <span className="truncate">{item.name}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
      </Link>
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      "flex h-full flex-col bg-[#111827]",
      mobile ? "w-[min(300px,86vw)]" : "w-[250px] shrink-0",
    )}>
      <div className="flex h-[76px] shrink-0 items-center border-b border-white/[0.04] px-5">
        <Link
          href="/"
          aria-label="Apex Atlas home"
          data-testid="link-sidebar-apex-atlas-mark"
          className="grid h-8 w-8 place-items-center rounded-lg bg-[#9CFF1A] text-black shadow-[0_0_18px_rgba(156,255,26,0.35)] focus-visible:ring-2 focus-visible:ring-lime-400/50"
        >
          <Crosshair className="h-[18px] w-[18px]" />
        </Link>
        <Link
          href="/"
          aria-label="Apex Atlas home"
          data-testid="link-apex-atlas-home"
          className="ml-3 min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="font-display text-[15px] font-bold tracking-[0.14em] text-foreground">APEX ATLAS</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">Private workspace</div>
        </Link>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            data-testid="button-close-menu"
            className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="atlas-scroll flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">Research desk</div>
        <div className="space-y-1">
          {mainNav.map((item) => <NavLink key={item.href} item={item} />)}
        </div>
        <div className="mt-7 mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">Reference</div>
        <div className="space-y-1">
          {referenceNav.map((item) => <NavLink key={item.href} item={item} />)}
        </div>
        <button
          onClick={() => setToolsOpen((open) => !open)}
          aria-expanded={toolsOpen}
          data-testid="button-toggle-tools"
          className="mt-7 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
        >
          <span>Workspace settings</span>
          {toolsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {toolsOpen && (
          <div className="mt-1 space-y-1">
            {toolsNav.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Public records workspace
        </div>
      </div>
    </aside>
  );

  const active = allNav.find((item) => isActive(item.href));
  const pageTitle = location.startsWith("/profile/") ? "Profile" : active?.name ?? "Overview";
  const pageDescription = location === "/reactor"
    ? "Live public-source research, adaptive search, and evidence review"
    : location === "/"
      ? "Private public-records research workspace"
      : "Evidence workspace";
  const isReactorRoute = location === "/reactor";
  /** Pages that already render their own title chrome */
  /** Pages that already render their own title / immersive chrome */
  const hideDeskTitle =
    isReactorRoute
    || location === "/"
    || location.startsWith("/profile/")
    || location === "/jobs"
    || location === "/improvements"
    || location === "/duplicates"
    || location === "/data-sources"
    || location === "/status"
    || location === "/osint-tools"
    || location === "/search"
    || location === "/profiles"
    || location === "/network"
    || location === "/manual";

  return (
    <div className="atlas-noise flex min-h-[100dvh] min-h-[100svh] overflow-hidden bg-background text-foreground">
      <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="atlas-liquid-distort" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.035 0.05" numOctaves="5" seed="2" result="noise">
              <animate attributeName="baseFrequency" dur="4s" values="0.035 0.05;0.055 0.03;0.028 0.06;0.035 0.05" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="48" xChannelSelector="R" yChannelSelector="G">
              <animate attributeName="scale" dur="3.5s" values="38;58;44;48;38" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>
        </defs>
      </svg>
      {/* Desktop collapsible nav */}
      <div
        className={cn(
          "relative hidden shrink-0 transition-[width] duration-200 ease-out md:flex",
          desktopNavOpen ? "w-[250px]" : "w-0 overflow-hidden",
        )}
      >
        {desktopNavOpen && <Sidebar />}
      </div>
      <button
        type="button"
        aria-label={desktopNavOpen ? "Collapse menu" : "Open menu"}
        data-testid="button-desktop-nav-toggle"
        onClick={() => setDesktopNavOpen((v) => !v)}
        onMouseEnter={armEdgeHot}
        onMouseLeave={disarmEdgeHot}
        className={cn(
          "fixed z-[61] hidden h-10 w-6 items-center justify-center rounded-r-md border border-l-0 border-[#9CFF1A]/30 bg-[#0c1220] text-[#9CFF1A] shadow-none transition-opacity duration-150 md:flex",
          "top-1/2 -translate-y-1/2",
          desktopNavOpen ? "left-[250px]" : "left-0",
          /* Fully gone unless mouse is on the left edge hit target */
          edgeHot ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {desktopNavOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {/* Invisible left-edge hit target when collapsed so button can appear */}
      {!desktopNavOpen && (
        <div
          className="fixed left-0 top-0 z-[59] hidden h-full w-3 md:block"
          onMouseEnter={armEdgeHot}
          onMouseLeave={disarmEdgeHot}
        />
      )}
      {desktopNavOpen && (
        <div
          className="fixed top-0 z-[59] hidden h-full w-3 md:block"
          style={{ left: 247 }}
          onMouseEnter={armEdgeHot}
          onMouseLeave={disarmEdgeHot}
        />
      )}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            aria-label="Close menu"
            data-testid="button-overlay-close-menu"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full"><Sidebar mobile /></div>
        </div>
      )}
      <main className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-[#111827]">
        <div className="atlas-grid pointer-events-none absolute inset-0" />
        <header className="relative z-40 flex min-h-14 shrink-0 items-center gap-1.5 border-b border-[#9CFF1A]/08 bg-[#111827]/95 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur-lg sm:gap-2.5 sm:px-5 md:h-16 md:px-6">
          <div className="mr-1 flex min-w-0 items-center md:mr-0">
            {/* Outline home on mobile so it never collides with Pause/Stop pills */}
            <Link
              href="/"
              aria-label="Apex Atlas home"
              data-testid="link-mobile-apex-atlas-home"
              className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#9CFF1A]/35 bg-transparent text-[#9CFF1A] focus-visible:ring-2 focus-visible:ring-lime-400/50 md:hidden"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </Link>
            <div className="ml-2.5 hidden min-w-0 md:block">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
                Apex Atlas · Research desk
              </div>
              <div className="mt-0.5 truncate text-[13px] font-semibold tracking-tight text-stone-100">
                {pageTitle}
              </div>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
            {location !== "/" && !isReactorRoute && (
              <div className="shrink-0">
                <LaunchAtlasButton variant="header" />
              </div>
            )}
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <WorkspaceStatus />
              <ApiKeyHealth />
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              data-testid="button-open-menu"
              className="atlas-pressable shrink-0 rounded-lg p-2 text-stone-400 hover:bg-white/[0.06] hover:text-stone-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        {/* Reactor (and other immersive desks) own their chrome — skip duplicate page title on small screens */}
        {!hideDeskTitle && (
        <div className="relative z-10 shrink-0 border-b border-[#9CFF1A]/08 bg-background/70 px-4 py-3.5 backdrop-blur-sm md:px-6 md:py-4">
          <div className="mx-auto w-full max-w-[1800px]">
            <h1 className="font-display text-xl font-bold tracking-[-0.03em] text-foreground md:text-2xl" data-testid="text-page-title">
              {pageTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-[11px] leading-4 text-muted-foreground md:text-xs">{pageDescription}</p>
          </div>
        </div>
        )}
        <div className={`relative z-10 flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden ${isReactorRoute ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}