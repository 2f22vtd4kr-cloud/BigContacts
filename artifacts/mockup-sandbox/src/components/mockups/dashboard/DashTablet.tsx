import React from 'react';
import { ShieldAlert, MapPin, Database, Activity, AlertTriangle, Globe, Zap, Mail, Phone, Play } from "lucide-react";

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

export default function DashTablet() {
  return (
    <div className="w-full h-full min-h-screen bg-[#050A14] flex items-center justify-center p-8">
      <div className="w-[768px] h-[1024px] border border-[#1E293B] shadow-2xl flex flex-col bg-[#050A14] overflow-hidden rounded-xl">
        
        {/* Top Navigation Fake */}
        <div className="px-5 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#0B1220]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#10B981]" />
            <span className="text-sm font-mono font-bold uppercase tracking-widest text-slate-200">ApexFinder Pro Tablet</span>
          </div>
        </div>

        {/* Stats Grid - 4+3 split across 2 rows */}
        <div className="flex flex-col border-b border-[#1E293B] bg-[#050A14] sticky top-0 z-20 shadow-md shadow-[#050A14]/50">
          <div className="grid grid-cols-4 border-b border-[#1E293B]">
            <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Database className="w-3 h-3"/> Entities</span>
              <span className="text-xl font-bold font-mono text-slate-200">32,100</span>
            </div>
            <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Assets</span>
              <span className="text-xl font-bold font-mono text-slate-200">32,100</span>
            </div>
            <div className="flex flex-col px-4 py-3 border-r border-[#1E293B]">
              <span className="text-[10px] font-mono text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/> Hot Leads</span>
              <span className="text-xl font-bold font-mono text-amber-500">14,811</span>
            </div>
            <div className="flex flex-col px-4 py-3">
              <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Signal Avg</span>
              <span className="text-xl font-bold font-mono text-[#10B981]">67.0%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 bg-[#0B1220]">
            <div className="flex flex-col px-4 py-2 border-r border-[#1E293B]">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><Globe className="w-3 h-3"/> W-HNWIs</span>
              <span className="text-lg font-bold font-mono text-blue-400">42</span>
            </div>
            <div className="flex flex-col px-4 py-2 border-r border-[#1E293B]">
              <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><Mail className="w-3 h-3"/> Contactable</span>
              <span className="text-lg font-bold font-mono text-[#10B981]">0</span>
            </div>
            <div className="flex flex-col px-4 py-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Enriched %</span>
              <span className="text-lg font-bold font-mono text-cyan-400">0.0%</span>
            </div>
          </div>
        </div>

        {/* Split Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map (55%) */}
          <div className="w-[55%] relative bg-[#0B0F19] overflow-hidden border-r border-[#1E293B]">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <div className="absolute bottom-6 left-4 bg-[#0B1220]/90 border border-[#1E293B] rounded-lg px-3 py-2 backdrop-blur-sm z-10 shadow-lg">
              <div className="flex flex-col gap-2">
                {[
                  { label: "Real Estate", color: "#10B981" },
                  { label: "Marine",      color: "#F59E0B" },
                  { label: "Aviation",    color: "#A855F7" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-mono text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="absolute top-[30%] left-[40%] w-3 h-3 rounded-full bg-[#10B981] border border-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            <div className="absolute top-[45%] left-[60%] w-3 h-3 rounded-full bg-[#A855F7] border border-[#0B0F19] shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <div className="absolute top-[20%] left-[70%] w-3 h-3 rounded-full bg-[#F59E0B] border border-[#0B0F19] shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <div className="absolute top-[60%] left-[35%] w-3 h-3 rounded-full bg-[#10B981] border border-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          </div>

          {/* Live Signals & Ingest (45%) */}
          <div className="w-[45%] flex flex-col bg-[#0B1220] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E293B] flex justify-between items-center bg-[#050A14] shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">Live Signals</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> LIVE
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
              {HOT_LEADS.map((lead) => (
                <div key={lead.entityId} className="p-4 hover:bg-[#1E293B]/30 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-sm text-slate-200 group-hover:text-[#10B981] transition-colors truncate">
                        {lead.entityName}
                      </h3>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {lead.entityType} · {lead.nationality}
                      </div>
                    </div>
                    <ScoreBadge score={lead.bayesianScore} />
                  </div>
                  <div className="text-[10px] text-slate-400 mb-2.5 flex items-center justify-between font-mono">
                    <span>NW: <span className="text-slate-200">{lead.netWorth}</span></span>
                    <span>Ast: <span className="text-slate-200">{lead.assetCount}</span></span>
                  </div>
                  <div className="bg-[#050A14] rounded p-2.5 text-[11px] leading-relaxed font-mono border border-[#1E293B]">
                    <span className="text-[#10B981] mr-1.5">SIGNAL:</span>
                    <span className="text-slate-300">{lead.signal}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ingest Panel */}
            <div className="border-t border-[#1E293B] bg-[#050A14] p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#10B981] flex items-center gap-1.5"><Zap className="w-3 h-3"/> W-HNWI Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="flex-1 bg-[#0B1220] border border-[#1E293B] rounded px-2 py-2 text-xs font-mono text-slate-200 focus:outline-none">
                  <option>Target: 5,000</option>
                  <option>Target: 10,000</option>
                </select>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded font-mono text-xs uppercase tracking-wider bg-[#10B981] text-[#050A14] font-bold hover:bg-[#10B981]/90 transition-colors">
                  <Play className="w-3 h-3" /> Ingest
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
