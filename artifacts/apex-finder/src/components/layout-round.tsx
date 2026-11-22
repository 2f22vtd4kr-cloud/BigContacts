import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, ChevronDown, Database, GitCompare, Menu, Network, Search, Settings2, Telescope, X, Crosshair } from "lucide-react";
import { ApiKeyHealth } from "@/components/api-key-health";
import { WorkspaceStatus } from "@/components/workspace-status";
import { LaunchAtlasButton } from "@/components/launch-atlas-button";

const primaryNav = [
  { name: "Overview", href: "/", icon: Crosshair },
  { name: "Ledger", href: "/profiles", icon: Database },
  { name: "Discover", href: "/search", icon: Search },
  { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: Activity },
];
const utilityNav = [
  { name: "Field manual", href: "/manual", icon: BookOpen },
  { name: "System status", href: "/status", icon: Activity },
  { name: "Data sources", href: "/data-sources", icon: Database },
  { name: "Source directory", href: "/osint-tools", icon: Telescope },
  { name: "Persona review", href: "/improvements", icon: Settings2 },
  { name: "Duplicate review", href: "/duplicates", icon: GitCompare },
  { name: "Workspace activity", href: "/jobs", icon: Activity },
  { name: "Intel terminal", href: "/research", icon: Crosshair },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => href === "/" ? location === "/" : location === href || location.startsWith(href + "/");
  const title = primaryNav.find((item) => active(item.href))?.name
    ?? utilityNav.find((item) => active(item.href))?.name
    ?? (location.startsWith("/profile/") ? "Person dossier" : "Apex Atlas");
  useEffect(() => { document.title = title === "Overview" ? "Apex Atlas" : title + " · Apex Atlas"; }, [title]);
  useEffect(() => { setMobileOpen(false); }, [location]);

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {primaryNav.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
          className={`atlas-round-navlink ${active(item.href) ? "is-active" : ""} ${mobile ? "is-mobile" : ""}`}>
          <Icon aria-hidden="true" /> <span>{item.name}</span>
        </Link>;
      })}
    </>
  );

  return (
    <div className="atlas-round min-h-[100dvh]">
      <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
      <header className="atlas-round-header">
        <div className="atlas-round-brand">
          <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-mark"><Crosshair /></Link>
          <Link href="/" className="atlas-round-wordmark"><strong>Apex Atlas</strong><span>PUBLIC RECORDS · RESEARCH BUREAU</span></Link>
        </div>
        <nav className="atlas-round-primary" aria-label="Primary navigation"><NavItems /></nav>
        <div className="atlas-round-actions">
          <div className="atlas-round-status"><WorkspaceStatus /></div>
          <div className="atlas-round-health"><ApiKeyHealth /></div>
          <div className="atlas-round-launch"><LaunchAtlasButton variant="header" /></div>
          <button className="atlas-round-more" type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}>
            More <ChevronDown />
          </button>
          <button className="atlas-round-mobile-toggle" type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {moreOpen && <div className="atlas-round-more-menu">{utilityNav.map(item => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}><Icon />{item.name}</Link>;
        })}</div>}
      </header>
      {mobileOpen && <nav className="atlas-round-mobile-nav" aria-label="Mobile navigation"><NavItems mobile />{utilityNav.map(item => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className="atlas-round-navlink is-mobile"><Icon /><span>{item.name}</span></Link>;
      })}</nav>}
      <main id="main-content" tabIndex={-1} className="atlas-round-main">
        <div className="atlas-round-page-meta"><span>APEX ATLAS</span><span className="atlas-round-meta-dot">/</span><strong>{title}</strong></div>
        <div className="atlas-round-content">{children}</div>
        <footer className="atlas-round-footer"><span>APEX ATLAS</span><span>Evidence first. Always attributable.</span><span>PUBLIC RECORDS WORKSPACE</span></footer>
      </main>
    </div>
  );
}
