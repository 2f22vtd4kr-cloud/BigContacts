import { useState } from "react";
import { Search, Plus, ShieldAlert, Filter, ChevronRight, X } from "lucide-react";

const ENTITIES = [
  { id: 1, name: "Bradford Whitmore III", type: "HNWI", nat: "American", nw: "$2.1B", score: 95, hot: true, registries: "Forbes 400, SEC EDGAR", contact: "+1 212 555 0182 (Personal)" },
  { id: 2, name: "Rashid Al-Mansouri", type: "HNWI", nat: "Emirati", nw: "$1.2B", score: 94, hot: true, registries: "IMO, Forbes", contact: "Via Yasser Khalil (ADIB)" },
  { id: 3, name: "Edward Fitzwilliam-Holt", type: "HNWI", nat: "British", nw: "$560M", score: 92, hot: false, registries: "Companies House, HMLR", contact: "Via Boodle's reservation line" },
  { id: 4, name: "Carlos Ibáñez Varela", type: "HNWI", nat: "Spanish", nw: "$890M", score: 91, hot: true, registries: "Registro Mercantil, IMO", contact: "+34 971 555 0241 (Marina office)" },
  { id: 5, name: "Patrick Beaumont", type: "HNWI", nat: "French", nw: "$340M", score: 83, hot: false, registries: "OpenCorporates, Notaire", contact: "Via Château manager" },
  { id: 6, name: "Charlotte Pemberton-Smythe", type: "HNWI", nat: "British", nw: "$210M", score: 79, hot: false, registries: "Companies House", contact: "—" },
  { id: 7, name: "Whitmore Capital Group LP", type: "Corporation", nat: "American", nw: "$4.2B AUM", score: 72, hot: false, registries: "SEC EDGAR", contact: "—" },
  { id: 8, name: "Jeremy Cavendish-Moore", type: "Gatekeeper", nat: "British", nw: "—", score: 68, hot: false, registries: "FCA Register", contact: "+44 207 555 0917 (Coutts direct)" },
];

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

function ScorePill({ score }: { score: number }) {
  const color = score >= 90 ? "#10B981" : score >= 80 ? "#F59E0B" : score >= 60 ? "#3B82F6" : "#EF4444";
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded border" style={{ borderColor: color + "44", backgroundColor: color + "12" }}>
      <span className="text-base font-bold font-mono leading-none" style={{ color }}>{score}</span>
      <span className="text-[8px] font-mono uppercase tracking-wide mt-0.5" style={{ color: color + "AA" }}>score</span>
    </div>
  );
}

function EntityCard({ e, onSelect }: { e: typeof ENTITIES[0]; onSelect: () => void }) {
  const typeColor = TYPE_COLORS[e.type] ?? "#64748B";
  return (
    <button onClick={onSelect} className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-[#0F172A] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {e.hot && <ShieldAlert className="w-3 h-3 text-[#F59E0B] flex-shrink-0" />}
          <span className="font-semibold text-sm text-[#E2E8F0] truncate">{e.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: typeColor, backgroundColor: typeColor + "18" }}>
            {e.type.toUpperCase()}
          </span>
          <span className="text-[11px] text-[#64748B]">{e.nat}</span>
          {e.nw !== "—" && <span className="text-[11px] text-[#94A3B8]">{e.nw}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ScorePill score={e.score} />
        <ChevronRight className="w-4 h-4 text-[#475569]" />
      </div>
    </button>
  );
}

function EntityDetail({ e, onClose }: { e: typeof ENTITIES[0]; onClose: () => void }) {
  const typeColor = TYPE_COLORS[e.type] ?? "#64748B";
  return (
    <div className="absolute inset-0 bg-[#0B0F19] z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#0F172A]">
        <span className="text-xs font-mono text-[#64748B] uppercase tracking-widest">Entity Detail</span>
        <button onClick={onClose} className="text-[#475569] hover:text-[#94A3B8]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-4 py-4 border-b border-[#1E293B]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {e.hot && (
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[10px] font-mono font-bold text-[#F59E0B] uppercase">Hot Lead</span>
                </div>
              )}
              <h2 className="text-lg font-bold text-[#E2E8F0]">{e.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: typeColor, backgroundColor: typeColor + "18" }}>
                  {e.type.toUpperCase()}
                </span>
                <span className="text-xs text-[#64748B]">{e.nat}</span>
              </div>
            </div>
            <ScorePill score={e.score} />
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-[#1E293B]">
          {[
            { label: "Net Worth / AUM", value: e.nw },
            { label: "Source Registries", value: e.registries },
            { label: "Best Contact Vector", value: e.contact },
          ].map((f) => (
            <div key={f.label} className="px-4 py-3">
              <div className="text-[10px] font-mono text-[#475569] uppercase tracking-wider mb-1">{f.label}</div>
              <div className="text-sm text-[#E2E8F0]">{f.value || "—"}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 py-4 space-y-2">
          <button className="w-full py-3 rounded text-xs font-mono font-bold text-[#10B981] border border-[#10B981]/30 bg-[#10B981]/08 uppercase tracking-wider">
            View Network Graph
          </button>
          <button className="w-full py-3 rounded text-xs font-mono font-bold text-[#3B82F6] border border-[#3B82F6]/30 bg-[#3B82F6]/08 uppercase tracking-wider">
            Run MCTS Analysis
          </button>
          <button className="w-full py-3 rounded text-xs font-mono font-bold text-[#EF4444] border border-[#EF4444]/30 bg-[#EF4444]/08 uppercase tracking-wider">
            Purge Entity
          </button>
        </div>
      </div>
    </div>
  );
}

export function Entities() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof ENTITIES[0] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filtered = ENTITIES.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || e.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="relative flex flex-col h-screen bg-[#0B0F19] text-white font-sans overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1E293B] bg-[#0F172A]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-[#94A3B8] uppercase tracking-widest">Entity Ledger</span>
          <span className="text-[10px] font-mono text-[#475569]">{filtered.length} / {ENTITIES.length}</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-[#0B0F19] border border-[#1E293B]">
          <Search className="w-3.5 h-3.5 text-[#475569] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#E2E8F0] outline-none placeholder:text-[#475569]"
            placeholder="Search entities…"
          />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-[#475569]" /></button>}
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {[null, "HNWI", "Gatekeeper", "Corporation", "Trust"].map((t) => {
            const c = t ? TYPE_COLORS[t] ?? "#64748B" : "#10B981";
            return (
              <button
                key={t ?? "all"}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase whitespace-nowrap transition-all"
                style={{
                  backgroundColor: typeFilter === t ? c : c + "18",
                  color: typeFilter === t ? "#000" : c,
                  border: `1px solid ${c}44`,
                }}
              >
                {t ?? "ALL"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
        {filtered.map((e) => (
          <EntityCard key={e.id} e={e} onSelect={() => setSelected(e)} />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[#475569] text-xs font-mono">
            No entities match your search
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="absolute bottom-6 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: "#10B981", boxShadow: "0 0 20px rgba(16,185,129,0.4)" }}
      >
        <Plus className="w-5 h-5 text-black" />
      </button>

      {/* Entity detail overlay */}
      {selected && <EntityDetail e={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
