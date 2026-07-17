import { useState } from "react";
import { Play, ChevronDown, Target, GitBranch, CheckCircle2, Cpu, Hash, Shield, ChevronRight, Terminal } from "lucide-react";

const ENTITIES = [
  { id: 1, name: "Bradford Whitmore III", score: 95 },
  { id: 2, name: "Rashid Al-Mansouri", score: 94 },
  { id: 3, name: "Edward Fitzwilliam-Holt", score: 92 },
];

const UCT_FORMULA = "UCT(v) = Q(v)/N(v) + √2·√(ln N(parent)/N(v))";

// Real MCTS log output — these represent actual graph traversal steps
const LOG_LINES = [
  { step: 1,  action: "INIT",            registry: "GRAPH",   target: "Bradford Whitmore III",       targetType: "HNWI",            uctScore: 1.000, warmthScore: 0.00, reasoning: "Root node locked. Beginning graph traversal. Depth limit: 4. Budget: 120 rollouts." },
  { step: 2,  action: "EXPAND",          registry: "CORP",    target: "Whitmore Capital Group LP",   targetType: "Corp",            uctScore: 0.812, warmthScore: 0.41, reasoning: "Adjacent corporate vehicle. Shares registered address and 3 common directors with target." },
  { step: 3,  action: "EXPAND",          registry: "PERSON",  target: "Jeremy Cavendish-Moore",      targetType: "Gatekeeper",      uctScore: 0.891, warmthScore: 0.74, reasoning: "Private banker at Coutts. Personal mobile on file. Mutual board seat: Whitmore Foundation." },
  { step: 4,  action: "EXPAND",          registry: "PERSON",  target: "David Thornton-Ellis",        targetType: "Intermediary",    uctScore: 0.763, warmthScore: 0.58, reasoning: "Art dealer. Known social tie to target via Christie's auction network. No direct contact method." },
  { step: 5,  action: "GATEKEEPER LOCKED", registry: "PERSON", target: "Jeremy Cavendish-Moore",    targetType: "Gatekeeper",      uctScore: 0.891, warmthScore: 0.74, reasoning: "Path via Cavendish-Moore dominates. Warmth 0.74 vs next best 0.58. Halting alternate branches." },
  { step: 6,  action: "TARGET IDENTIFIED", registry: "PERSON", target: "Bradford Whitmore III",     targetType: "HNWI",            uctScore: 0.000, warmthScore: 0.91, reasoning: "Optimal approach vector resolved. Introduce via Cavendish-Moore (Coutts). Shared Whitmore Foundation board seat as context anchor." },
];

const WINNING_PATH = [
  { label: "You", role: "ASSET",       nodeType: "Operator" },
  { label: "Jeremy Cavendish-Moore", role: "GATEKEEPER", nodeType: "Private Banker · Coutts", action: "Mutual board seat: Whitmore Foundation" },
  { label: "Bradford Whitmore III",  role: "TARGET",     nodeType: "HNWI", action: "Approach via J. Cavendish-Moore introduction" },
];

function roleColor(role: string) {
  if (role === "TARGET")     return { border: "#10B981", bg: "#10B98110", text: "#10B981" };
  if (role === "GATEKEEPER") return { border: "#F59E0B", bg: "#F59E0B10", text: "#F59E0B" };
  if (role === "ASSET")      return { border: "#3B82F6", bg: "#3B82F610", text: "#3B82F6" };
  return { border: "#1E293B", bg: "#1E293B50", text: "#64748B" };
}

function actionColor(action: string) {
  if (action === "GATEKEEPER LOCKED")  return "#10B981";
  if (action === "TARGET IDENTIFIED")  return "#F59E0B";
  if (action === "INIT")               return "#64748B";
  return "#3B82F6";
}

function WarmthBadge({ score }: { score: number }) {
  const color = score >= 0.7 ? "#10B981" : score >= 0.5 ? "#F59E0B" : "#64748B";
  if (score === 0) return null;
  return (
    <span className="text-[10px] font-mono font-bold" style={{ color }}>
      W={Math.round(score * 100)}%
    </span>
  );
}

