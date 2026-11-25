import { useEffect, useId } from "react";
import { Link, useLocation } from "wouter";
import { WorkspaceStatus } from "@/components/workspace-status";

function ApexAtlasMark() {
  const clipId = `atlas-mark-${useId().replace(/:/g, "")}`;
  return <svg className="atlas-round-brand-mark" width="26" height="28.6" viewBox="0 0 20 22" aria-hidden="true" focusable="false">
    <defs><clipPath id={clipId}><path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}><rect width="10" height="11" fill="#C8321E" /><rect x="10" width="10" height="11" fill="#EDB92B" /><rect y="11" width="10" height="11" fill="#EDB92B" /><rect x="10" y="11" width="10" height="11" fill="#C8321E" /></g>
  </svg>;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const title = location.startsWith("/profile/") ? "Card"
    : location === "/profiles" ? "Ledger"
    : location === "/search" ? "Discover"
    : location === "/network" ? "Connections"
    : location === "/reactor" ? "Reactor"
    : location === "/status" ? "System status"
    : "Apex Atlas";

  useEffect(() => { document.title = title === "Apex Atlas" ? title : title + " · Apex Atlas"; }, [title]);

  return (
    <div className="atlas-round atlas-round-shell">
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      <header className="atlas-round-header">
        <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark atlas-round-header-brand">
          <ApexAtlasMark /><strong>Apex Atlas</strong>
        </Link>
        <div className="atlas-round-header-status"><WorkspaceStatus compact /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="atlas-round-main">
        <div className="atlas-round-content">{children}</div>
      </main>
    </div>
  );
}
