import "./_group.css";
import {
  ShieldAlert, MapPin, Database, ChevronRight, Activity, AlertTriangle,
  Globe, Radio, Zap, Users, Play, Loader2, CheckCircle2, XCircle,
  Mail, Phone, Network, Search, Filter, ArrowRight, Eye, Briefcase,
  Plane, Ship, Check, CircleDashed, Clock, FileText, Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Unknown";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatEntityName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  if (/[a-z]/.test(name)) return name;
  return name.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function getTypeBadgeStyles(type: string) {
  const t = type?.toLowerCase() || "";
  if (t.includes("hnwi") || t.includes("person")) return "text-violet-400 border-violet-400/20 bg-violet-400/10";
  if (t.includes("corp") || t.includes("company")) return "text-blue-400 border-blue-400/20 bg-blue-400/10";
  if (t.includes("trust")) return "text-amber-400 border-amber-400/20 bg-amber-400/10";
  if (t.includes("american")) return "text-rose-400 border-rose-400/20 bg-rose-400/10";
  return "text-muted-foreground border-border bg-card";
}

// Data source mimicking Current.tsx but adapted for the command center
const STATIC_STATS = {
  totalEntities: 14_832,
  hotLeadsCount: 327,
  contactableCount: 2_419,
  enrichmentCoverage: 61.3,
};

const STATIC_HOT_LEADS = [
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
    reason: "Direct email matched to active entity domain. High confidence.",
    evidence: ["Executive Domain Match", "SEC Insider File"],
    status: "Ready"
  },
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
    reason: "Direct email matched via Founders Fund filings.",
    evidence: ["Corporate Email", "Aviation Registry"],
    status: "Ready"
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
    reason: "Known primary associate reachable. Direct contact missing.",
    evidence: ["Network Pathway", "Aviation Registry"],
    status: "Ready"
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
    reason: "Investor relations inbox validated. Entity holds multiple physical assets.",
    evidence: ["Verified IR Inbox", "Marine Registry"],
    status: "Ready"
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
    reason: "Foundation email active, likely gatekept.",
    evidence: ["Foundation Email", "Philanthropic Registry"],
    status: "Needs Enrichment"
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
    reason: "General trust contact available. Low directness.",
    evidence: ["Corporate Phone", "Corporate Email"],
    status: "Needs Enrichment"
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
    reason: "Phone number verified, but belongs to corporate switchboard.",
    evidence: ["Corporate Phone", "Real Estate Deed"],
    status: "Needs Enrichment"
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
    reason: "High net worth verified. No direct contact avenues identified.",
    evidence: ["Real Estate Registry", "Marine Registry"],
    status: "Needs Enrichment"
  },
];

const TASKS = [
  { id: 't1', status: 'completed', text: 'Discovered direct email for Thiel Peter Andreas', time: '2m ago', type: 'discovery' },
  { id: 't2', status: 'active', text: 'Cross-referencing FAA registry against Delaware LLCs', progress: 68, type: 'scan' },
  { id: 't3', status: 'active', text: 'Parsing beneficial ownership filings for Citadel LLC', progress: 34, type: 'scan' },
  { id: 't4', status: 'completed', text: 'Matched Palm Beach property to Kochhar Chanda', time: '1h ago', type: 'discovery' },
];

function AccessScoreBadge({ score, className }: { score: number, className?: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 0.8) return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    if (s >= 0.6) return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    return "text-muted-foreground border-border bg-muted/50";
  };
  
  return (
    <div className={cn("flex flex-col items-center justify-center min-w-[3.5rem] rounded-md border", getScoreColor(score), className)}
      title="Access score — how realistically this person can be reached (0–100)">
      <span className="opacity-70 text-[9px] uppercase tracking-wider leading-none mt-1.5 mb-0.5 font-mono">Access</span>
      <span className="font-bold text-lg tabular-nums leading-none mb-1.5">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

function ContactChip({ type, value, verified = true }: { type: 'email' | 'phone' | 'network', value: string, verified?: boolean }) {
  const Icon = type === 'email' ? Mail : type === 'phone' ? Phone : Network;
  const colors = type === 'email' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' :
                 type === 'phone' ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10' :
                 'text-violet-400 border-violet-400/20 bg-violet-400/10';
  
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono", colors)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[150px]">{value}</span>
      {verified && <CheckCircle2 className="w-3 h-3 opacity-50 ml-1" />}
    </div>
  );
}

