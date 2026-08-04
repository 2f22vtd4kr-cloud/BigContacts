import React from "react";
import { RefreshCw, Target, Cpu, Eye, Radio, GitMerge, Search, Globe, Users, Brain, MapPin, Building2, Server, Key, ChevronDown, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import LiquidGlass from "liquid-glass-react";

interface ResearchSession {
  id: number;
  targetEntityName: string | null;
  winningPath: string | null;
  generatedPitch: string | null;
  crmStatus: string;
  bayesianScoreAtRuntime: number | null;
  pathScore: number | null;
  createdAt: string;
}

interface AtlasTelemetry {
  stage: string;
  status: "active" | "complete" | "blocked" | "review";
  targetName?: string;
  targetType?: string;
  toolIds?: string[];
  activeToolId?: string;
  prompt?: string;
  inputSummary?: string;
  resultSummary?: string;
  sources?: number;
  evidence?: number;
  contacts?: number;
  nextAction?: string;
  disposition?: "contact_route_found" | "needs_follow_up";
}

interface AtlasLiveState {
  runStatus: "running" | "done" | "failed";
  phase: number;
  phaseLabel: string;
  phaseProgress: number;
  phaseTotal: number;
  sourceStep: number | null;
  sourceTotal: number | null;
  currentEntities: string[];
  entityProgress: number | null;
  entityTotal: number | null;
  detail: string;
  atlasTelemetry?: AtlasTelemetry;
  eventLog?: Array<{
    timestamp?: string;
    stage?: string;
    status?: string;
    targetName?: string;
    targetType?: string;
    activeToolId?: string;
    prompt?: string;
    inputSummary?: string;
    resultSummary?: string;
    sources?: number;
    evidence?: number;
    contacts?: number;
    raw?: string;
  }>;
  phaseJ?: {
    status?: string;
    progress?: number;
    total?: number;
    inserted?: number;
    errors?: number;
    message?: string;
  } | null;
}

interface MobileReactorFlowProps {
  sessions: ResearchSession[];
  totalEntities: number;
  hotCount: number;
  totalAssets: number;
  loading: boolean;
  onRefresh: () => void;
  syncing: boolean;
  liveNodes: Set<string>;
  liveLabel: string;
  livePhaseDetail: string;
  atlasState: AtlasLiveState | null;
  exhaustedKeys: string[];
}

const MOBILE_PHASES = [
  { id: "input", label: "TARGET ACQUISITION", detail: "Target becomes a research brief", nodeIds: ["target"] },
  { id: "registries", label: "PUBLIC REGISTRIES", detail: "Public records establish the evidence base", nodeIds: ["faa", "edgar", "hmlr", "ch", "hnwi", "occrp", "brreg", "whoxy"] },
  { id: "discovery", label: "BROAD DISCOVERY", detail: "Open sources expand identity and activity", nodeIds: ["inhouse", "webdisc", "deepweb", "opensky", "maigret"] },
  { id: "ai_layer", label: "AI EXTRACTION", detail: "Search, extraction, and adaptive follow-up", nodeIds: ["perp0", "exa", "tavily", "gemini", "groq", "perpfu"] },
  { id: "synthesis", label: "VECTOR SYNTHESIS", detail: "Evidence becomes vectors and priority", nodeIds: ["semantic", "bayesian"] },
  { id: "core", label: "REACTOR CORE", detail: "Relationships and paths are evaluated", nodeIds: ["graph", "mcts", "prac"] },
  { id: "output", label: "OUTPUT GENERATION", detail: "A research-ready outreach sequence", nodeIds: ["pitch"] },
];

function QuickStat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded bg-white/[0.02] border border-white/5 flex-1 min-w-0">
      <span className="text-[9px] uppercase tracking-widest text-slate-500 truncate">{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</span>
      <span className="text-sm font-bold text-white tabular-nums">{value}</span>
    </div>
  );
}

