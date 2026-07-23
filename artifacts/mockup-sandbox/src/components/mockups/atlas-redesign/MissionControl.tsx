import React from 'react';
import { Filter, ZoomIn, Target } from 'lucide-react';

export default function MissionControl() {
  return (
    <div className="flex flex-col w-full h-[100vh] bg-[#080C16] text-[#E8EDF5] overflow-hidden font-sans select-none">
      {/* Compliance Banner */}
      <div className="bg-[#1A1208] text-amber-500 border-b border-amber-900/30 text-xs font-mono py-1.5 px-4 text-center flex-shrink-0 tracking-wide">
        COMPLIANCE: Public-data research only.
      </div>
      
      {/* Map Area */}
      <div className="relative flex-1 w-full bg-[#0B0F19] overflow-hidden">
        
        {/* Map Grid/Texture overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1A2035_1px,transparent_1px),linear-gradient(to_bottom,#1A2035_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none"></div>

        {/* United States label */}
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#E8EDF5] text-[10rem] font-black uppercase tracking-[1em] pointer-events-none opacity-[0.02]">
          United States
        </div>

        {/* 20 Purple Dots */}
        {[
          { top: '35%', left: '25%' }, { top: '30%', left: '30%' },
          { top: '40%', left: '28%' }, { top: '38%', left: '22%' },
          { top: '50%', left: '15%' }, { top: '55%', left: '18%' },
          { top: '65%', left: '20%' }, { top: '45%', left: '40%' },
          { top: '48%', left: '45%' }, { top: '52%', left: '50%' },
          { top: '60%', left: '42%' }, { top: '32%', left: '60%' },
          { top: '35%', left: '70%' }, { top: '28%', left: '75%' },
          { top: '45%', left: '72%' }, { top: '50%', left: '80%' },
          { top: '55%', left: '75%' }, { top: '65%', left: '70%' },
          { top: '70%', left: '65%' }, { top: '75%', left: '55%' },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,1)] border border-purple-200 transition-transform hover:scale-150 cursor-crosshair z-10"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-40"></div>
          </div>
        ))}

        {/* Top Edge: Stats Bar & Actions */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-20">
          {/* Stats Bar */}
          <div className="flex gap-8 bg-black/40 backdrop-blur-xl border border-[#1A2035] rounded-xl px-6 py-4 pointer-events-auto shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[#00E5A0] font-mono text-2xl font-medium tracking-tight">32,601</span>
              <span className="text-[#64748B] font-mono text-[10px] uppercase tracking-widest mt-0.5">Profiles</span>
            </div>
            <div className="w-px bg-[#1A2035] self-stretch opacity-50"></div>
            <div className="flex flex-col">
              <span className="text-[#00E5A0] font-mono text-2xl font-medium tracking-tight">14,774</span>
              <span className="text-[#64748B] font-mono text-[10px] uppercase tracking-widest mt-0.5">Hot Leads</span>
            </div>
            <div className="w-px bg-[#1A2035] self-stretch opacity-50"></div>
            <div className="flex flex-col">
              <span className="text-[#00E5A0] font-mono text-2xl font-medium tracking-tight">61</span>
              <span className="text-[#64748B] font-mono text-[10px] uppercase tracking-widest mt-0.5">Contactable</span>
            </div>
            <div className="w-px bg-[#1A2035] self-stretch opacity-50"></div>
            <div className="flex flex-col">
              <span className="text-[#00E5A0] font-mono text-2xl font-medium tracking-tight">600</span>
              <span className="text-[#64748B] font-mono text-[10px] uppercase tracking-widest mt-0.5">HNWI</span>
            </div>
          </div>

          {/* Top-Right: Actions */}
          <div className="flex gap-3 pointer-events-auto">
            <button className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-[#1A2035] hover:border-[#00E5A0]/50 hover:bg-[#111827] transition-all rounded-xl px-4 py-2.5 text-xs font-mono text-[#E8EDF5] shadow-lg group">
              <Filter size={14} className="text-[#00E5A0] group-hover:scale-110 transition-transform" />
              FILTER
            </button>
            <button className="flex items-center justify-center bg-black/40 backdrop-blur-xl border border-[#1A2035] hover:border-[#00E5A0]/50 hover:bg-[#111827] transition-all rounded-xl w-10 h-10 text-[#E8EDF5] shadow-lg group">
              <ZoomIn size={16} className="text-[#00E5A0] group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Bottom-Left: Legend Strip & Jobs */}
        <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col gap-4 z-20">
          <div className="flex items-center gap-5 bg-black/60 backdrop-blur-xl border border-[#1A2035] rounded-full px-5 py-2.5 text-xs font-mono text-[#E8EDF5] shadow-2xl">
            <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-[#E8EDF5]"></div>
              <span>Real Estate 2,000</span>
            </div>
            <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Marine 0</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] border border-purple-200/50"></div>
              <span className="text-purple-300">Aviation 30,000</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 text-[10px] font-mono text-[#00E5A0] bg-black/40 backdrop-blur-md border border-[#00E5A0]/20 rounded px-3 py-1.5 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] animate-pulse"></div>
            2 JOBS RUNNING (INGESTION IN PROGRESS)
          </div>
        </div>

        {/* Bottom-Right: Top Targets */}
        <div className="absolute bottom-6 right-6 w-[280px] pointer-events-auto z-20">
          <div className="bg-black/80 backdrop-blur-xl border border-[#1A2035] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[#1A2035] flex justify-between items-center bg-gradient-to-r from-[#111827] to-transparent">
              <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-[#64748B] tracking-widest font-medium">
                <Target size={12} className="text-[#00E5A0]" />
                Top Targets
              </div>
            </div>
            
            <div className="flex flex-col p-1.5">
              {[
                { name: "Horan John J", tier: "HNWI", loc: "US", reach: 99, wealth: "$180M", signal: "Aviation: Turbofan N286JJ (2012)" },
                { name: "Aldrich Brock L", tier: "HNWI", loc: "US", reach: 99, wealth: "$120M", signal: "Aviation: Jet N1007B (2020)" },
                { name: "Dierolf Robert S", tier: "HNWI", loc: "US", reach: 99, wealth: "$120M", signal: "Aviation: Piston N5234F (2018)" }
              ].map((target, idx) => (
                <div key={idx} className="group p-2.5 rounded-lg border border-transparent hover:border-[#00E5A0]/30 hover:bg-[#111827] cursor-pointer transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-semibold text-[13px] text-[#E8EDF5] group-hover:text-[#00E5A0] transition-colors truncate mr-2">{target.name}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-[#64748B]">{target.wealth}</span>
                      <span className="bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20 text-[9px] font-mono px-1 py-0.5 rounded flex items-center h-4">
                        R{target.reach}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#64748B] truncate">
                    <span className="text-purple-400 shrink-0">{target.tier}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[#64748B] shrink-0"></span>
                    <span className="shrink-0">{target.loc}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[#64748B] shrink-0"></span>
                    <span className="truncate" title={target.signal}>{target.signal}</span>
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
