import React, { useState } from "react";
import {
  Database,
  MapPin,
  AlertTriangle,
  Mail,
  ShieldAlert,
  ChevronRight,
  Zap,
  Play,
} from "lucide-react";

export default function DashMobile() {
  const [activeTab, setActiveTab] = useState<"signals" | "map">("signals");

  return (
    <div className="w-full min-h-screen bg-[#050A14] flex items-center justify-center font-['Inter',sans-serif] p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-mono { font-family: 'Space Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .map-dot { box-shadow: 0 0 10px currentColor; }
      `}</style>
      
      <div className="w-[390px] h-[820px] bg-[#070D1A] flex flex-col overflow-hidden relative shadow-2xl rounded-[40px] border-[8px] border-black ring-1 ring-slate-800">
        
        {/* Top Header/Status Bar Mock */}
        <div className="h-6 w-full flex items-center justify-between px-6 pt-2 pb-1 z-50">
          <span className="text-[11px] font-bold text-white">9:41</span>
          <div className="w-24 h-5 bg-black rounded-full absolute top-1 left-1/2 -translate-x-1/2" />
          <div className="flex gap-1.5 items-center">
            <div className="w-3 h-3 rounded-full border border-white opacity-80" />
            <div className="w-3 h-3 rounded-full border border-white opacity-80" />
          </div>
        </div>

        {/* Branding & Pulse */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0A1122]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[#10B981] map-dot text-[#10B981]" />
            <span className="text-sm font-mono font-bold tracking-widest text-white uppercase">
              ApexFinder
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded-sm border border-[#10B981]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            LIVE
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-3 border-b border-slate-800/80 bg-[#0A1122]/50">
          {[
            { label: "Entities", val: "32.1k", color: "text-slate-300" },
            { label: "Hot Leads", val: "14.8k", color: "text-amber-500" },
            { label: "Contact", val: "114", color: "text-[#10B981]" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-2.5 border-r border-slate-800/80 last:border-0">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
                {stat.label}
              </span>
              <span className={`text-sm font-bold ${stat.color}`}>
                {stat.val}
              </span>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-[#0A1122]">
          <button 
            onClick={() => setActiveTab("signals")}
            className={`flex-1 py-3.5 text-xs font-mono uppercase tracking-widest transition-colors ${
              activeTab === "signals" ? "text-[#10B981] border-b-2 border-[#10B981] bg-[#10B981]/5" : "text-slate-500"
            }`}
          >
            Live Signals
          </button>
          <button 
            onClick={() => setActiveTab("map")}
            className={`flex-1 py-3.5 text-xs font-mono uppercase tracking-widest transition-colors ${
              activeTab === "map" ? "text-[#10B981] border-b-2 border-[#10B981] bg-[#10B981]/5" : "text-slate-500"
            }`}
          >
            Asset Map
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-[#070D1A]">
          {activeTab === "signals" ? (
            <div className="divide-y divide-slate-800/60 pb-20">
              {[
                { name: "Chadwick John Huston", type: "HNWI", nat: "American", score: 94, signal: "Newly acquired 45m motor yacht via BVI shell corp" },
                { name: "Peter Thiel", type: "HNWI", nat: "American", score: 94, signal: "Filing 13D detected: 5.4% stake in unlisted biotech" },
                { name: "James Kim", type: "HNWI", nat: "Unknown", score: 91, signal: "Multiple high-value real estate transactions in Miami" },
                { name: "Elena Rostova", type: "UHNWI", nat: "British", score: 88, signal: "New directorship in Luxembourg holding company" },
              ].map((lead, i) => (
                <div key={i} className="p-5 active:bg-[#0F172A] transition-colors cursor-pointer touch-manipulation">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-bold text-slate-100 truncate text-[15px]">
                        {lead.name}
                      </h3>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
                        {lead.type} <span className="opacity-50 mx-1">·</span> {lead.nat}
                      </div>
                    </div>
                    <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] px-2 py-1 rounded flex items-center justify-center font-mono font-bold text-sm min-w-[36px]">
                      {lead.score}
                    </div>
                  </div>

                  <div className="bg-[#050A14] rounded-md p-3 text-xs font-mono border border-slate-800/80 mb-4 text-slate-300 leading-relaxed">
                    <span className="text-[#10B981] mr-2 font-bold block mb-1">SIG_TX:</span>
                    {lead.signal}
                  </div>

                  <div className="flex items-center gap-6">
                    <button className="text-[11px] font-mono text-slate-400 flex items-center hover:text-white uppercase tracking-wider py-1">
                      Profile <ChevronRight className="w-3 h-3 ml-1 opacity-70" />
                    </button>
                    <button className="text-[11px] font-mono text-[#10B981] flex items-center uppercase tracking-wider py-1">
                      Network <ChevronRight className="w-3 h-3 ml-1 opacity-70" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#050A14]">
              {/* Fake map background */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '30px 30px'
              }} />
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 40% 50%, rgba(16,185,129,0.1) 0%, transparent 60%)`
              }} />
              
              <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-[#10B981] rounded-full map-dot text-[#10B981] animate-pulse" />
              <div className="absolute top-[60%] left-[70%] w-2.5 h-2.5 bg-amber-500 rounded-full map-dot text-amber-500" />
              <div className="absolute top-[20%] left-[60%] w-2 h-2 bg-purple-500 rounded-full map-dot text-purple-500" />
              
              <div className="text-xs font-mono text-slate-500 bg-[#0A1122]/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur">
                Map View Active
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Bar (Fixed Bottom) */}
        {activeTab === "signals" && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-[#0A1122]/95 backdrop-blur-md px-5 py-5 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center gap-2 bg-[#050A14] border border-slate-800 rounded-md h-12 flex-[0.8]">
                <span className="text-[10px] font-mono text-slate-500 uppercase">TGT</span>
                <span className="text-sm font-mono text-slate-300">5k</span>
              </div>
              <button className="flex-1 h-12 flex items-center justify-center gap-2 rounded-md font-mono text-sm font-bold uppercase tracking-wider bg-[#10B981] text-[#070D1A] active:bg-[#10B981]/80 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Play className="w-4 h-4 fill-current" />
                Ingest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
