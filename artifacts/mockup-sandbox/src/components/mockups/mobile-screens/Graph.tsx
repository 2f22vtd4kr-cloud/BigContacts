import { useState } from "react";
import { Search, X, ChevronDown, ZoomIn, ZoomOut, Maximize2, Shield } from "lucide-react";

const ENTITIES = [
  { id: 1, name: "Bradford Whitmore III", type: "HNWI", score: 95 },
  { id: 2, name: "Rashid Al-Mansouri", type: "HNWI", score: 94 },
  { id: 3, name: "Edward Fitzwilliam-Holt", type: "HNWI", score: 92 },
  { id: 4, name: "Carlos Ibáñez Varela", type: "HNWI", score: 91 },
];

const SELECTED_NODE = {
  name: "Signor Pietro Fontana",
  type: "Gatekeeper",
  role: "Geometra & Property Manager",
  contact: "+39 055 218 4421 (personal)",
  via: "WhatsApp confirmed",
  registry: "Catasto Fiorentino",
  score: 87,
  action: "Approach via Castellani estate connection — book a site visit",
};

const NODE_LEGEND = [
  { color: "#10B981", label: "HNWI Target" },
  { color: "#F59E0B", label: "Gatekeeper" },
  { color: "#3B82F6", label: "Corporation" },
  { color: "#A855F7", label: "Trust / SPV" },
  { color: "#64748B", label: "Asset" },
];

