import { useState } from "react";
import { ChevronDown, ChevronRight, Zap, Clock } from "lucide-react";

const SESSIONS = [
  { id: 1, name: "Bradford Whitmore III", stage: "MCTS Path Selected", score: 95, via: "Jeremy Cavendish-Moore · Coutts PB", nat: "American", updated: "2h ago", hot: true },
  { id: 2, name: "Rashid Al-Mansouri", stage: "Graph Mapped", score: 94, via: "Yasser Khalil · ADIB Private", nat: "Emirati", updated: "5h ago", hot: true },
  { id: 3, name: "Edward Fitzwilliam-Holt", stage: "Pitch Generated", score: 92, via: "Charles Thornton · Boodle's member", nat: "British", updated: "1d ago", hot: false },
  { id: 4, name: "Carlos Ibáñez Varela", stage: "Contacted", score: 91, via: "Marina Portals manager · direct", nat: "Spanish", updated: "2d ago", hot: false },
  { id: 5, name: "Patrick Beaumont", stage: "Identified", score: 83, via: "—", nat: "French", updated: "3d ago", hot: false },
  { id: 6, name: "Charlotte Pemberton-Smythe", stage: "Lead Gen", score: 79, via: "—", nat: "British", updated: "4d ago", hot: false },
];

const STAGES = [
  "Lead Gen", "Identified", "Graph Mapped", "MCTS Path Selected",
  "Pitch Generated", "Contacted", "Follow-Up", "Closed",
];

const STAGE_COLORS: Record<string, string> = {
  "Lead Gen": "#475569",
  "Identified": "#64748B",
  "Graph Mapped": "#3B82F6",
  "MCTS Path Selected": "#A855F7",
  "Pitch Generated": "#F59E0B",
  "Contacted": "#10B981",
  "Follow-Up": "#F97316",
  "Closed": "#10B981",
};

function ScorePill({ score }: { score: number }) {
  const color = score >= 90 ? "#10B981" : score >= 80 ? "#F59E0B" : "#EF4444";
  return (
    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{ color, backgroundColor: color + "18" }}>
      {score}
    </span>
  );
}

function SessionCard({ s, selected, onSelect }: { s: typeof SESSIONS[0]; selected: boolean; onSelect: () => void }) {
  const stageColor = STAGE_COLORS[s.stage] ?? "#64748B";
  return (
    <div>
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
        style={{ backgroundColor: selected ? "#0F172A" : "transparent" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {s.hot && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse flex-shrink-0" />}
            <span className="font-semibold text-sm text-[#E2E8F0] truncate">{s.name}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: stageColor, backgroundColor: stageColor + "18" }}>
            {s.stage.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <ScorePill score={s.score} />
          <span className="text-[10px] text-[#475569] flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{s.updated}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-[#475569] flex-shrink-0 transition-transform" style={{ transform: selected ? "rotate(180deg)" : undefined }} />
      </button>

      {selected && (
        <div className="mx-4 mb-3 rounded border border-[#1E293B] bg-[#0B0F19] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] font-mono uppercase mb-1">Warm Path</div>
            <div className="text-xs text-[#E2E8F0]">{s.via || "No path yet — run MCTS"}</div>
          </div>

          {/* Stage progress */}
          <div className="px-3 py-2.5 border-b border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] font-mono uppercase mb-2">Pipeline Progress</div>
            <div className="flex gap-1 flex-wrap">
              {STAGES.map((stage) => {
                const idx = STAGES.indexOf(stage);
                const cur = STAGES.indexOf(s.stage);
                const isPast = idx < cur;
                const isCurrent = idx === cur;
                const c = isCurrent ? stageColor : isPast ? "#334155" : "#1E293B";
                return (
                  <span
                    key={stage}
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{ color: isCurrent ? stageColor : isPast ? "#64748B" : "#334155", backgroundColor: c + (isCurrent ? "22" : "33"), border: `1px solid ${c}44` }}
                  >
                    {stage.toUpperCase().replace(" ", "\u00A0")}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="px-3 py-2.5 flex gap-2">
            <button className="flex-1 py-2 rounded text-[11px] font-mono font-bold text-[#10B981] border border-[#10B981]/30 bg-[#10B981]/08">
              VIEW GRAPH
            </button>
            <button className="flex-1 py-2 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-[#F59E0B]/30 bg-[#F59E0B]/08 text-[#F59E0B]">
              <Zap className="w-3 h-3" /> GEN PITCH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Crm() {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const filtered = stageFilter ? SESSIONS.filter((s) => s.stage === stageFilter) : SESSIONS;

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white font-sans overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E293B] bg-[#0F172A]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#94A3B8] uppercase tracking-widest">Pipeline CRM</span>
          <span className="text-[10px] font-mono text-[#475569]">{SESSIONS.length} sessions</span>
        </div>
      </div>

      {/* Stage filter chips */}
      <div className="px-4 py-2.5 border-b border-[#1E293B] overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setStageFilter(null)}
            className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide transition-all"
            style={{ backgroundColor: stageFilter === null ? "#10B981" : "#1E293B", color: stageFilter === null ? "#000" : "#64748B" }}
          >
            ALL
          </button>
          {STAGES.filter((s) => SESSIONS.some((ses) => ses.stage === s)).map((stage) => {
            const c = STAGE_COLORS[stage] ?? "#64748B";
            return (
              <button
                key={stage}
                onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
                className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide whitespace-nowrap transition-all"
                style={{
                  backgroundColor: stageFilter === stage ? c : c + "18",
                  color: stageFilter === stage ? "#000" : c,
                  border: `1px solid ${c}44`,
                }}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
        {filtered.map((s) => (
          <SessionCard
            key={s.id}
            s={s}
            selected={selectedId === s.id}
            onSelect={() => setSelectedId(selectedId === s.id ? null : s.id)}
          />
        ))}
      </div>
    </div>
  );
}
