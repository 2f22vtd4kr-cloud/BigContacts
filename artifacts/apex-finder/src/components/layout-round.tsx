import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Menu, Network, Search, X } from "lucide-react";
import { ApiKeyHealth } from "@/components/api-key-health";
import { ReactorMark } from "@/components/reactor-mark";
import { WorkspaceStatus } from "@/components/workspace-status";

const primaryNav = [
  { name: "Overview", href: "/", icon: House },
  { name: "Ledger", href: "/profiles", icon: Database },
  { name: "Discover", href: "/search", icon: Search },
  { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: ReactorMark },
];

export function Layout({ children }: { children: React.ReactNode; onSwitchToLegacy?: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  const active = (href: string) => href === "/" ? location === "/" : location === href || location.startsWith(href + "/");
  const title = primaryNav.find((item) => active(item.href))?.name
    ?? (location.startsWith("/profile/") ? "Card" : "Apex Atlas");

  useEffect(() => { document.title = title === "Overview" ? "Apex Atlas" : title + " · Apex Atlas"; }, [title]);
  useEffect(() => { setMobileOpen(false); }, [location]);
  useEffect(() => {
    if (mobileOpen) {
      wasOpen.current = true;
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
    }
    if (wasOpen.current) {
      mobileToggleRef.current?.focus();
      wasOpen.current = false;
    }
    return undefined;
  }, [mobileOpen]);

  const NavItems = () => (
    <>
      {primaryNav.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className={`atlas-round-navlink ${active(item.href) ? "is-active" : ""}`}>
          <Icon aria-hidden="true" /> <span>{item.name}</span>
        </Link>;
      })}
    </>
  );

  return (
    <div className="atlas-round atlas-round-shell min-h-[100dvh]">
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      <header className="atlas-round-mobile-header">
        <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><strong>Apex Atlas</strong></Link>
        <button ref={mobileToggleRef} className="atlas-round-mobile-toggle" type="button"
          aria-controls="atlas-round-sidebar" aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMobileOpen((value) => !value)}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>
      {mobileOpen && <button type="button" className="atlas-round-sidebar-backdrop"
        aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside id="atlas-round-sidebar" className={`atlas-round-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Apex Atlas sidebar">
        <div className="atlas-round-sidebar-brand">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><strong>Apex Atlas</strong></Link>
        </div>
        <nav className="atlas-round-sidebar-nav" aria-label="Primary navigation">
          <div className="atlas-round-sidebar-label">Workspace</div>
          <NavItems />
        </nav>
        <div className="atlas-round-sidebar-status">
          <div className="atlas-round-sidebar-status-item"><WorkspaceStatus /></div>
          <div className="atlas-round-sidebar-status-item"><ApiKeyHealth /></div>
        </div>
      </aside>
      <div className="atlas-round-main-column">
        <main id="main-content" tabIndex={-1} className="atlas-round-main">
          <div className="atlas-round-content">{children}</div>
          <footer className="atlas-round-footer"><span>APEX ATLAS</span><span>Evidence first. Always attributable.</span><span>PUBLIC RECORDS WORKSPACE</span></footer>
        </main>
      </div>
    </div>
  );
}
