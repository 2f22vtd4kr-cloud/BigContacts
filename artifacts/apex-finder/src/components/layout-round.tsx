import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg className="atlas-round-brand-mark" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
    </svg>
  );
}

const primaryNav = [
  { name: "Overview", href: "/" },
  { name: "Ledger", href: "/profiles" },
  { name: "Discover", href: "/search" },
  { name: "Connections", href: "/network" },
  { name: "Reactor", href: "/reactor" },
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
      {primaryNav.map((item) => (
        <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className={`atlas-round-navlink ${active(item.href) ? "is-active" : ""}`}>
          <span>{item.name}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="atlas-round atlas-round-shell min-h-[100dvh]">
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      <header className="atlas-round-header">
        <div className="atlas-round-brand">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
        </div>
        <nav className="atlas-round-primary" aria-label="Primary navigation"><NavItems /></nav>
        <div className="atlas-round-actions">
          <div className="atlas-round-desktop-status"><WorkspaceStatus compact /></div>
          <button ref={mobileToggleRef} className="atlas-round-mobile-toggle" type="button"
            aria-controls="atlas-round-sidebar" aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {mobileOpen && <button type="button" className="atlas-round-sidebar-backdrop"
        aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside id="atlas-round-sidebar" className={`atlas-round-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Apex Atlas navigation">
        <div className="atlas-round-sidebar-brand">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
        </div>
        <nav className="atlas-round-sidebar-nav" aria-label="Primary navigation"><NavItems /></nav>
      </aside>
      <div className="atlas-round-main-column">
        <main id="main-content" tabIndex={-1} className="atlas-round-main">
          <div className="atlas-round-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
