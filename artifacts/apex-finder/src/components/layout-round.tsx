import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Menu, Network, Search, X } from "lucide-react";
import { ReactorMark } from "@/components/reactor-mark";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  const clipPathId = useId().replace(/:/g, "");

  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipPathId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12V0z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
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
      <header className="atlas-round-header">
        <div className="atlas-round-brand">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
        </div>
        <nav className="atlas-round-primary" aria-label="Primary navigation">
          <NavItems />
        </nav>
        <div className="atlas-round-actions">
          <WorkspaceStatus compact />
          <button ref={mobileToggleRef} className="atlas-round-mobile-toggle" type="button"
            aria-controls="atlas-round-mobile-nav" aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <nav id="atlas-round-mobile-nav" className="atlas-round-mobile-utilities"
        aria-label="Primary navigation" hidden={!mobileOpen}>
        <div className="atlas-round-mobile-utilities-heading">Workspace</div>
        <NavItems />
      </nav>
      <main id="main-content" tabIndex={-1} className="atlas-round-main">
        <div className="atlas-round-content">{children}</div>
      </main>
    </div>
  );
}
