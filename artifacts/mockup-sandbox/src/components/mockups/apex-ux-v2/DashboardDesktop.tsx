import React from "react";
import { 
  Database, Activity, Globe, Radio, Users, 
  Loader2, Mail, Phone, Network, MapPin, 
  ShieldCheck, BookOpen, ChevronRight 
} from "lucide-react";
import "./_group.css";

export default function DashboardDesktop() {
  return (
    <div className="mockup-root w-[1280px] h-[800px] flex flex-col font-sans overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
         style={{
           "--background": "223 39% 7%",
           "--foreground": "215 19% 89%",
           "--card": "225 29% 11%",
           "--border": "227 24% 22%",
           "--muted": "225 25% 16%",
           "--muted-foreground": "215 16% 65%",
           "--primary": "160 84% 39%",
           "--secondary": "217 91% 60%",
         } as React.CSSProperties}>
      
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 shrink-0">
        <div className="flex items-center gap-0 overflow-x-auto divide-x divide-[hsl(var(--border))]">
          <div className="px-6 py-3 shrink-0">
            <h1 className="text-xs font-mono font-bold uppercase tracking-widest whitespace-nowrap">
              Dashboard
            </h1>
            <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]/60 mt-0.5 whitespace-nowrap">
              Public registry intelligence
            </p>
          </div>

          <div className="flex flex-col px-4 py-3 shrink-0 hover:bg-[hsl(var(--primary))]/5 transition-colors cursor-pointer group">
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <Mail className="w-2.5 h-2.5" />
              Reachable
            </span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums leading-tight">
              847
            </span>
          </div>

          <div className="flex flex-col px-4 py-3 shrink-0">
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1">
              <BookOpen className="w-2.5 h-2.5" />
              Sessions
            </span>
            <span className="text-xl font-bold text-blue-400 tabular-nums leading-tight">
              3
            </span>
          </div>

          <div className="flex flex-col px-4 py-3 shrink-0">
            <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest flex items-center gap-1">
              <Database className="w-2.5 h-2.5" />
              Profiles
            </span>
            <span className="text-xl font-bold tabular-nums leading-tight">
              32,541
            </span>
          </div>

          <div className="flex-col px-4 py-3 shrink-0 flex">
            <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              Coverage
            </span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums leading-tight">
              0.4%
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-3 ml-auto shrink-0">
            <ShieldCheck className="w-3 h-3 text-[hsl(var(--muted-foreground))]/40" />
            <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/40 uppercase tracking-widest whitespace-nowrap">
              Public registry data only
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Contact Queue */}
        <section className="flex-1 flex flex-col border-r border-[hsl(var(--border))]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest">
                Priority Queue
              </h2>
              <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/60">
                ranked by access score
              </span>
            </div>
            <div className="text-[10px] font-mono text-[hsl(var(--primary))]/60 hover:text-[hsl(var(--primary))] flex items-center gap-0.5 cursor-pointer">
              All profiles <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
            {[
              { name: "Thiel Peter", type: "HNWI", access: 87, label: "Direct", color: "text-[hsl(var(--primary))] border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15", chips: ["EMAIL", "PHONE", "NETWORK"], assets: 4, nw: "$2.1B" },
              { name: "Chadwick James", type: "HNWI", access: 54, label: "Reachable", color: "text-amber-400 border-amber-400/30 bg-amber-400/8", chips: ["NETWORK", "SESSION"], assets: 1, nw: "$45M" },
              { name: "Henderson Trust", type: "Trust", access: 23, label: "Weak", color: "text-orange-400 border-orange-400/20 bg-orange-400/8", chips: ["Registry trace only"], assets: 12, nw: "$1.4B" },
              { name: "Bezos Jeffrey", type: "HNWI", access: 91, label: "Direct", color: "text-[hsl(var(--primary))] border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15", chips: ["EMAIL", "PHONE", "NETWORK"], assets: 22, nw: "$182.4B" },
              { name: "Morrison Aviation LLC", type: "Corporation", access: 0, label: "No vector", color: "text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30", chips: ["Registry trace only"], assets: 1, nw: "Unknown" },
            ].map((lead, i) => (
              <article key={i} className="p-4 hover:bg-[hsl(var(--muted))]/20 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm group-hover:text-[hsl(var(--primary))] transition-colors truncate flex items-center gap-1">
                      {lead.name}
                      <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded border text-[9px] uppercase font-mono whitespace-nowrap text-violet-400 border-violet-400/20 bg-violet-400/10">
                        {lead.type}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${lead.color}`}>
                    <span className="font-bold tabular-nums text-[11px]">{lead.access}</span>
                    <span className="opacity-60 text-[9px] uppercase tracking-wide leading-none">{lead.label}</span>
                  </div>
                </div>

                <div className="mb-2 flex gap-1.5">
                  {lead.chips.map((chip, ci) => (
                    <span key={ci} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      chip === "EMAIL" ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" :
                      chip === "PHONE" ? "text-cyan-400 border-cyan-400/20 bg-cyan-400/10" :
                      chip === "NETWORK" ? "text-blue-400 border-blue-400/20 bg-blue-400/10" :
                      chip === "SESSION" ? "text-violet-400 border-violet-400/20 bg-violet-400/10" :
                      "text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"
                    }`}>
                      {chip === "EMAIL" && <Mail className="w-2.5 h-2.5" />}
                      {chip === "PHONE" && <Phone className="w-2.5 h-2.5" />}
                      {chip === "NETWORK" && <Network className="w-2.5 h-2.5" />}
                      {chip === "SESSION" && <BookOpen className="w-2.5 h-2.5" />}
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                  {lead.nw !== "Unknown" && <span className="text-[hsl(var(--foreground))]/80">{lead.nw}</span>}
                  {lead.nw !== "Unknown" && lead.assets > 0 && <span>·</span>}
                  {lead.assets > 0 && <span>{lead.assets} assets</span>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded border border-[hsl(var(--border))] text-[9px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <BookOpen className="w-2.5 h-2.5" />
                    Profile
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded border border-[hsl(var(--border))] text-[9px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <Network className="w-2.5 h-2.5" />
                    Network
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Right: Live Research rail */}
        <aside className="w-[280px] xl:w-[320px] shrink-0 bg-[hsl(var(--card))]/20 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest">
                Live Research
              </h2>
            </div>
            <div className="flex items-center gap-1.5" title="Enrichment coverage">
              <div className="relative w-3 h-3 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--primary))]/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
              </div>
              <span className="text-[10px] font-mono text-[hsl(var(--primary))] font-bold">
                0%
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <section className="flex flex-col gap-2 border border-[hsl(var(--primary))]/20 rounded-lg bg-[hsl(var(--primary))]/5 p-1 m-2">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[hsl(var(--primary))] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    2 tasks running
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[hsl(var(--primary))]/60 flex items-center gap-0.5">
                  View all activity <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              
              <div className="px-3 space-y-3 pb-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[hsl(var(--primary))] shrink-0" />
                    <span className="text-xs font-mono text-[hsl(var(--foreground))]/90 truncate flex-1">SEC EDGAR Ingest</span>
                    <span className="text-[9px] font-mono uppercase shrink-0 text-[hsl(var(--primary))]">running</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5.5">
                    <div className="flex-1 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full bg-[hsl(var(--primary))] rounded-full" style={{ width: "42%" }} />
                    </div>
                    <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] w-7 text-right tabular-nums">42%</span>
                  </div>
                  <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/70 pl-5.5 truncate">Parsing Form 4s...</p>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[hsl(var(--primary))] shrink-0" />
                    <span className="text-xs font-mono text-[hsl(var(--foreground))]/90 truncate flex-1">OpenCorporates Sync</span>
                    <span className="text-[9px] font-mono uppercase shrink-0 text-[hsl(var(--primary))]">running</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5.5">
                    <div className="flex-1 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full bg-[hsl(var(--primary))] rounded-full" style={{ width: "12%" }} />
                    </div>
                    <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] w-7 text-right tabular-nums">12%</span>
                  </div>
                  <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/70 pl-5.5 truncate">Rate limited, backing off...</p>
                </div>
              </div>
            </section>

            <section className="border-t border-[hsl(var(--border))] pt-3 pb-4 px-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    Global context
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[hsl(var(--primary))]/60 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> Open asset map
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/60 uppercase tracking-widest whitespace-nowrap shrink-0">
                  Wealth tiers
                </span>
                <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
                  <div className="bg-violet-500" style={{ width: '15%' }} />
                  <div className="bg-[hsl(var(--primary))]" style={{ width: '25%' }} />
                  <div className="bg-amber-500" style={{ width: '40%' }} />
                  <div className="bg-[hsl(var(--muted))]/60" style={{ width: '20%' }} />
                </div>
              </div>
            </section>
          </div>

          <div className="px-4 py-2 border-t border-[hsl(var(--border))] shrink-0">
            <p className="text-[9px] font-mono text-[hsl(var(--muted-foreground))]/40 flex items-center gap-1.5">
              <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
              Public registry sources only · Source attribution on every record
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
