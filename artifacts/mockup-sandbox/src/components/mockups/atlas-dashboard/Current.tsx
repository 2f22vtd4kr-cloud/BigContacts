/**
 * Atlas Dashboard — Current (extracted baseline)
 *
 * Self-contained sandbox preview of the ApexFinder dashboard.
 * All API hooks, Leaflet map, wouter routing, and browser side-effects are
 * stubbed with realistic static data so the component renders without the
 * main app.
 */

import "./_group.css";
import {
  ShieldAlert, MapPin, Database, ChevronRight, Activity, AlertTriangle,
  Globe, Radio, Zap, Users, Play, Loader2, CheckCircle2, XCircle,
  Mail, Phone, Network,
} from "lucide-react";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── inline cn ────────────────────────────────────────────────────────────────
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── inline utils ─────────────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 0.8) return "text-primary border-primary bg-primary/10";
  if (score >= 0.5) return "text-amber-500 border-amber-500/50 bg-amber-500/10";
  return "text-muted-foreground border-border bg-muted";
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Unknown";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function AccessScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const colorClasses = getScoreColor(score);
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses}`}
      title="Access score — how realistically this person can be reached (0–100)">
      <span className="opacity-50 text-[9px] uppercase tracking-wide leading-none">Access</span>
      <span className="font-bold tabular-nums">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

function formatEntityName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  if (/[a-z]/.test(name)) return name;
  return name.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function formatSignal(signal: string | null | undefined): string {
  if (!signal) return "No signal";
  return signal
    .replace(/^Source:\s*/i, "")
    .replace(/\.\s*Filing type:\s*[\w\s\d]+\./gi, " filing")
    .replace(/\.$/, "")
    .trim();
}

// ── Stub: no-op Link ─────────────────────────────────────────────────────────
function Link({ href: _href, children, className, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }) {
  return (
    <a
      href="#"
      className={className}
      onClick={(e) => { e.preventDefault(); onClick?.(e); }}
      {...rest}
    >
      {children}
    </a>
  );
}

// ── Static data (realistic shapes matching API responses) ────────────────────

const STATIC_STATS = {
  totalEntities: 14_832,
  hotLeadsCount: 327,
  contactableCount: 2_419,
  westernHnwiCount: 9_105,
  totalAssets: 5_613,
  avgBayesianScore: 0.74,
  enrichmentCoverage: 61.3,
  registryCount: 6,
  wealthTiers: {
    ultraHnw: 412,
    veryHnw: 1_847,
    hnw: 6_846,
    unknown: 5_727,
  },
  assetsByCategory: [
    { category: "RealEstate", count: 3_201 },
    { category: "Marine",     count: 884 },
    { category: "Aviation",   count: 1_528 },
  ],
};

const STATIC_HOT_LEADS = [
  {
    entityId: "e1",
    entityName: "THIEL PETER ANDREAS",
    entityType: "HNWI",
    nationality: "US",
    estimatedNetWorth: 9_200_000_000,
    accessScore: 0.91,
    assetCount: 7,
    contactEmail: "p@founders.fund",
    contactPhone: null,
    signal: "Source: SEC EDGAR — SC 13G. Multiple beneficial ownership filings. Aviation: Gulfstream G650 · N650PT.",
  },
  {
    entityId: "e2",
    entityName: "ELLISON LARRY",
    entityType: "HNWI",
    nationality: "US",
    estimatedNetWorth: 148_000_000_000,
    accessScore: 0.87,
    assetCount: 14,
    contactEmail: null,
    contactPhone: null,
    signal: "Source: SEC EDGAR — SC 13D/G. Oracle Corp (ORCL) beneficial ownership. Aviation: Boeing 747 — N706LE.",
  },
  {
    entityId: "e3",
    entityName: "Blackrock Holdings Trust IV",
    entityType: "Trust",
    nationality: "US",
    estimatedNetWorth: 420_000_000,
    accessScore: 0.76,
    assetCount: 3,
    contactEmail: "trusts@blackrock.com",
    contactPhone: "+1-212-810-5300",
    signal: "SEC EDGAR — Schedule 13G filing. Beneficial owner of 8.4% stake in multiple REITs.",
  },
  {
    entityId: "e4",
    entityName: "KOCHHAR CHANDA",
    entityType: "Person",
    nationality: "IN",
    estimatedNetWorth: 55_000_000,
    accessScore: 0.62,
    assetCount: 2,
    contactEmail: null,
    contactPhone: "+91-22-6600-1234",
    signal: "SEC EDGAR — Form 4 insider transaction. Real estate: Palm Beach, FL · Valued $8.2M.",
  },
  {
    entityId: "e5",
    entityName: "Nautilus Capital LLC",
    entityType: "Company",
    nationality: "KY",
    estimatedNetWorth: 780_000_000,
    accessScore: 0.83,
    assetCount: 5,
    contactEmail: "ir@nautiluscap.com",
    contactPhone: null,
    signal: "Marine: Superyacht AURORA · 72m · IMO 9541023. Aviation: Dassault Falcon 8X · N821NX.",
  },
  {
    entityId: "e6",
    entityName: "GRIFFIN KENNETH CORDELE",
    entityType: "HNWI",
    nationality: "US",
    estimatedNetWorth: 38_000_000_000,
    accessScore: 0.95,
    assetCount: 11,
    contactEmail: "kg@citadel.com",
    contactPhone: null,
    signal: "SEC EDGAR — 13F-HR institutional filing. Citadel LLC. Aviation: Gulfstream G700 — N700KG.",
  },
  {
    entityId: "e7",
    entityName: "Al-Maktoum Family Office",
    entityType: "Trust",
    nationality: "AE",
    estimatedNetWorth: 12_000_000_000,
    accessScore: 0.54,
    assetCount: 9,
    contactEmail: null,
    contactPhone: null,
    signal: "Real estate: 5 registered FL properties · Total $47M. Marine: Motor yacht FALCON · 58m.",
  },
  {
    entityId: "e8",
    entityName: "WALTON LUKAS ANDREW",
    entityType: "HNWI",
    nationality: "US",
    estimatedNetWorth: 22_000_000_000,
    accessScore: 0.79,
    assetCount: 6,
    contactEmail: "lwalton@waltonef.org",
    contactPhone: null,
    signal: "SEC EDGAR — SC 13G. Beneficial owner Walmart Inc. Aviation: Cessna Citation Latitude · N418LW.",
  },
];

const STATIC_MAP_POINTS = [
  { id: 1, latitude: 40.712, longitude: -74.006, category: "RealEstate", identifier: "245 Park Ave NYC", ownerName: "Griffin Kenneth", estimatedValue: 48_000_000, jurisdiction: "NY" },
  { id: 2, latitude: 25.774, longitude: -80.185, category: "RealEstate", identifier: "Palm Beach Estate", ownerName: "Kochhar Chanda", estimatedValue: 8_200_000, jurisdiction: "FL" },
  { id: 3, latitude: 33.749, longitude: -84.388, category: "Aviation",   identifier: "N650PT · G650",    ownerName: "Thiel Peter",      estimatedValue: 75_000_000, jurisdiction: "GA" },
  { id: 4, latitude: 36.174, longitude: -86.767, category: "Aviation",   identifier: "N706LE · 747",     ownerName: "Ellison Larry",     estimatedValue: 200_000_000, jurisdiction: "TN" },
  { id: 5, latitude: 29.749, longitude: -95.368, category: "Marine",     identifier: "AURORA · IMO 9541",ownerName: "Nautilus Cap",      estimatedValue: 120_000_000, jurisdiction: "TX" },
  { id: 6, latitude: 37.774, longitude: -122.419,category: "RealEstate", identifier: "SF Pacific Heights", ownerName: null,             estimatedValue: 14_500_000, jurisdiction: "CA" },
  { id: 7, latitude: 41.878, longitude: -87.629, category: "RealEstate", identifier: "Chicago Lakeshore",  ownerName: "Griffin Kenneth", estimatedValue: 22_000_000, jurisdiction: "IL" },
  { id: 8, latitude: 47.608, longitude: -122.335,category: "Aviation",   identifier: "N821NX · Falcon 8X", ownerName: "Nautilus Cap",   estimatedValue: 60_000_000, jurisdiction: "WA" },
  { id: 9, latitude: 32.776, longitude: -96.796, category: "RealEstate", identifier: "Dallas Ranch",        ownerName: "Walton Lukas",   estimatedValue: 18_000_000, jurisdiction: "TX" },
  { id:10, latitude: 44.977, longitude: -93.265, category: "Marine",     identifier: "Lake Minnetonka Dock",ownerName: null,             estimatedValue: 3_200_000,  jurisdiction: "MN" },
];

// ── getTypeBadgeStyles ────────────────────────────────────────────────────────
function getTypeBadgeStyles(type: string) {
  const t = type?.toLowerCase() || "";
  if (t.includes("hnwi") || t.includes("person")) return "text-violet-400 border-violet-400/20 bg-violet-400/10";
  if (t.includes("corp") || t.includes("company")) return "text-blue-400 border-blue-400/20 bg-blue-400/10";
  if (t.includes("trust")) return "text-amber-400 border-amber-400/20 bg-amber-400/10";
  if (t.includes("american")) return "text-rose-400 border-rose-400/20 bg-rose-400/10";
  return "text-muted-foreground border-border bg-card";
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar() {
  const s = STATIC_STATS;
  return (
    <div className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-20">
      {/* Row 1 — 4 hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        <div className="flex flex-col px-5 py-4 bg-card/90">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Database className="w-3 h-3 shrink-0" /> All Profiles
          </span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{s.totalEntities.toLocaleString()}</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90 hover:bg-amber-500/5 transition-colors group cursor-pointer">
          <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0" /> Hot Leads
            <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="text-2xl font-bold text-amber-500 tabular-nums">{s.hotLeadsCount.toLocaleString()}</span>
          <span className="text-[9px] font-mono text-amber-500/50 mt-1 group-hover:text-amber-500/80 transition-colors">click to browse →</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90 hover:bg-emerald-400/5 transition-colors group cursor-pointer">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3 shrink-0" /> Contactable
            <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums">{s.contactableCount.toLocaleString()}</span>
          <span className="text-[9px] font-mono text-emerald-400/50 mt-1 group-hover:text-emerald-400/80 transition-colors">click to browse →</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90">
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3 shrink-0" /> Wealth Profiles
          </span>
          <span className="text-2xl font-bold text-blue-400 tabular-nums">{s.westernHnwiCount.toLocaleString()}</span>
        </div>
      </div>
      {/* Row 2 — 4 secondary stats compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/50">
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" /> Assets
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{s.totalAssets.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3 h-3 shrink-0" /> Wealth Signal
          </span>
          <span className="text-xs font-bold text-primary tabular-nums">{(s.avgBayesianScore * 100).toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Phone className="w-3 h-3 shrink-0" /> Profile Coverage
          </span>
          <span className="text-xs font-bold text-cyan-400 tabular-nums">{s.enrichmentCoverage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-3 h-3 shrink-0" /> Data Sources
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{s.registryCount}</span>
        </div>
      </div>
    </div>
  );
}

// ── WealthTierBar ─────────────────────────────────────────────────────────────
function WealthTierBar() {
  const tiers = STATIC_STATS.wealthTiers;
  const total = tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown;
  const pct = (n: number) => total > 0 ? Math.max((n / total) * 100, n > 0 ? 1 : 0) : 0;
  const segments = [
    { label: "Ultra >$100M",  val: tiers.ultraHnw, cls: "bg-violet-500", textCls: "text-violet-400" },
    { label: "Very $30–100M", val: tiers.veryHnw,  cls: "bg-primary",   textCls: "text-primary" },
    { label: "HNW $4–30M",    val: tiers.hnw,      cls: "bg-amber-500", textCls: "text-amber-400" },
    { label: "Unknown",        val: tiers.unknown,   cls: "bg-muted/60",  textCls: "text-muted-foreground" },
  ];
  return (
    <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center gap-3 min-w-0">
      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap hidden sm:block shrink-0">
        Wealth Tiers
      </span>
      <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
        {segments.map((seg) => (
          <div key={seg.label} className={cn("h-full transition-all duration-700", seg.cls)} style={{ width: `${pct(seg.val)}%` }} />
        ))}
      </div>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap shrink-0">
        {segments.filter((s) => s.val > 0).map((seg) => (
          <div key={seg.label} className={cn("flex items-center gap-1.5 text-[9px] font-mono whitespace-nowrap", seg.textCls)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", seg.cls)} />
            <span className="sm:hidden">{seg.val.toLocaleString()}</span>
            <span className="hidden sm:inline-flex">{seg.label.split(" ")[0]}: {seg.val.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HotLeadCard ───────────────────────────────────────────────────────────────
function HotLeadCard({ lead }: { lead: typeof STATIC_HOT_LEADS[0] }) {
  return (
    <div
      className="block p-4 hover:bg-muted/30 transition-colors group border-b border-border last:border-0 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-sm flex items-center gap-1">
            {formatEntityName(lead.entityName)}
            <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          </h3>
          <div className="text-xs font-mono mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={cn("px-1.5 py-0.5 rounded border text-[9px] uppercase whitespace-nowrap", getTypeBadgeStyles(lead.entityType))}>
              {lead.entityType}
            </span>
            <span className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] uppercase text-muted-foreground whitespace-nowrap">
              {lead.nationality || "Unk"}
            </span>
            {lead.contactEmail && (
              <span className="flex items-center gap-0.5 text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                <Mail className="w-2.5 h-2.5" />
                <span className="text-[9px] font-mono">EMAIL</span>
              </span>
            )}
            {lead.contactPhone && (
              <span className="flex items-center gap-0.5 text-cyan-400 border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                <Phone className="w-2.5 h-2.5" />
                <span className="text-[9px] font-mono">PHONE</span>
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <AccessScoreBadge score={lead.accessScore} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-2.5 flex items-center justify-between">
        <span>Net Worth: <span className="text-foreground">{formatCurrency(lead.estimatedNetWorth)}</span></span>
        <span>Assets: <span className="text-foreground">{lead.assetCount}</span></span>
      </div>
      <div className="bg-background rounded p-2 text-xs font-mono border border-border">
        <span className="text-primary mr-2">SIGNAL:</span>
        <span className="text-foreground/80 line-clamp-2">{formatSignal(lead.signal)}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-end">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-[10px] font-mono text-muted-foreground/50 flex items-center gap-0.5 hover:text-primary transition-colors px-2 py-1 rounded border border-border/0 hover:border-border"
        >
          Network map <ChevronRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── BackgroundActivityCard (stubbed — shows idle) ─────────────────────────────
function BackgroundActivityCard() {
  return (
    <div className="border-t border-border bg-card/30 px-4 py-2.5 flex-shrink-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-muted-foreground/30" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Background tasks idle
          </span>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors whitespace-nowrap ml-2 flex items-center gap-0.5"
        >
          View Tasks <ChevronRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Stubbed map placeholder ───────────────────────────────────────────────────
function MapPlaceholder() {
  const s = STATIC_STATS;
  const totalPlotted = STATIC_MAP_POINTS.length;

  return (
    <div className="w-full h-full min-h-[300px] relative bg-[#0B0F19] overflow-hidden">
      {/* Dark background mimicking the CartoDB tile layer */}
      <div className="absolute inset-0 bg-[#0B0F19]">
        {/* Subtle grid lines to evoke a map */}
        <svg width="100%" height="100%" className="opacity-[0.06]">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a90d9" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Faint continent silhouette lines */}
        <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-[0.07]">
          {/* North America rough outline */}
          <path d="M 150 80 Q 200 60 260 90 L 290 140 Q 270 180 240 200 L 200 220 Q 160 240 140 210 L 120 170 Z"
            fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
          {/* Europe rough */}
          <path d="M 480 80 Q 520 70 540 100 L 545 140 Q 520 155 490 145 L 475 120 Z"
            fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
          {/* Asia rough */}
          <path d="M 560 70 Q 680 50 750 100 L 760 180 Q 700 210 620 200 L 555 160 Z"
            fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
          {/* South America */}
          <path d="M 230 240 Q 270 230 280 280 L 265 360 Q 240 390 210 370 L 200 310 Z"
            fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
          {/* Africa */}
          <path d="M 480 160 Q 530 150 545 200 L 540 310 Q 510 340 480 320 L 460 270 L 468 200 Z"
            fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
        </svg>

        {/* Plotted asset dots */}
        {STATIC_MAP_POINTS.map((pt) => {
          // Map lat/lon to approximate SVG position within a US-centric view
          // lat 24–50 → y 15%–85%, lon -125 to -66 → x 5%–95%
          const x = ((pt.longitude + 125) / 59) * 90 + 5;
          const y = ((50 - pt.latitude) / 26) * 70 + 15;
          const color =
            pt.category === "RealEstate" ? "#10B981"
            : pt.category === "Marine" ? "#F59E0B"
            : pt.category === "Aviation" ? "#A855F7"
            : "#3B82F6";
          return (
            <div
              key={pt.id}
              className="absolute w-2.5 h-2.5 rounded-full border border-background/50"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}80`,
                transform: "translate(-50%, -50%)",
              }}
              title={`${pt.identifier} · ${pt.category}`}
            />
          );
        })}
      </div>

      {/* Map context bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2.5 bg-card/90 backdrop-blur-md border border-border/70 rounded-full px-3.5 py-1.5 pointer-events-none shadow-lg">
        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest whitespace-nowrap">
          Asset Atlas
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="text-[9px] font-mono text-foreground/70 whitespace-nowrap">
          {totalPlotted.toLocaleString()} plotted of {s.totalAssets.toLocaleString()} total
        </span>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-6 left-4 bg-card/90 border border-border rounded-lg px-3 py-2 backdrop-blur-sm z-[1000]">
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: "Real Estate", color: "#10B981", count: 3201 },
            { label: "Marine",      color: "#F59E0B", count: 884 },
            { label: "Aviation",    color: "#A855F7", count: 1528 },
            { label: "Other",       color: "#3B82F6", count: null },
          ].map(({ label, color, count }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                {label}{count != null && count > 0 ? ` · ${count.toLocaleString()}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaflet stub notice */}
      <div className="absolute bottom-6 right-4 bg-card/80 border border-border/50 rounded px-2 py-1 z-[1000]">
        <span className="text-[9px] font-mono text-muted-foreground/50">map stub · leaflet disabled in sandbox</span>
      </div>
    </div>
  );
}

