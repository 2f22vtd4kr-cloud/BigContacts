import React from 'react';
import { ShieldAlert, MapPin, Database, ChevronRight, Activity, AlertTriangle, Globe, Zap, Users, Play, Loader2, CheckCircle2, Mail, Phone, Clock, RefreshCw } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const HOT_LEADS = [
  {
    entityId: "1",
    entityName: "Valeriy K.",
    entityType: "Person",
    nationality: "CY",
    hasEmail: true,
    hasPhone: false,
    bayesianScore: 0.94,
    netWorth: "$420M",
    assetCount: 4,
    signal: "Beneficial owner match on 2 aviation assets via Maltese shell company."
  },
  {
    entityId: "2",
    entityName: "Alerion Aviation Ltd",
    entityType: "Corporate",
    nationality: "BVI",
    hasEmail: false,
    hasPhone: true,
    bayesianScore: 0.88,
    netWorth: "$85M",
    assetCount: 1,
    signal: "Recent change in registered agent. High probability of HNWI backing."
  },
  {
    entityId: "3",
    entityName: "Elena S.",
    entityType: "Person",
    nationality: "CH",
    hasEmail: true,
    hasPhone: true,
    bayesianScore: 0.82,
    netWorth: "$150M",
    assetCount: 3,
    signal: "Linked to 3 high-value London properties acquired in Q3."
  },
  {
    entityId: "4",
    entityName: "Meridian Trust",
    entityType: "Trust",
    nationality: "KY",
    hasEmail: false,
    hasPhone: false,
    bayesianScore: 0.76,
    netWorth: "$920M",
    assetCount: 14,
    signal: "Complex ownership structure obfuscating marine asset."
  }
];

const ScoreBadge = ({ score }: { score: number }) => {
  const isHigh = score >= 0.8;
  const isMedium = score >= 0.5 && score < 0.8;
  return (
    <div className={cn(
      "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1",
      isHigh ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
      isMedium ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20" : 
      "bg-slate-800 text-slate-400 border border-slate-700"
    )}>
      <span>{(score * 100).toFixed(1)}%</span>
    </div>
  );
};