function formatTool(tool: string): string {
  const labels: Record<string, string> = {
    perp0: "Perplexity",
    perpfu: "Perplexity follow-up",
    exa: "Exa",
    tavily: "Tavily",
    gemini: "Gemini",
    groq: "Groq extraction",
    inhouse: "In-house OSINT",
    webdisc: "Web discovery",
    deepweb: "Deep web OSINT",
    maigret: "Maigret",
    holehe: "Holehe",
    occrp: "OCCRP Aleph",
    whoxy: "Whoxy / WHOIS",
    opensky: "OpenSky",
    graph: "Relationship graph",
    semantic: "Semantic vectors",
    bayesian: "Bayesian scoring",
    "domain-resolver": "Domain resolution",
    "digital-footprint": "Digital footprint",
    "contact-attribution": "Contact attribution",
    "source-cooldowns": "Source cooldowns",
    mcts: "MCTS / UCT",
    prac: "Path review",
    pitch: "Outreach safety",
  };
  return labels[tool] ?? tool;
}

function eventTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LiveResearchConsole({
  atlasState,
  livePhaseDetail,
  isLive,
}: {
  atlasState: AtlasLiveState | null;
  livePhaseDetail: string;
  isLive: boolean;
}) {
  const telemetry = atlasState?.atlasTelemetry;
  const phaseJ = atlasState?.phaseJ;
  const targetName = telemetry?.targetName || atlasState?.currentEntities[0] || "Waiting for target";
  const targetType = telemetry?.targetType || "Target-scoped public-source research";
  const operation = atlasState?.detail || livePhaseDetail || "Waiting for the next research event";
  const phasePercent = atlasState?.phaseTotal
    ? Math.min(100, Math.max(0, (atlasState.phase / atlasState.phaseTotal) * 100))
    : 0;
  const targetPercent = atlasState?.entityTotal
    ? Math.min(100, Math.max(0, ((atlasState.entityProgress ?? 0) / atlasState.entityTotal) * 100))
    : 0;
  const statusLabel = atlasState?.runStatus === "failed"
    ? "Run failed"
    : atlasState?.runStatus === "done"
      ? "Run complete"
      : isLive
        ? "Research active"
        : "Research idle";
  const statusClass = atlasState?.runStatus === "failed"
    ? "text-rose-300 border-rose-400/30 bg-rose-400/10"
    : atlasState?.runStatus === "done"
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : isLive
        ? "text-cyan-300 border-cyan-400/30 bg-cyan-400/10"
        : "text-slate-400 border-white/10 bg-white/[0.03]";

  const phaseJPass = phaseJ?.message?.match(/J4-J9 pass\s+(\d+)\/(\d+):\s*(.+?)(?:…)?$/i);

  return (
    <section className="mb-7 rounded-2xl border border-cyan-400/20 bg-[#071525]/90 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <Radio className="h-3.5 w-3.5" />
            Live research console
          </div>
          <p className="max-w-[290px] text-[11px] leading-relaxed text-slate-400">
            Sequential public-source OSINT. Each target is checked, enriched, and kept review-only unless evidence is corroborated.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">Current target</div>
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-white">{targetName}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{targetType}</div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Atlas phase</div>
          <div className="mt-1 text-sm font-bold text-cyan-300">
            {atlasState ? `${atlasState.phase} / ${atlasState.phaseTotal}` : "—"}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-slate-400">{atlasState?.phaseLabel || "Waiting"}</div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${phasePercent}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Target queue</div>
          <div className="mt-1 text-sm font-bold text-lime-300">
            {atlasState?.entityProgress != null && atlasState?.entityTotal != null
              ? `${atlasState.entityProgress} / ${atlasState.entityTotal}`
              : "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">targets completed</div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-lime-400 transition-all" style={{ width: `${targetPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
        <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-cyan-400/70">What is happening now</div>
        <div className="text-[12px] leading-relaxed text-slate-200">{operation}</div>
      </div>

      {telemetry && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <QuickStat label="Sources" value={telemetry.sources ?? "—"} color="#38bdf8" />
            <QuickStat label="Evidence" value={telemetry.evidence ?? "—"} color="#a3e635" />
            <QuickStat label="Contacts" value={telemetry.contacts ?? "—"} color="#fbbf24" />
          </div>

          {telemetry.toolIds && telemetry.toolIds.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-slate-500">
                <Cpu className="h-3 w-3" />
                Research lanes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {telemetry.toolIds.map((tool) => {
                  const active = tool === telemetry.activeToolId;
                  return (
                    <span
                      key={tool}
                      className={`rounded-md border px-2 py-1 text-[10px] ${
                        active
                          ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.03] text-slate-500"
                      }`}
                    >
                      {active ? "● " : ""}{formatTool(tool)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {telemetry.resultSummary && (
            <div className="mb-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
              <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-emerald-300/70">
                <CheckCircle2 className="h-3 w-3" />
                Latest result
              </div>
              <div className="text-[11px] leading-relaxed text-slate-300">{telemetry.resultSummary}</div>
            </div>
          )}

          {telemetry.nextAction && (
            <div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
              <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-amber-300/70">Next decision</div>
              <div className="text-[11px] leading-relaxed text-slate-300">{telemetry.nextAction}</div>
            </div>
          )}

          {(telemetry.inputSummary || telemetry.prompt) && (
            <details className="rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-[9px] uppercase tracking-[0.18em] text-slate-500">
                Show research input
              </summary>
              <div className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-400">
                {telemetry.inputSummary || telemetry.prompt}
              </div>
            </details>
          )}
        </>
      )}

      {atlasState?.eventLog && atlasState.eventLog.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.18em] text-slate-500">
            <span className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-cyan-400/80" />
              Live research log
            </span>
            <span className="text-[8px] normal-case tracking-normal text-slate-600">
              newest first · confirmed events
            </span>
          </div>
          <div className="space-y-2">
            {atlasState.eventLog.slice(0, 8).map((event, index) => {
              const status = event.status ?? "active";
              const statusColor = status === "complete"
                ? "text-lime-300 border-lime-400/20 bg-lime-400/[0.04]"
                : status === "review" || status === "blocked"
                  ? "text-amber-300 border-amber-400/20 bg-amber-400/[0.04]"
                  : "text-cyan-200 border-cyan-400/20 bg-cyan-400/[0.04]";
              return (
                <details key={`${event.timestamp ?? "event"}-${index}`} className={`rounded-xl border p-3 ${statusColor}`}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-semibold leading-4">{event.stage ?? "Research event"}</span>
                          <span className="shrink-0 text-[8px] text-slate-500">{eventTime(event.timestamp)}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-slate-400">
                          {event.activeToolId ? formatTool(event.activeToolId) : "Atlas"}{event.targetName ? ` · ${event.targetName}` : ""}
                        </div>
                        {event.resultSummary && (
                          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-300">{event.resultSummary}</div>
                        )}
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-2 text-[10px] leading-4 text-slate-400">
                    {event.inputSummary && <div><span className="text-slate-600">INPUT · </span>{event.inputSummary}</div>}
                    {event.prompt && (
                      <details className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <summary className="cursor-pointer text-[9px] uppercase tracking-wider text-slate-500">Prompt sent</summary>
                        <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[9px] leading-4 text-slate-400">{event.prompt}</div>
                      </details>
                    )}
                    {event.resultSummary && <div><span className="text-slate-600">RESULT · </span>{event.resultSummary}</div>}
                    {(event.sources !== undefined || event.evidence !== undefined || event.contacts !== undefined) && (
                      <div className="flex flex-wrap gap-2 pt-1 text-[9px] text-slate-500">
                        {event.sources !== undefined && <span>sources {event.sources}</span>}
                        {event.evidence !== undefined && <span>evidence {event.evidence}</span>}
                        {event.contacts !== undefined && <span>contacts {event.contacts}</span>}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {!telemetry && (
        <div className="mb-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
          <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-amber-300/70">
            <AlertTriangle className="h-3 w-3" />
            Lane telemetry unavailable
          </div>
          <div className="text-[11px] leading-relaxed text-slate-300">
            Showing only confirmed Atlas job progress. No research tool or result is inferred from the parent status message.
          </div>
        </div>
      )}

      {phaseJ && !telemetry?.sources && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <QuickStat label="J4–J9 pass" value={phaseJPass ? `${phaseJPass[1]}/${phaseJPass[2]}` : "—"} color="#38bdf8" />
          <QuickStat label="Persisted" value={phaseJ.inserted ?? "—"} color="#a3e635" />
          <QuickStat label="Errors" value={phaseJ.errors ?? "—"} color={phaseJ.errors ? "#fb7185" : "#64748b"} />
        </div>
      )}
    </section>
  );
}

export function MobileReactorFlow(props: MobileReactorFlowProps) {
  const {
    totalEntities,
    hotCount,
    totalAssets,
    sessions,
    liveNodes,
    liveLabel,
    atlasState,
    exhaustedKeys,
    livePhaseDetail,
  } = props;

  const isLive = liveNodes.size > 0 || Boolean(atlasState && atlasState.runStatus !== "done");

  // Determine active phase based on liveNodes. Scan backwards to find the deepest active phase.
  let activePhaseIndex = -1;
  if (isLive) {
    for (let i = MOBILE_PHASES.length - 1; i >= 0; i--) {
      if (MOBILE_PHASES[i].nodeIds.some(id => liveNodes.has(id))) {
        activePhaseIndex = i;
        break;
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b1120] text-slate-200 overflow-hidden font-sans">
      {/* The global mobile shell already identifies this page. Keep only the
          reactor status and stats here so the title/logo are not repeated. */}
      <header className="px-5 py-3 border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center justify-end mb-3">
          <div className={`px-2.5 py-1 rounded text-[9px] font-bold tracking-widest uppercase border flex items-center gap-1.5
            ${isLive ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400' : 'border-lime-400/30 bg-lime-400/10 text-lime-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-cyan-400 animate-ping' : 'bg-lime-400'}`} />
            {isLive ? 'Active' : 'Nominal'}
          </div>
        </div>
        <div
          className={`mb-3 text-right text-[10px] font-mono tracking-wide ${isLive ? "text-cyan-400/80" : "text-slate-500"}`}
          role="status"
        >
          {isLive
            ? (liveLabel || livePhaseDetail || "Live Atlas research in progress")
            : "Standby · Atlas is idle by design — no research run in progress"}
        </div>
        {/* Quick Stats Grid */}
        <div className="flex gap-2">
          <QuickStat label="Entities" value={totalEntities} color="#38bdf8" />
          <QuickStat label="Hot Leads" value={hotCount} color="#a3e635" />
          <QuickStat label="Assets" value={totalAssets} color="#22d3ee" />
          <QuickStat label="Sessions" value={sessions.length} color="#a78bfa" />
        </div>
      </header>

      {/* Main Flow Area */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 relative atlas-grid"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="max-w-md mx-auto relative">
          <LiveResearchConsole
            atlasState={atlasState}
            livePhaseDetail={livePhaseDetail}
            isLive={isLive}
          />

          <div className="mb-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <Activity className="h-3.5 w-3.5 text-cyan-400/70" />
            Atlas pipeline map
            <span className="font-normal normal-case tracking-normal text-slate-600">· context, not a progress log</span>
          </div>
          
          <div className="relative">
            {/* Vertical line connecting phases */}
            <div className="absolute left-[15px] top-4 bottom-8 w-px bg-gradient-to-b from-cyan-500/50 via-white/10 to-transparent" />

            {MOBILE_PHASES.map((phase, i) => {
            const isActive = isLive && i === activePhaseIndex;
            const isCompleted = isLive && i < activePhaseIndex;
            const isUpcoming = !isLive || i > activePhaseIndex;

              return (
                <div key={phase.id} className="relative pl-12 mb-10 last:mb-0">
                {/* Dot */}
                <div className={`absolute left-0 top-1 w-[31px] h-[31px] rounded-full border-2 flex items-center justify-center bg-[#0b1120] transition-colors duration-500 z-10
                  ${isActive ? 'border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 
                    isCompleted ? 'border-emerald-500 text-emerald-500' : 'border-slate-800 text-slate-700'}`}>
                  {isActive ? (
                    <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
                  ) : isCompleted ? (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                  )}
                </div>

                {/* Directional arrow below the dot (except for the last phase) */}
                {i < MOBILE_PHASES.length - 1 && (
                  <div className="absolute left-[9.5px] top-[38px] text-white/20 z-10">
                    <ChevronDown className="w-3 h-3" />
                  </div>
                )}

                {/* Phase Info */}
                <div className="pt-1">
                  <div className={`text-[11px] font-bold tracking-[0.15em] mb-1 transition-colors duration-500
                    ${isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-500/80' : 'text-slate-300/80'}`}>
                    {phase.label}
                  </div>
                   <div className={`text-xs transition-colors duration-500 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {phase.detail}
                  </div>

                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Footer Alerts */}
      {exhaustedKeys.length > 0 && (
        <div className="shrink-0 bg-amber-950/20 border-t border-amber-900/40 px-5 py-3">
          <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold tracking-wider uppercase">
            <Key className="w-3.5 h-3.5" />
            Provider rate limit — configured keys rotating: {exhaustedKeys.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