function LeadCard({ lead }: { lead: typeof STATIC_HOT_LEADS[0] }) {
  const isHighAccess = lead.accessScore >= 0.8;
  
  return (
    <div className="group flex flex-col md:flex-row gap-4 p-4 md:p-5 border border-border bg-card/40 hover:bg-card/80 transition-colors rounded-xl relative overflow-hidden">
      {/* Access Score Sidebar */}
      <div className="flex flex-row md:flex-col items-center md:items-start gap-4 shrink-0">
        <AccessScoreBadge score={lead.accessScore} />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">Est. Wealth</span>
          <span className="text-sm font-semibold text-foreground tracking-tight">{formatCurrency(lead.estimatedNetWorth)}</span>
        </div>
      </div>
      
      {/* Main Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              {formatEntityName(lead.entityName)}
              {!isHighAccess && <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase", getTypeBadgeStyles(lead.entityType))}>
                {lead.entityType}
              </span>
              <span className="px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[9px] font-mono uppercase text-muted-foreground">
                {lead.nationality || "Unk"}
              </span>
              <div className="flex gap-1.5">
                {lead.evidence.map((ev, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border/50">
                    <FileText className="w-2.5 h-2.5 opacity-50" />
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action button */}
          <button className={cn(
            "shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wide font-semibold transition-all border",
            isHighAccess 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
              : "bg-background text-foreground hover:bg-muted border-border hover:border-muted-foreground/30"
          )}>
            {isHighAccess ? "Open Profile" : "Enrich Data"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contact info & Reason */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1 bg-background/50 rounded-lg p-3 border border-border/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/80 leading-relaxed">
              <span className="font-semibold text-foreground/90 mr-1.5">Why rank {Math.round(lead.accessScore * 100)}?</span>
              {lead.reason}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {lead.contactEmail ? (
              <ContactChip type="email" value={lead.contactEmail} />
            ) : lead.contactPhone ? (
              <ContactChip type="phone" value={lead.contactPhone} />
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-border text-xs font-mono text-muted-foreground">
                <CircleDashed className="w-3.5 h-3.5" />
                <span>No Direct Contact</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRail() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border bg-card/40 shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
            Background Activity
          </h2>
        </div>
        <button className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          All Logs <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto md:overflow-y-auto p-4 flex flex-row md:flex-col gap-4 custom-scrollbar snap-x shrink-0 items-stretch">
        {TASKS.map(task => (
          <div key={task.id} className="relative md:pl-4 min-w-[260px] md:min-w-0 snap-start shrink-0">
            <div className="hidden md:block absolute left-0 top-1 bottom-0 w-px bg-border/50" />
            <div className={cn(
              "hidden md:block absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full border-2 border-background",
              task.status === 'active' ? "bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/40"
            )} />
            
            <div className="bg-background rounded-lg border border-border/50 p-3 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={cn(
                  "text-xs font-medium leading-snug",
                  task.status === 'active' ? "text-foreground" : "text-muted-foreground"
                )}>
                  {task.text}
                </span>
                {task.status === 'completed' ? (
                  <span className="shrink-0 text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.time}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-mono text-primary flex items-center gap-1 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {task.progress}%
                  </span>
                )}
              </div>
              
              <div>
                {task.status === 'active' && (
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.status === 'completed' && task.type === 'discovery' && (
                  <button className="mt-1 text-[10px] font-mono text-primary/80 hover:text-primary flex items-center gap-1">
                    View Discovery <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextMap() {
  return (
    <div className="flex flex-col border-t border-border bg-card/20 md:border-t-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/40">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Global Context
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground/60">{STATIC_STATS.totalEntities.toLocaleString()} profiles</span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {/* Wealth tiers compact visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Asset Distribution</span>
            <span>$5.6T Total</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            <div className="h-full bg-emerald-500 w-[45%]" title="Real Estate" />
            <div className="h-full bg-violet-500 w-[35%]" title="Aviation" />
            <div className="h-full bg-amber-500 w-[20%]" title="Marine" />
          </div>
          <div className="flex gap-3 text-[9px] font-mono text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Real Estate</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-violet-500"/> Aviation</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/> Marine</span>
          </div>
        </div>

        {/* Demoted map representation */}
        <div className="h-[120px] rounded-lg border border-border/50 bg-[#0B0F19] relative overflow-hidden flex items-center justify-center group cursor-pointer">
           <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-[0.15]">
            <path d="M 150 80 Q 200 60 260 90 L 290 140 Q 270 180 240 200 L 200 220 Q 160 240 140 210 L 120 170 Z" fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
            <path d="M 480 80 Q 520 70 540 100 L 545 140 Q 520 155 490 145 L 475 120 Z" fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
            <path d="M 560 70 Q 680 50 750 100 L 760 180 Q 700 210 620 200 L 555 160 Z" fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
            <path d="M 230 240 Q 270 230 280 280 L 265 360 Q 240 390 210 370 L 200 310 Z" fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
            <path d="M 480 160 Q 530 150 545 200 L 540 310 Q 510 340 480 320 L 460 270 L 468 200 Z" fill="none" stroke="#6ab0f5" strokeWidth="1.5" />
          </svg>
          <div className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] top-[40%] left-[25%]" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)] top-[30%] left-[20%]" />
          <div className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] top-[45%] left-[55%]" />
          
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground bg-background/90 px-3 py-1.5 rounded border border-border backdrop-blur-sm flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Open Asset Map
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommandCenter() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready'>('all');
  
  const displayedLeads = activeFilter === 'ready' 
    ? STATIC_HOT_LEADS.filter(l => l.accessScore >= 0.8)
    : STATIC_HOT_LEADS;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight tracking-tight">Apex Atlas</h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-tight">Command Center</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-6 px-4 py-1.5 rounded-md border border-border/50 bg-background/50">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-muted-foreground mb-0.5">Top Targets</span>
            <span className="text-sm font-bold text-foreground leading-none tabular-nums">{STATIC_STATS.hotLeadsCount.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-border/50" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-muted-foreground mb-0.5">Reachable</span>
            <span className="text-sm font-bold text-emerald-400 leading-none tabular-nums">{STATIC_STATS.contactableCount.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-border/50" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-muted-foreground mb-0.5">Coverage</span>
            <span className="text-sm font-bold text-cyan-400 leading-none tabular-nums">{STATIC_STATS.enrichmentCoverage.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex sm:hidden flex-col items-end">
           <span className="text-[9px] font-mono uppercase text-muted-foreground mb-0.5">Reachable</span>
           <span className="text-sm font-bold text-emerald-400 leading-none tabular-nums">{STATIC_STATS.contactableCount.toLocaleString()}</span>
        </div>
      </header>

      {/* Mobile Top Rail (Activity only) */}
      <div className="block md:hidden border-b border-border bg-card/10 shrink-0">
         <TaskRail />
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* Left/Main Column: Best Next Contacts */}
        <div className="flex-1 overflow-y-auto flex flex-col relative z-10 bg-background custom-scrollbar">
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Best Next Contacts</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Profiles ranked by access score. High-scoring targets have corroborated contact vectors or direct network paths.
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50 shrink-0">
              <button 
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-colors",
                  activeFilter === 'all' ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                All Queue
              </button>
              <button 
                onClick={() => setActiveFilter('ready')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-colors flex items-center gap-1.5",
                  activeFilter === 'ready' ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 border border-transparent" : "text-primary/70 hover:text-primary border border-transparent"
                )}
              >
                Ready
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] leading-none",
                  activeFilter === 'ready' ? "bg-primary-foreground/20" : "bg-primary/10"
                )}>
                  {STATIC_HOT_LEADS.filter(l => l.accessScore >= 0.8).length}
                </span>
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-8 space-y-4 max-w-5xl">
            {displayedLeads.map((lead) => (
              <LeadCard key={lead.entityId} lead={lead} />
            ))}
            
            <div className="py-8 flex flex-col items-center justify-center text-center">
               <div className="w-10 h-10 rounded-full border border-dashed border-border flex items-center justify-center mb-3">
                 <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
               </div>
               <p className="text-sm font-medium text-foreground">Enriching queue</p>
               <p className="text-xs text-muted-foreground mt-1">Background tasks are finding more contact vectors...</p>
            </div>
          </div>

          {/* Context Map on Mobile */}
          <div className="block md:hidden mt-auto border-t border-border">
            <ContextMap />
          </div>
        </div>

        {/* Right Rail: Research Activity & Context Map (Desktop) */}
        <div className="hidden w-[320px] lg:w-[380px] xl:w-[420px] border-l border-border bg-card/10 md:flex flex-col overflow-y-auto shrink-0 custom-scrollbar z-20">
          <div className="flex-1 min-h-[300px] flex flex-col border-b border-border">
             <TaskRail />
          </div>
          
          <div className="shrink-0">
             <ContextMap />
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border) / 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}} />
    </div>
  );
}
