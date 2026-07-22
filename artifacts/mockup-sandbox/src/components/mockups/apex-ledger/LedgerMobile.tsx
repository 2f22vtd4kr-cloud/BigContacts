import React from 'react';
import { Search, SlidersHorizontal, ShieldAlert } from 'lucide-react';

const ENTITIES = [
  { name: "Chadwick John Huston", type: "HNWI", nationality: "American", isHot: true, score: 94, contact: ["EMAIL"], netWorth: "$1.4B" },
  { name: "Peter Thiel", type: "HNWI", nationality: "American", isHot: false, score: 94, contact: [], netWorth: "$7.2B" },
  { name: "Berkshire Holdings LLC", type: "Corporation", nationality: "US", isHot: false, score: 87, contact: [], netWorth: "$14.2B AUM" },
  { name: "Cayman Trust No. 4421", type: "Trust", nationality: "Cayman Islands", isHot: false, score: 72, contact: [], netWorth: "Undisclosed" },
  { name: "James Richardson", type: "Gatekeeper", nationality: "British", isHot: false, score: 68, contact: ["PHONE"], netWorth: "N/A" },
  { name: "Nordic Shipping AS", type: "Corporation", nationality: "Norway", isHot: false, score: 61, contact: [], netWorth: "$450M" },
];

const TYPE_COLORS: Record<string, string> = {
  "HNWI": "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30",
  "Corporation": "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "Trust": "text-purple-400 bg-purple-400/10 border-purple-400/30",
  "Gatekeeper": "text-slate-300 bg-slate-300/10 border-slate-300/30",
};

export default function LedgerMobile() {
  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-[#070D1A] text-slate-200 font-sans border-x border-slate-800/50 flex flex-col">
      <div className="sticky top-0 z-10 bg-[#070D1A]/95 backdrop-blur-md border-b border-slate-800/50 px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 bg-[#0a1120] border border-slate-800/60 rounded-md px-3 py-2 mb-4">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search ledger..." 
            className="bg-transparent border-none outline-none text-sm font-mono flex-1 text-slate-200 placeholder:text-slate-600"
          />
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {['ALL', 'HNWI', 'CORP', 'TRUST', 'GATE'].map((f, i) => (
            <button key={f} className={`flex-shrink-0 px-3 py-1 text-[10px] font-mono font-bold rounded-full border ${i === 0 ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40' : 'bg-[#0a1120] text-slate-400 border-slate-800 hover:text-slate-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {ENTITIES.map((entity, i) => (
          <div key={i} className="px-4 py-4 border-b border-slate-800/40 active:bg-slate-800/40 transition-colors cursor-pointer flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-bold text-[15px] truncate text-slate-100">{entity.name}</span>
                {entity.isHot && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                    <ShieldAlert className="w-2.5 h-2.5" /> Hot Lead
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${TYPE_COLORS[entity.type]}`}>
                  {entity.type.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">{entity.nationality}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-mono">{entity.netWorth}</span>
                {entity.contact.map(c => (
                  <span key={c} className="text-[9px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded uppercase tracking-wider border border-[#10B981]/20">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-end pt-1">
              <div className={`font-mono text-[13px] font-bold px-2 py-0.5 rounded border ${
                entity.score >= 90 ? 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30' :
                entity.score >= 70 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' :
                'text-red-500 bg-red-500/10 border-red-500/30'
              }`}>
                {entity.score}
              </div>
              <span className="text-[9px] font-mono text-slate-600 mt-1.5 uppercase tracking-widest">Score</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
