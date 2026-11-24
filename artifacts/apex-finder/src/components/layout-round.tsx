import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Menu, Network, Search, X } from "lucide-react";
import { ReactorMark } from "@/components/reactor-mark";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  const clipId = `atlas-mark-${useId().replace(/:/g, "")}`;
  return <svg className="atlas-round-brand-mark" width="26" height="28.6" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
    <defs><clipPath id={clipId}><path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}><rect width="10" height="11" fill="#C8321E" /><rect x="10" width="10" height="11" fill="#EDB92B" /><rect y="11" width="10" height="11" fill="#EDB92B" /><rect x="10" y="11" width="10" height="11" fill="#C8321E" /></g>
  </svg>;
}

const primaryNav = [
  { name: "Overview", href: "/", icon: House },
  { name: "Ledger", href: "/profiles", icon: Database },
  { name: "Discover", href: "/search", icon: Search },
  { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: ReactorMark },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCardPage = location.startsWith("/profile/");
  const active = (href: string) => href === "/" ? location === "/" : (href === "/profiles" && isCardPage) || location === href || location.startsWith(href + "/");
  const title = primaryNav.find((item) => active(item.href))?.name ?? (isCardPage ? "Card" : "Apex Atlas");

  useEffect(() => { document.title = title === "Overview" ? "Apex Atlas" : title + " · Apex Atlas"; }, [title]);
  useEffect(() => { setMobileOpen(false); }, [location]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const navItems = primaryNav.map((item) => {
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
        aria-label={item.name} title={sidebarCollapsed ? item.name : undefined}
        className={`atlas-round-navlink ${active(item.href) ? "is-active" : ""}`}>
        <Icon aria-hidden="true" /><span>{item.name}</span>
      </Link>
    );
  });

  return (
    <div className={`atlas-round atlas-round-shell min-h-[100dvh] ${sidebarCollapsed ? "is-sidebar-collapsed" : ""} ${mobileOpen ? "is-mobile-nav-open" : ""}`}>
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      <header className="atlas-round-header">
        <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark atlas-round-header-brand">
          <ApexAtlasMark /><strong>Apex Atlas</strong>
        </Link>
        <button type="button" className="atlas-round-sidebar-toggle"
          aria-label={mobileOpen ? "Close navigation" : sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-controls="atlas-round-sidebar" aria-expanded={mobileOpen || !sidebarCollapsed}
          onClick={() => {
            if (window.matchMedia("(max-width: 760px)").matches) setMobileOpen((open) => !open);
            else setSidebarCollapsed((collapsed) => !collapsed);
          }}>
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <div className="atlas-round-header-status"><WorkspaceStatus compact /></div>
      </header>
      <button type="button" className="atlas-round-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1} />
      <aside id="atlas-round-sidebar" className="atlas-round-sidebar" aria-label="Main navigation">
        <nav className="atlas-round-sidebar-nav">{navItems}</nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="atlas-round-main">
        <div className="atlas-round-content">{children}</div>
      </main>
    </div>
  );
}