// ── IngestionPanel (stubbed — shows idle state) ───────────────────────────────
function IngestionPanel() {
  const [targetCount, setTargetCount] = useState(5000);

  return (
    <div className="border-t border-border bg-card/30 px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary truncate">
            Wealth Profile Search
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[10px] font-mono text-muted-foreground">FIND</span>
          <select
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary flex-1 sm:flex-none"
          >
            <option value={500}>500 profiles</option>
            <option value={1000}>1,000 profiles</option>
            <option value={5000}>5,000 profiles</option>
            <option value={10000}>10,000 profiles</option>
            <option value={25000}>25,000 profiles</option>
            <option value={50000}>50,000 profiles</option>
          </select>
        </div>
        <button
          className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={(e) => e.preventDefault()}
        >
          <Play className="w-3 h-3 shrink-0" />
          <span className="truncate">Start Search</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard export ─────────────────────────────────────────────────────
export function Current() {
  const [mobileTab, setMobileTab] = useState<"map" | "signals">("signals");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <StatsBar />
      <WealthTierBar />

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left: global asset map */}
        <div className="flex-1 relative">
          <MapPlaceholder />
        </div>

        {/* Right: signals + ingestion engine */}
        <div className="w-[340px] xl:w-[400px] border-l border-border bg-card/20 flex flex-col overflow-hidden shrink-0">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground truncate">
                Top Hot Leads
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/entities?hot=1" className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                LIVE
              </div>
            </div>
          </div>

          {/* Quick-action strip */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-muted/5 flex-shrink-0">
            <Link
              href="/research"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
            >
              <Play className="w-2.5 h-2.5 shrink-0" /> Run Intel
            </Link>
            <Link
              href="/profiles"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
            >
              <Users className="w-2.5 h-2.5 shrink-0" /> All Profiles
            </Link>
            <Link
              href="/network"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono uppercase tracking-wider border border-border rounded hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors text-muted-foreground"
            >
              <Network className="w-2.5 h-2.5 shrink-0" /> Network
            </Link>
          </div>

          {/* Lead list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {STATIC_HOT_LEADS.map((lead) => (
              <HotLeadCard key={lead.entityId} lead={lead} />
            ))}
          </div>

          {/* Background activity */}
          <BackgroundActivityCard />

          {/* Ingestion panel */}
          <IngestionPanel />
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["signals", "map"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors",
                mobileTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground",
              )}
            >
              {tab === "signals" ? "Live Signals" : "Asset Map"}
            </button>
          ))}
        </div>

        {/* Signals tab */}
        <div className={cn("flex-1 overflow-y-auto flex flex-col", mobileTab !== "signals" && "hidden")}>
          <div className="flex-1 divide-y divide-border">
            {STATIC_HOT_LEADS.map((lead) => (
              <div key={lead.entityId} className="p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{lead.entityName}</h3>
                    <div className="text-xs font-mono mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded border text-[9px] uppercase whitespace-nowrap", getTypeBadgeStyles(lead.entityType))}>
                        {lead.entityType}
                      </span>
                      <span className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] uppercase text-muted-foreground whitespace-nowrap">
                        {lead.nationality || "Unk"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <AccessScoreBadge score={lead.accessScore} />
                  </div>
                </div>
                <div className="bg-background rounded p-2 text-xs font-mono border border-border mt-3">
                  <span className="text-primary mr-2">SIGNAL:</span>
                  <span className="text-foreground/80 line-clamp-2">{formatSignal(lead.signal)}</span>
                </div>
              </div>
            ))}
          </div>
          <BackgroundActivityCard />
        </div>

        {/* Map tab */}
        <div className={cn("flex-1 relative bg-[#0B0F19]", mobileTab !== "map" && "hidden")}>
          <MapPlaceholder />
        </div>
      </div>
    </div>
  );
}

export default Current;
