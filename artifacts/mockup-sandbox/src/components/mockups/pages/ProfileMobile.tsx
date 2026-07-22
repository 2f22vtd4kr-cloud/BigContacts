import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  ShieldAlert,
  UserCheck,
  Shield,
  FileText,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  ChevronRight,
  GitBranch,
  Building2,
  Plane,
  Home,
  Briefcase
} from "lucide-react";

export default function ProfileMobile() {
  const [activeTab, setActiveTab] = useState<"INTEL" | "ASSETS" | "NETWORK">("INTEL");

  return (
    <div className="w-[390px] h-[844px] bg-[#050A14] text-white font-mono flex flex-col overflow-hidden relative border border-[#1E293B]">
      
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 bg-[#0B1220]/95 backdrop-blur-md border-b border-[#1E293B] flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button className="text-[#94A3B8] hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#64748B] uppercase tracking-widest leading-none mb-1">
              Apex Profile
            </span>
            <span className="text-[13px] font-bold leading-none truncate w-[160px]">
              Carl C. Icahn
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#10B981]/10 border border-[#10B981]/30">
            <span className="text-[#10B981] text-[12px] font-bold">94</span>
          </div>
          <button className="bg-[#1E293B] text-white p-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> CRM
          </button>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <div className="bg-[#0B1220] p-5 border-b border-[#1E293B] flex-shrink-0 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: "radial-gradient(#10B981 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
             
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded bg-[#10B981]/10 text-[#10B981]">
                <UserCheck className="w-3 h-3" /> HNWI
              </span>
              <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded bg-[#1E293B] text-[#94A3B8]">
                American
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-3 tracking-tight">Carl C. Icahn</h1>
            <div className="flex gap-2">
              <span className="px-2 py-1 text-[9px] border border-[#1E293B] bg-[#050A14] text-[#64748B] rounded">
                SEC EDGAR SC 13D
              </span>
            </div>
          </div>
        </div>

        {/* 3 Key Stat Pills */}
        <div className="grid grid-cols-3 gap-2 mt-5 relative z-10">
          <div className="bg-[#050A14] border border-[#1E293B] rounded p-2 flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#64748B] uppercase tracking-widest mb-1">Signal</span>
            <span className="text-[#10B981] font-bold text-[14px]">94%</span>
          </div>
          <div className="bg-[#050A14] border border-[#1E293B] rounded p-2 flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#64748B] uppercase tracking-widest mb-1">Assets</span>
            <span className="text-white font-bold text-[14px]">1</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 flex flex-col items-center justify-center text-amber-500">
            <span className="text-[10px] uppercase tracking-widest mb-1 opacity-80">Status</span>
            <span className="font-bold text-[13px] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> HOT
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-[#1E293B] bg-[#0B1220] flex-shrink-0">
        {(["INTEL", "ASSETS", "NETWORK"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest text-center border-b-2 transition-colors ${
              activeTab === t
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-[#64748B]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto bg-[#050A14] pb-24">
        
        {activeTab === "INTEL" && (
          <div className="p-4 space-y-6">
            
            {/* Confidence Radar/Bars */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest">Intel Confidence</span>
                <span className="text-[10px] text-[#10B981] font-bold">82% OVERALL</span>
              </div>
              
              {[
                { label: "Identity", val: 90, col: "bg-[#10B981]" },
                { label: "Financial", val: 85, col: "bg-[#10B981]" },
                { label: "Network", val: 70, col: "bg-blue-500" },
                { label: "Registry", val: 100, col: "bg-[#10B981]" },
                { label: "Asset", val: 65, col: "bg-amber-500" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="w-16 text-[9px] text-[#64748B] uppercase">{c.label}</span>
                  <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                    <div className={`h-full ${c.col}`} style={{ width: `${c.val}%` }} />
                  </div>
                  <span className="w-8 text-right text-[9px] text-[#94A3B8]">{c.val}%</span>
                </div>
              ))}
            </div>

            {/* Direct Contact Vectors */}
            <div>
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3 block">Direct Contact Vectors</span>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 border border-[#1E293B] bg-[#0B1220] rounded-lg hover:border-[#10B981]/50 active:bg-[#1E293B]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-[#64748B] uppercase">Primary Email</span>
                      <span className="text-[13px] text-white">c.icahn@icahnent.com</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 border border-[#1E293B] bg-[#0B1220] rounded-lg hover:border-[#10B981]/50 active:bg-[#1E293B]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#10B981]/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-[#64748B] uppercase">Direct Line</span>
                      <span className="text-[13px] text-white">+1 (212) 702-4300</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </button>

                <button className="w-full flex items-center justify-between p-3 border border-[#1E293B] bg-[#0B1220] rounded-lg hover:border-[#10B981]/50 active:bg-[#1E293B]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#0A66C2]/10 flex items-center justify-center">
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-[#64748B] uppercase">LinkedIn</span>
                      <span className="text-[13px] text-white">carl-c-icahn</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </button>
              </div>
            </div>

            {/* MCTS Research Path */}
            <div>
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-3 block flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> MCTS Research Path
              </span>
              <div className="pl-2 border-l border-[#1E293B] ml-2 space-y-4">
                <div className="relative">
                  <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-[#10B981] ring-4 ring-[#050A14]" />
                  <div className="pl-4">
                    <div className="text-[10px] text-[#10B981] uppercase tracking-widest mb-1">Target Identified</div>
                    <div className="text-[12px] text-white">Carl C. Icahn (UBO)</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-[#050A14]" />
                  <div className="pl-4">
                    <div className="text-[10px] text-blue-500 uppercase tracking-widest mb-1">Corporate Link</div>
                    <div className="text-[12px] text-white">ICAHN ENTERPRISES L.P.</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-[#050A14]" />
                  <div className="pl-4">
                    <div className="text-[10px] text-amber-500 uppercase tracking-widest mb-1">Asset Discovered</div>
                    <div className="text-[12px] text-white">SEC EDGAR Holdings Match</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "ASSETS" && (
          <div className="p-4 space-y-4">
            <div className="border border-[#1E293B] bg-[#0B1220] rounded-lg p-3">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold">ICAHN ENTERPRISES L.P.</h4>
                    <span className="text-[10px] text-[#64748B] uppercase">StockHolding</span>
                  </div>
                </div>
                <span className="text-[9px] bg-[#1E293B] text-[#94A3B8] px-1.5 py-0.5 rounded">
                  SEC
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#1E293B]">
                <div>
                  <div className="text-[9px] text-[#64748B] uppercase">Value</div>
                  <div className="text-[11px] text-white">$14B+ (Est)</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#64748B] uppercase">Jurisdiction</div>
                  <div className="text-[11px] text-white flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> US
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
               <span className="text-[10px] text-[#64748B] uppercase tracking-widest border border-[#1E293B] rounded px-3 py-1">
                 End of Assets
               </span>
            </div>
          </div>
        )}

        {activeTab === "NETWORK" && (
          <div className="p-4 space-y-3">
            {[
              { name: "Brett Icahn", type: "Family", role: "Board Member", rel: "DIRECT_LINK" },
              { name: "Aris Kekedjian", type: "Executive", role: "CEO", rel: "GATEKEEPER" },
              { name: "Jesse Lynn", type: "Executive", role: "COO", rel: "GATEKEEPER" }
            ].map((conn, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-[#1E293B] bg-[#0B1220] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${conn.rel === 'GATEKEEPER' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#10B981]/10 text-[#10B981]'}`}>
                    {conn.rel === "GATEKEEPER" ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold">{conn.name}</h4>
                    <span className="text-[10px] text-[#64748B] uppercase">{conn.role}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${conn.rel === 'GATEKEEPER' ? 'border-amber-500/30 text-amber-500' : 'border-[#10B981]/30 text-[#10B981]'}`}>
                    {conn.rel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0B1220]/95 backdrop-blur-md border-t border-[#1E293B] flex gap-3 z-20">
        <button className="flex-1 bg-[#050A14] border border-[#10B981]/30 text-[#10B981] py-3 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-[#10B981]/10 transition-colors">
          Run Research
        </button>
        <button className="flex-1 bg-[#10B981] text-[#050A14] py-3 rounded text-[11px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Generate Pitch
        </button>
      </div>

    </div>
  );
}
