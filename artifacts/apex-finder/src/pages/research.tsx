import { useState, useEffect, useRef } from "react";
import { useListEntities, useRunResearch } from "@workspace/api-client-react";
import { Terminal, Play, Cpu, ChevronRight, Hash, CheckCircle2, GitBranch, Target, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/lib/utils";

// ── Correct types matching the API ──────────────────────────────────────────
type MctsStep = {
  step: number;
  action: string;
  registry: string;
  target: string;
  targetType: string;
  uctScore: number;
  warmthScore: number;
  reasoning: string;
};

type PathStep = {
  vertexId: string;
  label: string;
  nodeType: string;
  role: "TARGET" | "GATEKEEPER" | "INTERMEDIARY" | "ASSET";
  contactMethod?: string;
  registry?: string;
  actionRequired?: string;
};

const UCT_FORMULA = "UCT(v) = Q(v)/N(v) + √2 · √(ln N(parent) / N(v))";

function roleIcon(role: string) {
  if (role === "TARGET") return <Target className="w-3 h-3 text-primary" />;
  if (role === "GATEKEEPER") return <Shield className="w-3 h-3 text-amber-500" />;
  if (role === "ASSET") return <GitBranch className="w-3 h-3 text-secondary" />;
  return <ChevronRight className="w-3 h-3 text-muted-foreground" />;
}

function roleColor(role: string) {
  if (role === "TARGET") return "border-primary/40 bg-primary/5 text-primary";
  if (role === "GATEKEEPER") return "border-amber-500/40 bg-amber-500/5 text-amber-400";
  if (role === "ASSET") return "border-secondary/30 bg-secondary/5 text-secondary";
  return "border-border bg-muted/10 text-muted-foreground";
}

function getWarmthColor(score: number) {
  if (score >= 0.75) return "text-primary font-bold";
  if (score >= 0.5) return "text-amber-400";
  return "text-muted-foreground";
}

function getActionColor(action: string) {
  if (action === "GATEKEEPER LOCKED") return "text-primary font-bold";
  if (action === "TARGET IDENTIFIED") return "text-amber-500";
  return "text-secondary";
}

export default function MCTSTerminal() {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const { data: entities } = useListEntities({ type: "HNWI", limit: 30 });
  const runResearch = useRunResearch();

  const [terminalLog, setTerminalLog] = useState<MctsStep[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [winningPath, setWinningPath] = useState<PathStep[]>([]);
  const [pathScore, setPathScore] = useState<number>(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const startSimulation = () => {
    if (!selectedEntityId) return;

    setTerminalLog([]);
    setWinningPath([]);
    setPathScore(0);
    setIsComputing(true);

    runResearch.mutate(
      { data: { entityId: selectedEntityId, depth: 4 } },
      {
        onSuccess: (data) => {
          setSessionId(data.id);

          let steps: MctsStep[] = [];
          let path: PathStep[] = [];

          try { steps = data.mctsSteps ? JSON.parse(data.mctsSteps) : []; } catch { steps = []; }
          try { path = data.winningPath ? JSON.parse(data.winningPath) : []; } catch { path = []; }

          setPathScore(data.pathScore ?? 0);

          // Stream steps into terminal
          let i = 0;
          const interval = setInterval(() => {
            if (i < steps.length) {
              setTerminalLog((prev) => [...prev, steps[i]!]);
              i++;
            } else {
              clearInterval(interval);
              setIsComputing(false);
              setWinningPath(path);
            }
          }, 260);
        },
        onError: () => {
          setIsComputing(false);
          setTerminalLog([{
            step: 0,
            action: "CRITICAL FAILURE",
            registry: "SYS",
            target: "ERR",
            targetType: "System",
            uctScore: 0,
            warmthScore: 0,
            reasoning: "MCTS engine returned an error. Check API server logs.",
          }]);
        },
      }
    );
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLog]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* ── Left Panel: Entity Selector ── */}
      <div className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0 z-10 shadow-xl">
        <div className="p-4 border-b border-border space-y-2">
          <h2 className="text-sm font-bold font-mono tracking-wider flex items-center uppercase text-foreground">
            <Cpu className="w-4 h-4 mr-2 text-primary" /> Target Selection
          </h2>
          <div className="bg-background/60 border border-border/60 rounded px-2 py-1.5">
            <div className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">UCT Formula</div>
            <div className="text-[10px] font-mono text-primary/70">{UCT_FORMULA}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {entities?.map((ent) => (
            <div
              key={ent.id}
              onClick={() => !isComputing && setSelectedEntityId(ent.id)}
              className={cn(
                "p-3 rounded border text-sm font-mono cursor-pointer transition-colors flex justify-between items-center",
                selectedEntityId === ent.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isComputing && selectedEntityId !== ent.id && "opacity-30 cursor-not-allowed"
              )}
            >
              <div className="truncate pr-2">{ent.name}</div>
              <ScoreBadge score={ent.bayesianScore} />
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border bg-muted/20 space-y-2">
          <button
            disabled={!selectedEntityId || isComputing}
            onClick={startSimulation}
            className="w-full py-2 bg-primary/20 hover:bg-primary/30 disabled:bg-muted disabled:text-muted-foreground text-primary border border-primary/50 disabled:border-border font-mono text-sm uppercase tracking-widest transition-all flex items-center justify-center"
          >
            {isComputing ? (
              <span className="animate-pulse flex items-center">
                <Hash className="w-4 h-4 mr-2 animate-spin" /> Computing...
              </span>
            ) : (
              <span className="flex items-center">
                <Play className="w-4 h-4 mr-2" /> Initialize MCTS
              </span>
            )}
          </button>
          {sessionId && !isComputing && (
            <div className="text-[10px] font-mono text-muted-foreground text-center">
              Session #{sessionId} saved → Pipeline CRM
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: MCTS Terminal ── */}
      <div className="flex-1 flex flex-col bg-[#050810] relative min-w-0">
        <div className="p-3 border-b border-border/50 bg-[#0B0F19] flex items-center justify-between text-xs font-mono text-muted-foreground flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>
              root@apexfinder:~# /opt/intel/mcts --target={selectedEntityId ?? "NULL"} --depth=4 --sims=120
            </span>
          </div>
          {pathScore > 0 && (
            <div
              className={cn(
                "px-2 py-0.5 rounded border text-[10px] font-mono",
                pathScore >= 0.7
                  ? "text-primary border-primary/40 bg-primary/5"
                  : "text-amber-500 border-amber-500/30 bg-amber-500/5"
              )}
            >
              PATH SCORE: {(pathScore * 100).toFixed(0)}/100
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 min-h-0">
          {terminalLog.length === 0 && !isComputing && (
            <div className="text-muted-foreground/50 h-full flex flex-col items-center justify-center space-y-3 select-none">
              <Terminal className="w-8 h-8 opacity-20" />
              <span className="italic text-sm">Awaiting target selection...</span>
              <div className="text-[11px] text-center opacity-60 max-w-sm leading-relaxed">
                MCTS explores the entity graph using the UCT formula to identify the optimal warm-introduction path to the HNWI target. 120 simulations per run.
              </div>
            </div>
          )}

          {terminalLog.map((log, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="flex items-start flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-blue-400">[{log.step.toString().padStart(4, "0")}]</span>
                <span className={getActionColor(log.action)}>[{log.action}]</span>
                <span className="text-purple-400">[{log.registry}]</span>
                <span className="text-foreground">{log.target}</span>
                <span className="text-xs text-muted-foreground">({log.targetType})</span>
                <span className="text-amber-500">UCT={log.uctScore.toFixed(3)}</span>
                <span className={getWarmthColor(log.warmthScore)}>
                  W={Math.round(log.warmthScore * 100)}%
                </span>
              </div>
              <div className="text-muted-foreground text-xs pl-8 border-l border-muted-foreground/20 mt-0.5 mb-2">
                {">"} {log.reasoning}
              </div>
            </div>
          ))}

          {isComputing && (
            <div className="text-primary animate-pulse font-mono text-sm">
              {">"} Simulating paths... {terminalLog.length} steps explored
            </div>
          )}

          <div ref={(el) => { logEndRef.current = el; }} />
        </div>

        {/* ── Winning Path Visualization ── */}
        {winningPath.length > 0 && !isComputing && (
          <div className="border-t border-border/50 bg-[#0B0F19] p-5 animate-in slide-in-from-bottom-10 flex-shrink-0">
            <h3 className="text-xs font-mono text-primary uppercase tracking-widest mb-4 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Optimal Approach Vector — {winningPath.length} nodes identified
            </h3>

            <div className="flex items-start overflow-x-auto pb-3 space-x-3">
              {winningPath.map((node, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div
                    className={cn(
                      "flex flex-col border p-3 rounded min-w-[160px] max-w-[220px]",
                      roleColor(node.role)
                    )}
                  >
                    <div className="flex items-center mb-1.5 space-x-1">
                      {roleIcon(node.role)}
                      <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">
                        {node.role}
                      </span>
                    </div>
                    <div className="font-bold text-foreground text-sm leading-tight mb-1">
                      {node.label}
                    </div>
                    <div className="text-[10px] opacity-50">{node.nodeType}</div>
                    {node.actionRequired && (
                      <div className="mt-2 text-[10px] leading-snug opacity-75 border-t border-current/20 pt-1.5">
                        {node.actionRequired}
                      </div>
                    )}
                  </div>

                  {i < winningPath.length - 1 && (
                    <div className="flex items-center mx-2 flex-shrink-0">
                      <div className="w-4 h-px bg-border/60" />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
