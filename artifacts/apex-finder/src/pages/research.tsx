import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useListEntities, useRunResearch } from "@workspace/api-client-react";
import { Terminal, Play, Cpu, ChevronRight, Hash, CheckCircle2, GitBranch, Target, Shield, ChevronDown, Search, X, Mail, Phone, Copy, CheckCheck } from "lucide-react";
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
  contactConfidence?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
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

// ── Path node contact bar ──────────────────────────────────────────────────────
function PathNodeContact({ node }: { node: PathStep }) {
  if (!node.contactConfidence && !node.contactEmail && !node.contactPhone) return null;
  return (
    <div className="mt-2 pt-2 border-t border-current/20 flex flex-col gap-1">
      {node.contactConfidence != null && node.contactConfidence > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-current/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-current/60"
              style={{ width: `${node.contactConfidence}%` }}
            />
          </div>
          <span className="text-[9px] font-mono opacity-70">{node.contactConfidence}%</span>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {node.contactEmail && (
          <a
            href={`mailto:${node.contactEmail}`}
            className="flex items-center gap-1 text-[10px] font-mono opacity-80 hover:opacity-100 transition-opacity"
            title={node.contactEmail}
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate max-w-[140px]">{node.contactEmail}</span>
          </a>
        )}
        {node.contactPhone && (
          <a
            href={`tel:${node.contactPhone}`}
            className="flex items-center gap-1 text-[10px] font-mono opacity-80 hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
            <span>{node.contactPhone}</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Copy path as outreach brief button ────────────────────────────────────────
function CopyBriefButton({ winningPath, pathScore }: { winningPath: PathStep[]; pathScore: number }) {
  const [copied, setCopied] = useState(false);

  const buildBrief = () => {
    const lines: string[] = [
      `APEX OUTREACH BRIEF`,
      `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Path Score: ${(pathScore * 100).toFixed(0)}/100`,
      ``,
      `APPROACH PATH`,
      `${"─".repeat(40)}`,
    ];
    winningPath.forEach((node, i) => {
      lines.push(`${i + 1}. [${node.role}] ${node.label} (${node.nodeType})`);
      if (node.registry) lines.push(`   Registry:  ${node.registry}`);
      if (node.contactEmail) lines.push(`   Email:     ${node.contactEmail}`);
      if (node.contactPhone) lines.push(`   Phone:     ${node.contactPhone}`);
      if (node.contactConfidence) lines.push(`   Confidence: ${node.contactConfidence}%`);
      if (node.actionRequired) lines.push(`   Action:    ${node.actionRequired}`);
      if (i < winningPath.length - 1) lines.push(`   ↓`);
    });
    lines.push(``, `${"─".repeat(40)}`);
    lines.push(`[All data sourced from public registries and OSINT only.]`);
    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildBrief());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors"
    >
      {copied ? <CheckCheck className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy Brief"}
    </button>
  );
}

export default function MCTSTerminal() {
  // wouter's useLocation only returns pathname; read query string from window
  useLocation(); // subscribe to route changes
  const urlEntityId = (() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const v = params.get("entity");
    return v ? parseInt(v, 10) : null;
  })();

  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(urlEntityId);
  const [entitySearch, setEntitySearch] = useState("");
  const { data: allEntities } = useListEntities({ limit: 500 });
  const entities = allEntities?.filter((e) =>
    !entitySearch || e.name.toLowerCase().includes(entitySearch.toLowerCase())
  );
  const runResearch = useRunResearch();

  const [terminalLog, setTerminalLog] = useState<MctsStep[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [winningPath, setWinningPath] = useState<PathStep[]>([]);
  const [pathScore, setPathScore] = useState<number>(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Mobile entity picker state
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const selectedEntity = entities?.find((e) => e.id === selectedEntityId);

  const startAnalysis = () => {
    if (!selectedEntityId) return;

    setTerminalLog([]);
    setWinningPath([]);
    setPathScore(0);
    setIsComputing(true);
    setMobilePickerOpen(false);

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
    <div className="flex h-full w-full bg-background overflow-hidden flex-col md:flex-row">

      {/* ── Mobile header: compact entity picker + run button ── */}
      <div className="md:hidden flex-shrink-0 border-b border-border bg-card/80 backdrop-blur p-3 space-y-2 z-20">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Target Selection</span>
          {pathScore > 0 && (
            <span className={cn(
              "ml-auto text-[10px] font-mono px-2 py-0.5 rounded border",
              pathScore >= 0.7 ? "text-primary border-primary/40 bg-primary/5" : "text-amber-500 border-amber-500/30 bg-amber-500/5"
            )}>
              PATH: {(pathScore * 100).toFixed(0)}/100
            </span>
          )}
        </div>

        {/* Entity dropdown trigger */}
        <button
          onClick={() => setMobilePickerOpen((o) => !o)}
          disabled={isComputing}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded border border-border bg-background text-sm font-mono text-foreground disabled:opacity-50"
        >
          <span className={selectedEntityId ? "text-foreground" : "text-muted-foreground"}>
            {selectedEntity?.name ?? "Select HNWI target..."}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {selectedEntity && <ScoreBadge score={selectedEntity.bayesianScore} />}
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", mobilePickerOpen && "rotate-180")} />
          </div>
        </button>

        {/* Mobile dropdown list */}
        {mobilePickerOpen && (
          <div className="border border-border rounded bg-card overflow-hidden max-h-48 overflow-y-auto">
            {entities?.map((ent) => (
              <button
                key={ent.id}
                onClick={() => { setSelectedEntityId(ent.id); setMobilePickerOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm font-mono border-b border-border last:border-0 hover:bg-muted/50 transition-colors text-left",
                  selectedEntityId === ent.id && "bg-primary/10 text-primary"
                )}
              >
                <span className="truncate pr-2">{ent.name}</span>
                <ScoreBadge score={ent.bayesianScore} />
              </button>
            ))}
          </div>
        )}

        {/* UCT formula */}
        <div className="bg-background/60 border border-border/60 rounded px-2 py-1.5">
          <div className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">UCT Formula</div>
          <div className="text-[10px] font-mono text-primary/70">{UCT_FORMULA}</div>
        </div>

        {/* Run button */}
        <button
          disabled={!selectedEntityId || isComputing}
          onClick={startAnalysis}
          className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 disabled:bg-muted disabled:text-muted-foreground text-primary border border-primary/50 disabled:border-border font-mono text-sm uppercase tracking-widest transition-all flex items-center justify-center rounded"
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

      {/* ── Desktop Left Panel: Entity Selector ── */}
      <div className="hidden md:flex w-80 border-r border-border bg-card flex-col flex-shrink-0 z-10 shadow-xl">
        <div className="p-4 border-b border-border space-y-2">
          <h2 className="text-sm font-bold font-mono tracking-wider flex items-center uppercase text-foreground">
            <Cpu className="w-4 h-4 mr-2 text-primary" /> Target Selection
          </h2>
          <div className="bg-background/60 border border-border/60 rounded px-2 py-1.5">
            <div className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">UCT Formula</div>
            <div className="text-[10px] font-mono text-primary/70">{UCT_FORMULA}</div>
          </div>
        </div>

        {/* Search input */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-background border border-border">
            <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Filter targets…"
              className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {entitySearch && (
              <button onClick={() => setEntitySearch("")}>
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
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
          {entities?.length === 0 && (
            <div className="text-[10px] font-mono text-muted-foreground/50 text-center py-4">No matches</div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/20 space-y-2">
          <button
            disabled={!selectedEntityId || isComputing}
            onClick={startAnalysis}
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
      <div className="flex-1 flex flex-col bg-[#050810] relative min-w-0 overflow-hidden">
        <div className="p-3 border-b border-border/50 bg-[#0B0F19] flex items-center justify-between text-xs font-mono text-muted-foreground flex-shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <Terminal className="w-4 h-4 flex-shrink-0" />
            <span className="truncate hidden sm:block">
              root@apexfinder:~# /opt/intel/mcts --target={selectedEntityId ?? "NULL"} --depth=4 --sims=120
            </span>
            <span className="sm:hidden text-[10px]">MCTS --target={selectedEntityId ?? "NULL"}</span>
          </div>
          {pathScore > 0 && (
            <div
              className={cn(
                "px-2 py-0.5 rounded border text-[10px] font-mono flex-shrink-0 ml-2",
                pathScore >= 0.7
                  ? "text-primary border-primary/40 bg-primary/5"
                  : "text-amber-500 border-amber-500/30 bg-amber-500/5"
              )}
            >
              {(pathScore * 100).toFixed(0)}/100
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-sm space-y-2 min-h-0">
          {terminalLog.length === 0 && !isComputing && (
            <div className="text-muted-foreground/50 h-full flex flex-col items-center justify-center space-y-3 select-none">
              <Terminal className="w-8 h-8 opacity-20" />
              <span className="italic text-sm">Awaiting target selection...</span>
              <div className="text-[11px] text-center opacity-60 max-w-sm leading-relaxed">
                MCTS traverses the entity graph using the UCT formula to identify the optimal warm-introduction path to the HNWI target. 120 rollouts per run.
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
              {">"} Traversing graph... {terminalLog.length} nodes explored
            </div>
          )}

          <div ref={(el) => { logEndRef.current = el; }} />
        </div>

        {/* ── Winning Path Visualization ── */}
        {winningPath.length > 0 && !isComputing && (
          <div className="border-t border-border/50 bg-[#0B0F19] p-4 md:p-5 animate-in slide-in-from-bottom-10 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono text-primary uppercase tracking-widest flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Optimal Approach Vector — {winningPath.length} nodes
              </h3>
              <CopyBriefButton winningPath={winningPath} pathScore={pathScore} />
            </div>

            {/* Mobile: vertical stack */}
            <div className="flex md:hidden flex-col space-y-2">
              {winningPath.map((node, i) => (
                <div key={i}>
                  <div className={cn("flex flex-col border p-3 rounded", roleColor(node.role))}>
                    <div className="flex items-center mb-1.5 space-x-1">
                      {roleIcon(node.role)}
                      <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">{node.role}</span>
                    </div>
                    <div className="font-bold text-foreground text-sm leading-tight mb-1">{node.label}</div>
                    <div className="text-[10px] opacity-50">{node.nodeType}</div>
                    <PathNodeContact node={node} />
                    {node.actionRequired && (
                      <div className="mt-2 text-[10px] leading-snug opacity-75 border-t border-current/20 pt-1.5">{node.actionRequired}</div>
                    )}
                  </div>
                  {i < winningPath.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: horizontal */}
            <div className="hidden md:flex items-start overflow-x-auto pb-3 space-x-3">
              {winningPath.map((node, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div className={cn("flex flex-col border p-3 rounded min-w-[180px] max-w-[240px]", roleColor(node.role))}>
                    <div className="flex items-center mb-1.5 space-x-1">
                      {roleIcon(node.role)}
                      <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">{node.role}</span>
                    </div>
                    <div className="font-bold text-foreground text-sm leading-tight mb-1">{node.label}</div>
                    <div className="text-[10px] opacity-50">{node.nodeType}</div>
                    <PathNodeContact node={node} />
                    {node.actionRequired && (
                      <div className="mt-2 text-[10px] leading-snug opacity-75 border-t border-current/20 pt-1.5">{node.actionRequired}</div>
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