export function Graph() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selected, setSelected] = useState(ENTITIES[0]);
  const [nodePanel, setNodePanel] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white font-sans overflow-hidden">

      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1E293B] bg-[#0F172A]">
        <button
          onClick={() => setSelectorOpen(!selectorOpen)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded bg-[#0B0F19] border border-[#1E293B] text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-[#64748B] font-mono uppercase tracking-wider">Target</div>
            <div className="text-sm text-[#E2E8F0] font-semibold truncate">{selected.name}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#475569] flex-shrink-0 ml-2" />
        </button>

        {/* Zoom controls */}
        <div className="flex flex-col gap-1">
          <button className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center">
            <ZoomIn className="w-4 h-4 text-[#64748B]" />
          </button>
          <button className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center">
            <ZoomOut className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
        <button className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center self-start">
          <Maximize2 className="w-4 h-4 text-[#64748B]" />
        </button>
      </div>

      {/* Entity selector dropdown */}
      {selectorOpen && (
        <div className="absolute inset-x-0 top-[57px] z-50 bg-[#0F172A] border-b border-[#1E293B] shadow-xl">
          <div className="p-3">
            <div className="flex items-center gap-2 bg-[#0B0F19] border border-[#1E293B] rounded px-3 py-2 mb-3">
              <Search className="w-3.5 h-3.5 text-[#475569]" />
              <input className="flex-1 bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#475569]" placeholder="Search entities…" />
            </div>
            {ENTITIES.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelected(e); setSelectorOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded hover:bg-[#1E293B] transition-colors"
              >
                <div className="text-left">
                  <div className="text-sm text-[#E2E8F0] font-medium">{e.name}</div>
                  <div className="text-[11px] text-[#64748B] font-mono">{e.type}</div>
                </div>
                <span className="text-xs font-mono font-bold text-[#10B981]">{e.score}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Graph canvas area */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0F1A2E 0%, #070D18 100%)" }}>

        {/* Simulated graph nodes */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
          {/* Edge lines */}
          <line x1="50%" y1="42%" x2="25%" y2="28%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="50%" y1="42%" x2="75%" y2="28%" stroke="#10B981" strokeWidth="1" />
          <line x1="50%" y1="42%" x2="30%" y2="62%" stroke="#F59E0B" strokeWidth="1.5" />
          <line x1="50%" y1="42%" x2="70%" y2="60%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30%" y1="62%" x2="20%" y2="80%" stroke="#64748B" strokeWidth="1" />
          <line x1="30%" y1="62%" x2="42%" y2="78%" stroke="#64748B" strokeWidth="1" />
        </svg>

        {/* Target node */}
        <div className="absolute" style={{ left: "50%", top: "42%", transform: "translate(-50%,-50%)" }}>
          <div className="w-14 h-14 rounded-full border-2 border-[#10B981] bg-[#10B981]/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <span className="text-[#10B981] text-xs font-bold font-mono">HNWI</span>
          </div>
          <div className="text-center mt-1.5 text-[10px] text-[#E2E8F0] font-medium whitespace-nowrap max-w-[80px] truncate">{selected.name.split(" ")[0]}</div>
        </div>
        {/* Gatekeeper node (highlighted) */}
        <div className="absolute cursor-pointer" style={{ left: "30%", top: "62%", transform: "translate(-50%,-50%)" }} onClick={() => setNodePanel(true)}>
          <div className="w-11 h-11 rounded-full border-2 border-[#F59E0B] bg-[#F59E0B]/20 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.5)] ring-2 ring-[#F59E0B]/40 ring-offset-2 ring-offset-[#0B0F19]">
            <Shield className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-center mt-1 text-[10px] text-[#F59E0B] font-mono whitespace-nowrap">Fontana</div>
        </div>
        {/* Corp node */}
        <div className="absolute" style={{ left: "75%", top: "28%", transform: "translate(-50%,-50%)" }}>
          <div className="w-9 h-9 rounded-full border border-[#3B82F6] bg-[#3B82F6]/15 flex items-center justify-center">
            <span className="text-[#3B82F6] text-[9px] font-bold">CORP</span>
          </div>
        </div>
        {/* Asset nodes */}
        {[{ l: "20%", t: "80%", c: "#64748B" }, { l: "42%", t: "78%", c: "#64748B" }].map((n, i) => (
          <div key={i} className="absolute" style={{ left: n.l, top: n.t, transform: "translate(-50%,-50%)" }}>
            <div className="w-7 h-7 rounded-full border border-[#475569] bg-[#475569]/15 flex items-center justify-center">
              <span className="text-[#475569] text-[8px] font-bold">ASST</span>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-[#0F172A]/90 rounded px-2.5 py-2 border border-[#1E293B] space-y-1.5">
          {NODE_LEGEND.map((n) => (
            <div key={n.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
              <span className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">{n.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node detail bottom sheet */}
      {nodePanel && (
        <div className="bg-[#0F172A] border-t border-[#F59E0B]/30 shadow-2xl">
          <div className="flex items-start justify-between px-4 pt-3 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded border font-mono" style={{ color: "#F59E0B", borderColor: "#F59E0B44", backgroundColor: "#F59E0B15" }}>
                  GATEKEEPER
                </span>
                <span className="text-xs font-mono text-[#64748B]">{SELECTED_NODE.registry}</span>
              </div>
              <div className="text-base font-bold text-[#E2E8F0] mt-1">{SELECTED_NODE.name}</div>
              <div className="text-xs text-[#64748B] mt-0.5">{SELECTED_NODE.role}</div>
            </div>
            <button onClick={() => setNodePanel(false)} className="text-[#475569] hover:text-[#94A3B8] mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-2 mt-2">
            <div className="bg-[#0B0F19] rounded px-3 py-2 border border-[#F59E0B]/20">
              <div className="text-[10px] font-mono text-[#64748B] uppercase mb-1">Personal Contact</div>
              <div className="text-sm text-[#F59E0B] font-mono">{SELECTED_NODE.contact}</div>
              <div className="text-[10px] text-[#10B981] mt-0.5">{SELECTED_NODE.via}</div>
            </div>
            <div className="bg-[#0B0F19] rounded px-3 py-2 border border-[#1E293B]">
              <div className="text-[10px] font-mono text-[#64748B] uppercase mb-1">Recommended Action</div>
              <div className="text-xs text-[#E2E8F0]">{SELECTED_NODE.action}</div>
            </div>
            <button className="w-full py-2.5 rounded border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-xs font-mono font-bold text-[#3B82F6] uppercase tracking-wider">
              Set as MCTS Target
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