export default function DashDesktop() {
  return (
    <div className="w-full h-full min-h-screen bg-[#050A14] text-slate-200 overflow-hidden font-sans flex items-center justify-center p-8">
      <div className="w-[1280px] h-[800px] border border-[#1E293B] shadow-2xl flex flex-col bg-[#050A14] overflow-hidden rounded-xl">
        
        {/* Top Stats Bar */}
        <div className="grid grid-cols-7 border-b border-[#1E293B] bg-[#050A14]">
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Database className="w-3 h-3"/> Entities</span>
            <span className="text-xl font-bold font-mono">32,100</span>
          </div>
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Assets</span>
            <span className="text-xl font-bold font-mono">32,100</span>
          </div>
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Globe className="w-3 h-3"/> W-HNWIs</span>
            <span className="text-xl font-bold font-mono text-blue-400">42</span>
          </div>
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#10B981]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Signal Avg</span>
            <span className="text-xl font-bold font-mono text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">67.0%</span>
          </div>
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
            <span className="text-[10px] font-mono text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/> Hot Leads</span>
            <span className="text-xl font-bold font-mono text-amber-500">14,811</span>
          </div>
          <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
            <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Mail className="w-3 h-3"/> Contactable</span>
            <span className="text-xl font-bold font-mono text-[#10B981]">0</span>
          </div>
          <div className="flex flex-col px-4 py-3">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Enriched %</span>
            <span className="text-xl font-bold font-mono text-cyan-400">0.0%</span>
          </div>
        </div>

        {/* Wealth Tier Bar */}
        <div className="px-4 py-2 border-b border-[#1E293B] bg-[#0B1220] flex items-center gap-4">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest whitespace-nowrap">Wealth Tiers</span>
          <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
            <div className="h-full bg-violet-500 w-[15%]" />
            <div className="h-full bg-[#10B981] w-[35%]" />
            <div className="h-full bg-amber-500 w-[40%]" />
            <div className="h-full bg-slate-700 w-[10%]" />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-[10px] font-mono text-violet-400">Ultra: 4,815</span>
            <span className="text-[10px] font-mono text-[#10B981]">Very: 11,235</span>
            <span className="text-[10px] font-mono text-amber-400">HNW: 12,840</span>
          </div>
        </div>

        {/* 3-Column Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar: Ingestion controls & Status (15% ~ 220px) */}
          <div className="w-[240px] border-r border-[#1E293B] bg-[#0B1220] flex flex-col">
            <div className="px-4 py-3 border-b border-[#1E293B] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">Ingestion</span>
            </div>
            
            <div className="p-4 flex flex-col gap-6 flex-1 overflow-y-auto">
              {/* Sources */}
              <div>
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3">Registry Sources</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-slate-500" /> FAA
                    </span>
                    <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 30k</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-slate-500" /> HMLR
                    </span>
                    <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> 2k</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-slate-500" /> EDGAR
                    </span>
                    <span className="text-[10px] font-mono text-blue-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> 45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-slate-500" /> W-HNWI
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Queued</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-auto border border-[#1E293B] rounded-lg bg-[#050A14] p-3 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10B981] to-transparent opacity-50" />
                <div className="text-[10px] font-mono text-slate-400 uppercase">Target Pipeline</div>
                <select className="w-full bg-[#0B1220] border border-[#1E293B] rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#10B981]">
                  <option>Western HNWI Engine</option>
                  <option>FAA Registry</option>
                </select>
                <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded font-mono text-xs uppercase tracking-wider bg-[#10B981] text-[#050A14] font-bold hover:bg-[#10B981]/90 transition-colors">
                  <Play className="w-3 h-3" /> Ingest Data
                </button>
              </div>
            </div>
          </div>

          {/* Center Map (60%) */}
          <div className="flex-1 relative bg-[#0B0F19] overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            {/* Map Legend */}
            <div className="absolute bottom-6 left-4 bg-[#0B1220]/90 border border-[#1E293B] rounded-lg px-3 py-2 backdrop-blur-sm z-10 shadow-lg">
              <div className="flex items-center gap-4">
                {[
                  { label: "Real Estate", color: "#10B981" },
                  { label: "Marine",      color: "#F59E0B" },
                  { label: "Aviation",    color: "#A855F7" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-mono text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Crosshair decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-[#10B981]/30 rounded-full flex items-center justify-center pointer-events-none">
               <div className="w-1 h-1 bg-[#10B981]/50 rounded-full" />
            </div>

            {/* Dots */}
            <div className="absolute top-[30%] left-[40%] w-2.5 h-2.5 rounded-full bg-[#10B981] border border-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            <div className="absolute top-[45%] left-[60%] w-2.5 h-2.5 rounded-full bg-[#A855F7] border border-[#0B0F19] shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <div className="absolute top-[20%] left-[70%] w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-[#0B0F19] shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <div className="absolute top-[35%] left-[25%] w-2.5 h-2.5 rounded-full bg-[#10B981] border border-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            <div className="absolute top-[50%] left-[45%] w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-[#0B0F19] shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <div className="absolute top-[60%] left-[75%] w-2.5 h-2.5 rounded-full bg-[#A855F7] border border-[#0B0F19] shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <div className="absolute top-[25%] left-[55%] w-2.5 h-2.5 rounded-full bg-[#10B981] border border-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          </div>

          {/* Right Sidebar: Live Signals (25% ~ 320px) */}
          <div className="w-[320px] border-l border-[#1E293B] bg-[#0B1220] flex flex-col">
            <div className="px-4 py-3 border-b border-[#1E293B] flex justify-between items-center bg-[#050A14]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">Live Signals</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                LIVE
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
              {HOT_LEADS.map((lead) => (
                <div key={lead.entityId} className="p-4 hover:bg-[#1E293B]/30 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-sm text-slate-200 group-hover:text-[#10B981] transition-colors truncate">
                        {lead.entityName}
                      </h3>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{lead.entityType} · {lead.nationality}</span>
                        {lead.hasEmail && (
                          <span className="flex items-center gap-0.5 text-[#10B981]">
                            <Mail className="w-2.5 h-2.5" /> <span className="text-[9px]">EMAIL</span>
                          </span>
                        )}
                        {lead.hasPhone && (
                          <span className="flex items-center gap-0.5 text-[#10B981]">
                            <Phone className="w-2.5 h-2.5" /> <span className="text-[9px]">PHONE</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ScoreBadge score={lead.bayesianScore} />
                  </div>

                  <div className="text-[10px] text-slate-400 mb-2.5 flex items-center justify-between font-mono">
                    <span>Net Worth: <span className="text-slate-200">{lead.netWorth}</span></span>
                    <span>Assets: <span className="text-slate-200">{lead.assetCount}</span></span>
                  </div>

                  <div className="bg-[#050A14] rounded p-2 text-[10px] font-mono border border-[#1E293B]">
                    <span className="text-[#10B981] mr-1.5">SIGNAL:</span>
                    <span className="text-slate-300">{lead.signal}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-slate-500 hover:text-[#10B981] transition-colors flex items-center">
                      Profile <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                    <span className="text-[10px] font-mono text-[#10B981] hover:underline flex items-center">
                      Network <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
