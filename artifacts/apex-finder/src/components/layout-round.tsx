import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Menu, Network, Search, X } from "lucide-react";
import { ReactorMark } from "@/components/reactor-mark";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 32 36" aria-hidden="true" focusable="false">
      <path d="M2.5 2.5H29.5V17.2C29.5 25.1 23.2 30.7 16 34C8.8 30.7 2.5 25.1 2.5 17.2V2.5Z" fill="#EDB92B" stroke="#18181A" strokeWidth="1.25" />
      <path d="M3.3 3.3H16V17H3.3V3.3Z" fill="#C8321E" />
      <path d="M16 17H28.7V17.2C28.7 24.6 22.8 29.7 16 32.8V17Z" fill="#C8321E" />
      <path d="M16 3.3H28.7V17H16V3.3Z" fill="#EDB92B" />
      <path d="M3.3 17H16V32.8C9.2 29.7 3.3 24.6 3.3 17.2V17Z" fill="#EDB92B" />
      <path d="M16 3.3V32.8M3.3 17H28.7" fill="none" stroke="#18181A" strokeWidth="1" />
    </svg>
  );
}

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
        <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
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
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
        </div>
        <nav className="atlas-round-sidebar-nav" aria-label="Primary navigation">
          <div className="atlas-round-sidebar-label">Workspace</div>
          <NavItems />
        </nav>
      </aside>
      <div className="atlas-round-main-column">
        <main id="main-content" tabIndex={-1} className="atlas-round-main">
          <div className="atlas-round-desktop-status"><WorkspaceStatus compact /></div>
          <div className="atlas-round-content">{children}</div>
            </main>
      </div>
    </div>
  );
}
