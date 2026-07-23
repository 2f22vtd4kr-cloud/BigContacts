import React from 'react';
import { Shield, ChevronRight, Activity, Users, Target, Phone, Eye, Play } from 'lucide-react';

export default function CommandStrip() {
  return (
    <div className="flex flex-col h-screen bg-[#080C16] text-[#E8EDF5] font-sans overflow-hidden">
      {/* Compliance Banner */}
      <div className="shrink-0 bg-amber-500/10 text-amber-500 text-[10px] font-mono py-1.5 px-4 text-center border-b border-amber-500/20 flex items-center justify-center gap-2 uppercase tracking-widest">
        <Shield size={12} />
        COMPLIANCE: Public-data research only.
      </div>
      
      <div className="flex-1 flex flex-col p-8 gap-6 h-full overflow-hidden">
        
        {/* ROW 1: 4 STAT TILES */}
        <div className="grid grid-cols-4 gap-4 h-36 shrink-0">
          <div className="bg-[#0D1117] border border-[#1A2035] hover:border-[#00E5A0] hover:bg-[#111827] transition-colors p-5 flex flex-col justify-between cursor-pointer group rounded-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">Total Profiles</span>
              <Users size={16} className="text-[#64748B] group-hover:text-[#00E5A0] transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold font-mono text-[#E8EDF5]">32,601</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono mt-auto pt-2 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
              click to browse <ChevronRight size={10} />
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1A2035] hover:border-[#00E5A0] hover:bg-[#111827] transition-colors p-5 flex flex-col justify-between cursor-pointer group rounded-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">Hot Leads</span>
              <Target size={16} className="text-[#64748B] group-hover:text-amber-500 transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold font-mono text-[#E8EDF5]">14,774</span>
              <span className="font-mono text-sm text-amber-500">↑</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono mt-auto pt-2 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
              click to browse <ChevronRight size={10} />
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1A2035] hover:border-[#00E5A0] hover:bg-[#111827] transition-colors p-5 flex flex-col justify-between cursor-pointer group rounded-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">Contactable</span>
              <Phone size={16} className="text-[#64748B] group-hover:text-[#00E5A0] transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold font-mono text-[#E8EDF5]">61</span>
              <span className="font-mono text-sm text-[#00E5A0]">↑</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono mt-auto pt-2 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
              click to browse <ChevronRight size={10} />
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1A2035] hover:border-[#00E5A0] hover:bg-[#111827] transition-colors p-5 flex flex-col justify-between cursor-pointer group rounded-sm">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-[#64748B]">HNWI</span>
              <Activity size={16} className="text-[#64748B] group-hover:text-[#00E5A0] transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-bold font-mono text-[#E8EDF5]">600</span>
              <span className="font-mono text-sm text-[#00E5A0]">↑</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono mt-auto pt-2 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
              click to browse <ChevronRight size={10} />
            </div>
          </div>
        </div>

        {/* ROW 2: TODAY'S TARGETS */}
        <div className="flex items-center gap-4 shrink-0 mt-2">
          <h2 className="text-xl font-bold tracking-tight text-[#E8EDF5]">TODAY'S TARGETS</h2>
          <span className="bg-[#00E5A0]/10 text-[#00E5A0] px-3 py-1 text-xs font-mono rounded-full border border-[#00E5A0]/20">
            14,774 active
          </span>
        </div>

        {/* ROW 3: 3 LEAD CARDS */}
        <div className="flex gap-4 flex-1 min-h-0">
          {[
            {
              name: "Horan John J",
              type: "HNWI",
              country: "US",
              reach: "99",
              netWorth: "$180.0M",
              signal: "Aviation: Turbofan N286JJ (2012)"
            },
            {
              name: "Aldrich Brock L",
              type: "HNWI",
              country: "US",
              reach: "99",
              netWorth: "$120.0M",
              signal: "Aviation: Jet N1007B (2020)"
            },
            {
              name: "Dierolf Robert S",
              type: "HNWI",
              country: "US",
              reach: "99",
              netWorth: "$120.0M",
              signal: "Aviation: Piston N5234F (2018)"
            }
          ].map((lead, i) => (
            <div key={i} className="flex-1 bg-[#0D1117] border border-[#1A2035] hover:border-[#00E5A0] transition-colors p-6 flex flex-col rounded-sm">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[22px] font-bold text-[#E8EDF5] leading-none">{lead.name}</h3>
                <div className="text-[#00E5A0] font-mono text-lg font-bold">{lead.netWorth}</div>
              </div>
              
              <div className="flex gap-2 mb-8">
                <span className="bg-[#1A2035] text-[#E8EDF5] text-xs font-mono px-2.5 py-1 rounded-sm uppercase tracking-wide">{lead.type} · {lead.country}</span>
                <span className="bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20 text-xs font-mono px-2.5 py-1 rounded-sm uppercase tracking-wide">REACH {lead.reach}</span>
              </div>

              <div className="bg-[#111827] border border-[#1A2035] p-4 rounded-sm mb-auto">
                <div className="text-xs font-mono text-[#00E5A0] mb-2 uppercase tracking-wider font-bold">Signal:</div>
                <div className="font-mono text-sm text-[#E8EDF5] leading-relaxed">
                  {lead.signal}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="flex-1 border border-[#1A2035] hover:border-[#E8EDF5] text-xs font-bold py-3.5 transition-colors rounded-sm flex items-center justify-center gap-2 uppercase tracking-wide">
                  <Eye size={14} /> VIEW PROFILE
                </button>
                <button className="flex-1 bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-[#080C16] text-xs font-bold py-3.5 transition-colors rounded-sm flex items-center justify-center gap-2 uppercase tracking-wide">
                  <Play size={14} fill="currentColor" /> RUN INTEL
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ROW 4: BOTTOM STRIP */}
        <div className="h-16 shrink-0 flex items-center justify-between border-t border-[#1A2035] pt-4 mt-2">
          {/* LEFT: Wealth Tier Bar */}
          <div className="flex-1 max-w-xl flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-[#64748B]">
              <span className="text-[#9D4EDD]">ULTRA 7,392</span>
              <span className="text-[#3B82F6]">VERY 4,614</span>
              <span className="text-[#00E5A0]">HNW 24,568</span>
              <span className="text-[#64748B]">UNK 27</span>
            </div>
            <div className="h-1.5 w-full flex rounded-full overflow-hidden">
              <div className="bg-[#9D4EDD]" style={{ width: '20%' }}></div>
              <div className="bg-[#3B82F6]" style={{ width: '13%' }}></div>
              <div className="bg-[#00E5A0]" style={{ width: '66%' }}></div>
              <div className="bg-[#1A2035]" style={{ width: '1%' }}></div>
            </div>
          </div>

          {/* RIGHT: Quick Launch & Status */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00E5A0]">
              <div className="w-2 h-2 rounded-full bg-[#00E5A0] animate-pulse"></div>
              2 jobs running
            </div>
            <div className="flex gap-3">
              <button className="bg-[#1A2035] hover:bg-[#1A2035]/80 text-[#E8EDF5] text-xs font-bold px-5 py-2.5 rounded-sm transition-colors font-mono tracking-wide">
                ⚙ DATA SOURCES
              </button>
              <button className="border border-[#00E5A0] text-[#00E5A0] hover:bg-[#00E5A0]/10 text-xs font-bold px-5 py-2.5 rounded-sm transition-colors font-mono tracking-wide">
                + LIVE INTEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
