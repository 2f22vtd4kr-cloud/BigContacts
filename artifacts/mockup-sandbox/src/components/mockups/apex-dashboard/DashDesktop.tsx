import React, { useState } from "react";
import {
  Database,
  MapPin,
  Globe,
  Activity,
  AlertTriangle,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
  Zap,
  Play,
} from "lucide-react";

export default function DashDesktop() {
  return (
    <div className="w-[1280px] h-[820px] bg-[#070D1A] text-slate-300 flex flex-col overflow-hidden relative mx-auto shadow-2xl font-['Inter',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-mono { font-family: 'Space Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .map-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        .map-dot {
          box-shadow: 0 0 12px currentColor;
        }
        .scanline {
          width: 100%;
          height: 100px;
          z-index: 10;
          position: absolute;
          pointer-events: none;
          background: linear-gradient(0deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.05) 50%, rgba(16,185,129,0) 100%);
          animation: scan 8s linear infinite;
        }
        @keyframes scan {
          0% { top: -100px; }
          100% { top: 100%; }
        }
      `}</style>

      {/* Stats Bar */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-[#0A1122]/80 backdrop-blur z-20">
        {[
          { label: "Entities", val: "32,100", icon: Database, color: "text-slate-400" },
          { label: "Assets", val: "32,100", icon: MapPin, color: "text-slate-400" },
          { label: "W-HNWIs", val: "42", icon: Globe, color: "text-blue-400" },
          { label: "Signal Avg", val: "67.0%", icon: Activity, color: "text-[#10B981]" },
          { label: "Hot Leads", val: "14,811", icon: AlertTriangle, color: "text-amber-500" },
          { label: "Contactable", val: "114", icon: Mail, color: "text-[#10B981]" },
          { label: "Enriched", val: "0.4%", icon: Phone, color: "text-cyan-400" },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col px-4 py-3 border-r border-slate-800 last:border-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <stat.icon className={`w-3 h-3 ${stat.color !== 'text-slate-400' ? stat.color : ''}`} /> {stat.label}
            </span>
            <span className={`text-xl font-bold ${stat.color === 'text-slate-400' ? 'text-white' : stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* Wealth Tier Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0A1122]/50 flex items-center gap-4 z-20">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest whitespace-nowrap">
          Wealth Tiers
        </span>
        <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px opacity-90">
          <div className="h-full bg-violet-500" style={{ width: "20%" }} />
          <div className="h-full bg-[#10B981]" style={{ width: "12%" }} />
          <div className="h-full bg-amber-500" style={{ width: "68%" }} />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-[10px] font-mono text-violet-400">Ultra &gt;$100M: 7,392</span>
          <span className="text-[10px] font-mono text-[#10B981]">Very $30-100M: 4,616</span>
          <span className="text-[10px] font-mono text-amber-400">HNW $4-30M: 24,568</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="scanline" />

        {/* Map Area */}
        <div className="flex-1 relative bg-[#050A14] map-grid overflow-hidden">
          {/* Abstract map overlay placeholder */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, rgba(16,185,129,0.15) 0%, transparent 40%),
                              radial-gradient(circle at 70% 60%, rgba(59,130,246,0.1) 0%, transparent 40%)`
          }} />
          
          {/* Faux Map Points */}
          <div className="absolute top-[30%] left-[25%] w-2 h-2 bg-[#10B981] rounded-full map-dot text-[#10B981]" />
          <div className="absolute top-[32%] left-[26%] w-1.5 h-1.5 bg-[#10B981] rounded-full map-dot text-[#10B981] opacity-70" />
          
          <div className="absolute top-[45%] left-[65%] w-2.5 h-2.5 bg-amber-500 rounded-full map-dot text-amber-500" />
          <div className="absolute top-[48%] left-[70%] w-2 h-2 bg-purple-500 rounded-full map-dot text-purple-500" />
          
          <div className="absolute top-[20%] left-[55%] w-2 h-2 bg-[#3B82F6] rounded-full map-dot text-[#3B82F6]" />
          <div className="absolute top-[60%] left-[20%] w-3 h-3 bg-[#10B981] rounded-full map-dot text-[#10B981] animate-pulse" />

          {/* Map legend */}
          <div className="absolute bottom-6 left-6 bg-[#0A1122]/90 border border-slate-800 rounded-lg px-4 py-3 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-5">
              {[
                { label: "Real Estate", color: "#10B981" },
                { label: "Marine",      color: "#F59E0B" },
                { label: "Aviation",    color: "#A855F7" },
                { label: "Other",       color: "#3B82F6" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full map-dot" style={{ backgroundColor: color, color: color }} />
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Signals */}
        <div className="w-[420px] border-l border-slate-800 bg-[#0A1122]/80 backdrop-blur-md flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0A1122]">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">
                Live Signals
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#10B981]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse map-dot" />
              MONITORING
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {[
              { name: "Chadwick John Huston", type: "HNWI", nat: "American", score: 94, signal: "Newly acquired 45m motor yacht via BVI shell corp" },
              { name: "Peter Thiel", type: "HNWI", nat: "American", score: 94, signal: "Filing 13D detected: 5.4% stake in unlisted biotech" },
              { name: "James Kim", type: "HNWI", nat: "Unknown", score: 91, signal: "Multiple high-value real estate transactions in Miami" },
              { name: "Elena Rostova", type: "UHNWI", nat: "British", score: 88, signal: "New directorship in Luxembourg holding company" },
            ].map((lead, i) => (
              <div key={i} className="p-5 hover:bg-[#0F172A]/80 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-bold text-slate-100 group-hover:text-[#10B981] transition-colors truncate text-[15px]">
                      {lead.name}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                      {lead.type} <span className="opacity-50">·</span> {lead.nat}
                    </div>
                  </div>
                  <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] px-2 py-1 rounded flex items-center justify-center font-mono font-bold text-sm min-w-[36px]">
                    {lead.score}
                  </div>
                </div>

                <div className="bg-[#050A14] rounded-md p-3 text-xs font-mono border border-slate-800/80 mb-4 text-slate-300 leading-relaxed shadow-inner">
                  <span className="text-[#10B981] mr-2 font-bold">SIG_TX:</span>
                  {lead.signal}
                </div>

                <div className="flex items-center justify-between">
                  <button className="text-[11px] font-mono text-slate-500 flex items-center hover:text-white transition-colors uppercase tracking-wider">
                    Profile <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </button>
                  <button className="text-[11px] font-mono text-[#10B981] flex items-center hover:text-white transition-colors uppercase tracking-wider">
                    Network <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Ingestion Engine Panel */}
          <div className="border-t border-slate-800 bg-[#070D1A] px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500">
                  Western HNWI Engine
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">IDLE</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#050A14] border border-slate-800 rounded-md px-3 py-1.5 flex-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">TARGET</span>
                <select className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none w-full appearance-none cursor-pointer">
                  <option>5,000</option>
                  <option>10,000</option>
                  <option>25,000</option>
                </select>
              </div>

              <button className="flex items-center gap-2 px-6 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider bg-[#10B981] text-[#070D1A] hover:bg-[#10B981]/90 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
                <Play className="w-3.5 h-3.5 fill-current" />
                Ingest
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