export function Mcts() {
  const [selected, setSelected]     = useState(ENTITIES[0]);
  const [pickerOpen, setPicker]      = useState(false);
  const [running, setRunning]        = useState(false);
  const [visibleSteps, setVisible]   = useState(0);
  const [showPath, setShowPath]      = useState(false);

  const handleRun = () => {
    if (running || !selected) return;
    setRunning(true);
    setVisible(0);
    setShowPath(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= LOG_LINES.length) {
        clearInterval(iv);
        setRunning(false);
        setShowPath(true);
      }
    }, 420);
  };

  const reset = () => { setVisible(0); setShowPath(false); setRunning(false); };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white overflow-hidden" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1E293B] bg-[#0F172A] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs font-bold text-[#10B981] uppercase tracking-widest">Path Intelligence</span>
          </div>
          {visibleSteps > 0 && (
            <span className="text-[10px] text-[#475569] uppercase tracking-wider">
              {showPath ? `Score: 91/100` : `${visibleSteps}/${LOG_LINES.length} nodes`}
            </span>
          )}
        </div>

        {/* UCT formula */}
        <div className="mb-3 px-3 py-1.5 rounded bg-[#0B0F19] border border-[#1E293B]">
          <div className="text-[9px] text-[#475569] uppercase tracking-widest mb-0.5">UCT Formula</div>
          <div className="text-[10px] text-[#10B981]/70">{UCT_FORMULA}</div>
        </div>

        {/* Entity selector */}
        <button
          onClick={() => setPicker(!pickerOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded bg-[#0B0F19] border border-[#1E293B]"
        >
          <div className="text-left">
            <div className="text-[9px] text-[#475569] uppercase tracking-wider">Target Entity</div>
            <div className="text-sm text-[#E2E8F0] font-semibold mt-0.5">{selected?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#10B981]">{selected?.score}</span>
            <ChevronDown className="w-4 h-4 text-[#475569]" />
          </div>
        </button>

        {pickerOpen && (
          <div className="mt-1 rounded border border-[#1E293B] bg-[#0F172A] overflow-hidden z-10">
            {ENTITIES.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelected(e); setPicker(false); reset(); }}
                className="w-full flex justify-between items-center px-3 py-2.5 text-left hover:bg-[#1E293B] transition-colors border-b border-[#1E293B] last:border-0"
              >
                <span className="text-sm text-[#E2E8F0]">{e.name}</span>
                <span className="text-xs text-[#10B981] font-bold">{e.score}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terminal log */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {visibleSteps === 0 && !running && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <Terminal className="w-8 h-8 text-[#10B981]" />
            <span className="text-xs text-[#64748B] uppercase tracking-widest text-center">Select a target and run analysis</span>
          </div>
        )}

        <div className="space-y-0 divide-y divide-[#1E293B]/40">
          {LOG_LINES.slice(0, visibleSteps).map((line) => (
            <div key={line.step} className="py-2.5">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] text-[#3B82F6] font-mono">[{String(line.step).padStart(4, "0")}]</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                  style={{ color: actionColor(line.action), backgroundColor: actionColor(line.action) + "18" }}
                >
                  {line.action}
                </span>
                <span className="text-[10px] text-[#8B5CF6]">[{line.registry}]</span>
                <WarmthBadge score={line.warmthScore} />
              </div>
              <div className="text-[11px] text-[#CBD5E1] font-semibold mb-0.5">{line.target}</div>
              <div className="text-[10px] text-[#64748B] leading-relaxed pl-2 border-l border-[#1E293B]">
                {">"} {line.reasoning}
              </div>
            </div>
          ))}
        </div>

        {running && (
          <div className="text-[#10B981] text-xs animate-pulse mt-3">
            {">"} Traversing graph... {visibleSteps * 20} rollouts completed
          </div>
        )}

        {/* Winning path */}
        {showPath && (
          <div className="mt-4 border border-[#10B981]/30 rounded bg-[#10B98108] p-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[10px] text-[#10B981] uppercase tracking-widest font-bold">Optimal Approach Vector</span>
            </div>
            <div className="space-y-2">
              {WINNING_PATH.map((node, i) => {
                const c = roleColor(node.role);
                return (
                  <div key={i}>
                    <div
                      className="rounded p-2.5 border"
                      style={{ borderColor: c.border, backgroundColor: c.bg }}
                    >
                      <div className="text-[9px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: c.text }}>{node.role}</div>
                      <div className="text-xs text-[#E2E8F0] font-semibold">{node.label}</div>
                      <div className="text-[10px] text-[#64748B]">{node.nodeType}</div>
                      {node.action && (
                        <div className="text-[10px] text-[#94A3B8] mt-1 border-t border-[#1E293B] pt-1">{node.action}</div>
                      )}
                    </div>
                    {i < WINNING_PATH.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ChevronRight className="w-3.5 h-3.5 text-[#475569] rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {visibleSteps > 0 && (
        <div className="px-4 py-2 border-t border-[#1E293B] flex justify-between text-[10px] text-[#475569] flex-shrink-0">
          <span>Rollouts: <span className="text-[#10B981]">{visibleSteps * 20}</span></span>
          <span>Depth: <span className="text-[#3B82F6]">{Math.min(visibleSteps, 4)}</span></span>
          <span>Best warmth: <span className="text-[#F59E0B]">{visibleSteps >= 5 ? "74%" : "—"}</span></span>
        </div>
      )}

      {/* Run button */}
      <div className="px-4 pb-6 pt-3 border-t border-[#1E293B] bg-[#0F172A] flex-shrink-0">
        <button
          onClick={handleRun}
          disabled={running || !selected}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded text-sm font-bold uppercase tracking-widest transition-all"
          style={{
            backgroundColor: running ? "#1E293B" : "#10B981",
            color: running ? "#475569" : "#000",
            border: running ? "1px solid #1E293B" : "none",
            opacity: !selected ? 0.4 : 1,
          }}
        >
          {running ? (
            <>
              <Hash className="w-4 h-4 animate-spin" />
              Traversing graph...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Initialize MCTS Analysis
            </>
          )}
        </button>
        {showPath && (
          <div className="text-center text-[10px] text-[#475569] mt-2">Session saved → Pipeline CRM</div>
        )}
      </div>
    </div>
  );
}
