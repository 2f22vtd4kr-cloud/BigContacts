import React from 'react';
import { Database, AlertTriangle, Mail, Globe, MapPin, Activity, Phone } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StatsBar() {
  const s = {
    totalEntities: 32542,
    hotLeadsCount: 142,
    contactableCount: 8943,
    westernHnwiCount: 12450,
    totalAssets: 4892,
    avgBayesianScore: 0.784,
    enrichmentCoverage: 84.2,
    registryCount: 8
  };

  return (
    <div className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-20">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        <div className="flex flex-col px-5 py-4 bg-card/90">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Database className="w-3 h-3 shrink-0" /> Entities
          </span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{s.totalEntities.toLocaleString()}</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90 ring-2 ring-inset ring-amber-500/20">
          <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0" /> Hot Leads
          </span>
          <span className="text-2xl font-bold text-amber-500 tabular-nums">{s.hotLeadsCount.toLocaleString()}</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3 shrink-0" /> Contactable
          </span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums">{s.contactableCount.toLocaleString()}</span>
        </div>
        <div className="flex flex-col px-5 py-4 bg-card/90">
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3 shrink-0" /> W-HNWIs
          </span>
          <span className="text-2xl font-bold text-blue-400 tabular-nums">{s.westernHnwiCount.toLocaleString()}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/50">
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" /> Assets
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{s.totalAssets.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3 h-3 shrink-0" /> Signal Avg
          </span>
          <span className="text-xs font-bold text-primary tabular-nums">{(s.avgBayesianScore * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Phone className="w-3 h-3 shrink-0" /> Enriched
          </span>
          <span className="text-xs font-bold text-cyan-400 tabular-nums">{s.enrichmentCoverage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-card/60">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-3 h-3 shrink-0" /> Registries
          </span>
          <span className="text-xs font-bold text-foreground tabular-nums">{s.registryCount}</span>
        </div>
      </div>
    </div>
  );
}

function WealthTierBar() {
  const tiers = {
    ultraHnw: 7392,
    veryHnw: 12503,
    hnw: 8402,
    unknown: 4245
  };
  const total = tiers.ultraHnw + tiers.veryHnw + tiers.hnw + tiers.unknown;
  const pct = (n: number) => total > 0 ? Math.max((n / total) * 100, n > 0 ? 1 : 0) : 0;
  
  const segments = [
    { label: "Ultra >$100M", val: tiers.ultraHnw, cls: "bg-violet-500", textCls: "text-violet-400" },
    { label: "Very $30–100M", val: tiers.veryHnw,  cls: "bg-primary",   textCls: "text-primary" },
    { label: "HNW $4–30M",    val: tiers.hnw,      cls: "bg-amber-500", textCls: "text-amber-400" },
    { label: "Unknown",        val: tiers.unknown,   cls: "bg-muted/60",  textCls: "text-muted-foreground" },
  ];

  return (
    <div className="px-3 py-2 border-b border-border bg-card/30 flex items-center gap-3 min-w-0">
      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap hidden sm:block shrink-0">Wealth Tiers</span>
      <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
        {segments.map((seg) => (
          <div key={seg.label} className={cn("h-full transition-all duration-700", seg.cls)} style={{ width: `${pct(seg.val)}%` }} />
        ))}
      </div>
      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap shrink-0">
        {segments.filter(s => s.val > 0).map((seg) => (
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

export default function DashboardMobile() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .mockup-dark {
          --background: 223 39% 7%;
          --foreground: 215 19% 89%;
          --card: 225 29% 11%;
          --card-foreground: 215 19% 89%;
          --card-border: 227 24% 22%;
          --popover: 225 29% 11%;
          --popover-foreground: 215 19% 89%;
          --popover-border: 227 24% 22%;
          --primary: 160 84% 39%;
          --primary-foreground: 0 0% 100%;
          --secondary: 217 91% 60%;
          --secondary-foreground: 0 0% 100%;
          --muted: 225 25% 16%;
          --muted-foreground: 215 16% 65%;
          --accent: 217 91% 60%;
          --accent-foreground: 0 0% 100%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 210 40% 98%;
          --border: 227 24% 22%;
          --input: 227 24% 22%;
          --ring: 160 84% 39%;
        }
      `}} />
      <div className="w-[390px] h-[844px] flex flex-col bg-[#0B0F19] text-foreground font-sans mockup-dark dark mx-auto border-x border-border/50 shadow-2xl my-8 overflow-hidden rounded-3xl ring-8 ring-card" style={{ colorScheme: 'dark' }}>
        <main className="flex-1 flex flex-col min-w-0 bg-[#0B0F19]">
          <StatsBar />
          <WealthTierBar />
          <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <span className="text-muted-foreground/20 text-sm font-mono tracking-widest uppercase">Content Area</span>
          </div>
        </main>
        
        {/* Sidebar footer visible on mobile for preview purposes */}
        <div className="mt-auto bg-card border-t border-border shrink-0 relative z-10">
          <div className="p-4 border-t border-border">
            <div className="px-3 py-2 flex flex-col gap-1 text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
              <div>v0.2 · 32.5k entities</div>
              <div className="text-[10px] opacity-70">PRIVATE INTELLIGENCE</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}