import { useState } from "react";
import { Play, ChevronDown, Target, GitBranch, CheckCircle2, Cpu, Hash } from "lucide-react";

const ENTITIES = [
  { id: 1, name: "Bradford Whitmore III", score: 95 },
  { id: 2, name: "Rashid Al-Mansouri", score: 94 },
  { id: 3, name: "Edward Fitzwilliam-Holt", score: 92 },
];

const LOG_LINES = [
  { step: 1, icon: "hash", color: "#10B981", label: "INIT", text: "MCTS search initialised. Root: Bradford Whitmore III. Budget: 200 iterations." },
  { step: 2, icon: "branch", color: "#3B82F6", label: "EXPAND", text: "Expanding node: Whitmore Capital Group LP (Corp). UCT score: 0.812" },
  { step: 3, icon: "branch", color: "#3B82F6", label: "EXPAND", text: "Expanding node: Jeremy Cavendish-Moore (Gatekeeper, Private Banker). UCT score: 0.891" },
  { step: 4, icon: "cpu", color: "#F59E0B", label: "SIMULATE", text: "Simulating path via J. Cavendish-Moore → Whitmore. Warmth model: 0.74 (personal mobile on file)." },
  { step: 5, icon: "branch", color: "#3B82F6", label: "EXPAND", text: "Exploring alternate: David Thornton-Ellis (Art Dealer). UCT score: 0.763" },
  { step: 6, icon: "cpu", color: "#F59E0B", label: "SIMULATE", text: "Simulating path via D. Thornton-Ellis. Warmth: 0.58 (known social tie, no direct contact)." },
  { step: 7, icon: "check", color: "#10B981", label: "BACKPROP", text: "Backpropagating results. Cavendish-Moore path dominates with warmth 0.74 vs 0.58." },
  { step: 8, icon: "check", color: "#10B981", label: "RESULT", text: "OPTIMAL PATH FOUND — Jeremy Cavendish-Moore (Coutts Private Banking). Score: 91/100. Approach: Introduction via shared board seat at Whitmore Foundation." },
];

function LogLine({ line, visible }: { line: typeof LOG_LINES[0]; visible: boolean }) {
  const Icon = line.icon === "hash" ? Hash : line.icon === "branch" ? GitBranch : line.icon === "cpu" ? Cpu : CheckCircle2;
  if (!visible) return null;
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <Icon className="w-3.5 h-3.5 mt-0.5" style={{ color: line.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ color: line.color, backgroundColor: line.color + "18" }}>
            {line.label}
          </span>
          <span className="text-[10px] text-[#475569] font-mono">step_{String(line.step).padStart(2, "0")}</span>
        </div>
        <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">{line.text}</p>
      </div>
    </div>
  );
}

export function Mcts() {
  const [selected, setSelected] = useState(ENTITIES[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setVisibleSteps(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= LOG_LINES.length) {
        clearInterval(interval);
        setRunning(false);
      }
    }, 400);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white font-mono overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1E293B] bg-[#0F172A]">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-[#10B981]" />
          <span className="text-xs font-bold text-[#10B981] uppercase tracking-widest">MCTS Terminal</span>
        </div>

        {/* Entity selector */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded bg-[#0B0F19] border border-[#1E293B]"
        >
          <div className="text-left">
            <div className="text-[10px] text-[#475569] uppercase tracking-wider">Target Entity</div>
            <div className="text-sm text-[#E2E8F0] font-semibold mt-0.5">{selected.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#10B981]">{selected.score}</span>
            <ChevronDown className="w-4 h-4 text-[#475569]" />
          </div>
        </button>

        {pickerOpen && (
          <div className="mt-1 rounded border border-[#1E293B] bg-[#0F172A] overflow-hidden">
            {ENTITIES.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelected(e); setPickerOpen(false); setVisibleSteps(0); }}
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
      <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-[#1E293B]/50">
        {visibleSteps === 0 && !running && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Target className="w-8 h-8 text-[#10B981]" />
            <span className="text-xs text-[#64748B] uppercase tracking-widest">Press RUN to simulate</span>
          </div>
        )}
        {LOG_LINES.map((line, i) => (
          <LogLine key={line.step} line={line} visible={i < visibleSteps} />
        ))}
      </div>

      {/* Iteration stats */}
      {visibleSteps > 0 && (
        <div className="px-4 py-2 border-t border-[#1E293B] flex justify-between text-[10px] text-[#475569]">
          <span>Iterations: <span className="text-[#10B981]">{visibleSteps * 25}</span></span>
          <span>Depth: <span className="text-[#3B82F6]">{Math.min(visibleSteps, 4)}</span></span>
          <span>Best warmth: <span className="text-[#F59E0B]">{visibleSteps >= 7 ? "0.74" : "—"}</span></span>
        </div>
      )}

      {/* Run button */}
      <div className="px-4 pb-6 pt-3 border-t border-[#1E293B] bg-[#0F172A]">
        <button
          onClick={handleRun}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded text-sm font-bold uppercase tracking-widest transition-all"
          style={{
            backgroundColor: running ? "#1E293B" : "#10B981",
            color: running ? "#475569" : "#000",
            border: running ? "1px solid #1E293B" : "none",
          }}
        >
          <Play className="w-4 h-4" />
          {running ? "RUNNING SIMULATION..." : "RUN MCTS ANALYSIS"}
        </button>
      </div>
    </div>
  );
}
