import { useEffect, useId } from "react";
import { Link, useLocation } from "wouter";
import { Database, House, Network, Search } from "lucide-react";
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
  { name: "Overview", href: "/", icon: House }, { name: "Ledger", href: "/profiles", icon: Database },
  { name: "Discover", href: "/search", icon: Search }, { name: "Connections", href: "/network", icon: Network },
  { name: "Reactor", href: "/reactor", icon: ReactorMark },
];
export function Layout({ children }: { children: React.ReactNode; onSwitchToLegacy?: () => void }) {
  const [location] = useLocation();
  const isCardPage = location.startsWith("/profile/");
  const active = (href: string) => href === "/" ? location === "/" : (href === "/profiles" && isCardPage) || location === href || location.startsWith(href + "/");
  const title = primaryNav.find((item) => active(item.href))?.name ?? (location.startsWith("/profile/") ? "Card" : "Apex Atlas");
  useEffect(() => { document.title = title === "Overview" ? "Apex Atlas" : title + " · Apex Atlas"; }, [title]);
  const navItems = (mobile: boolean) => <>{primaryNav.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href}
    aria-current={active(item.href) ? "page" : undefined} aria-label={item.name} title={mobile ? item.name : undefined}
    className={`${isCardPage ? "atlas-card-shell-navlink" : "atlas-round-navlink"} ${active(item.href) ? "is-active" : ""}`}>{!isCardPage && <Icon aria-hidden="true" />} <span>{item.name}</span></Link>; })}</>;
  return <div className="atlas-round atlas-round-shell min-h-[100dvh]">
    <a href="#main-content" className="atlas-round-skip">Skip to main content</a>
    <header className={isCardPage ? "atlas-card-shell-header" : "atlas-round-header"}>
      <Link href="/" aria-label="Apex Atlas overview" className="atlas-round-wordmark atlas-round-header-brand"><ApexAtlasMark /><strong>Apex Atlas</strong></Link>
      <nav className={isCardPage ? "atlas-card-shell-nav" : "atlas-round-primary"} aria-label="Primary navigation">{navItems(false)}</nav>
      <div className={isCardPage ? "atlas-card-shell-status" : "atlas-round-header-status"}><WorkspaceStatus compact /></div>
    </header>
    <main id="main-content" tabIndex={-1} className="atlas-round-main"><div className="atlas-round-content">{children}</div></main>
    <nav className="atlas-round-mobile-tabbar" aria-label="Primary navigation">{navItems(true)}</nav>
  </div>;
}
