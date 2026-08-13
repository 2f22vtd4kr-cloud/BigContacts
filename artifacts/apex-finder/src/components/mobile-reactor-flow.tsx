import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Key,
  Radio,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { formatSchedulerCountdown, schedulerWaitRemaining } from "./scheduler-utils";

interface ResearchSession {
  id: number;
  targetEntityName: string | null;
  winningPath: string | null;
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
  personaNames?: string[];
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

interface AutoPipelineScheduler {
  enabled: boolean;
  active: boolean;
  nextTriggerAt?: string;
  lastStatus?: "triggered" | "completed" | "skipped_lock" | "no_targets" | "error";
  lastMessage?: string;
  cycles: number;
  skippedDueToLock: number;
  providerNoTarget: number;
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
  scheduler: AutoPipelineScheduler | null;
  schedulerNow: number;
  exhaustedKeys: string[];
}

const MOBILE_PHASES = [
  { id: "input", label: "TARGET ACQUISITION", detail: "Target becomes a research brief", nodeIds: ["target"] },
  { id: "registries", label: "PUBLIC REGISTRIES", detail: "Public records establish the evidence base", nodeIds: ["faa", "edgar", "hmlr", "ch", "hnwi", "occrp", "brreg", "whoxy"] },
  { id: "discovery", label: "BROAD DISCOVERY", detail: "Open sources expand identity and activity", nodeIds: ["inhouse", "webdisc", "deepweb", "opensky", "maigret"] },
  { id: "ai_layer", label: "AI EXTRACTION", detail: "Search, extraction, and adaptive follow-up", nodeIds: ["perp0", "exa", "tavily", "gemini", "groq", "perpfu"] },
  { id: "synthesis", label: "VECTOR SYNTHESIS", detail: "Evidence becomes vectors and priority", nodeIds: ["semantic", "bayesian"] },
  { id: "core", label: "REACTOR CORE", detail: "Relationships and paths are evaluated", nodeIds: ["graph", "mcts", "prac"] },
  { id: "output", label: "EVIDENCE REVIEW", detail: "A research path for analyst assessment", nodeIds: ["evidence"] },
];

function QuickStat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1.5">
      <div className="truncate text-[8px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-[14px] font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
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
    evidence: "Evidence review",
    "persona-review": "11-persona quality review",
  };
  return labels[tool] ?? tool;
}

const PERSONA_REVIEW_TOOL = "persona-review";

function isPersonaReviewTool(tool: string): boolean {
  return tool === PERSONA_REVIEW_TOOL;
}

function eventTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function progressPercent(value: number | null | undefined, total: number | null | undefined): number {
  if (value == null || total == null || total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800/90">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
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
  const [showHistory, setShowHistory] = React.useState(false);
  const telemetry = atlasState?.atlasTelemetry;
  const targetName = telemetry?.targetName || atlasState?.currentEntities?.[0];
  const isFailed = atlasState?.runStatus === "failed";
  const isDone = atlasState?.runStatus === "done";
  const events = atlasState?.eventLog ?? [];
  const operation = atlasState?.detail || livePhaseDetail;
  const phaseLabel = atlasState?.phaseLabel || (isLive ? "DISCOVERY" : "STANDBY");
  const phaseN = atlasState?.phase;
  const phaseTotal = atlasState?.phaseTotal;
  const current = events[0] || null;

  const toolLabel = (tool?: string) => {
    const id = (tool || "").toLowerCase();
    if (id.includes("tavily")) return "Tavily";
    if (id.includes("gemini")) return "Gemini";
    if (id.includes("groq")) return "GROQ";
    if (id.includes("web") || id.includes("scrap")) return "Browser";
    if (id.includes("rdap") || id.includes("whois")) return "RDAP / WhoisJSON";
    if (id.includes("edgar")) return "EDGAR";
    if (id === "ch" || id.includes("comp")) return "Companies House";
    if (id.includes("serp") || id.includes("google")) return "Search";
    return tool || "Tool";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {phaseLabel}
              {phaseN != null && phaseTotal != null ? ` · ${phaseN}/${phaseTotal}` : ""}
              {atlasState?.sourceStep != null && atlasState?.sourceTotal != null
                ? ` · source ${atlasState.sourceStep}/${atlasState.sourceTotal}`
                : ""}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-[#e8e0cc]">
              {targetName || (isLive ? "Active research" : "Standby")}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
              isLive
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                : isFailed
                  ? "border-rose-400/30 text-rose-300"
                  : "border-white/10 text-slate-500"
            }`}
          >
            {isLive ? "Live" : isDone ? "Done" : isFailed ? "Failed" : "Idle"}
          </span>
        </div>
        {operation && (
          <div className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{operation}</div>
        )}
      </div>

      <section
        className="flex min-h-[220px] flex-col rounded-xl border border-cyan-400/25 bg-[#071525] p-3.5 shadow-[0_0_28px_rgba(34,211,238,0.08)]"
        data-testid="live-log-window"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/90">
              Live event
            </h2>
          </div>
          {current?.activeToolId && (
            <span className="rounded border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-200">
              {toolLabel(current.activeToolId)}
            </span>
          )}
        </div>

        {!current ? (
          <div className="flex flex-1 items-center justify-center text-center text-[11px] text-slate-500">
            {isLive ? "Waiting for next tool event…" : "No live event — run Atlas to stream discovery here."}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            {current.stage && (
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {current.stage}
                {current.status ? ` · ${current.status}` : ""}
              </div>
            )}
            {current.inputSummary && (
              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[12px] leading-snug text-slate-200">
                {current.inputSummary}
              </div>
            )}
            {current.prompt && (
              <div>
                <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-lime-400/70">Prompt</div>
                <div className="rounded-lg border border-lime-400/15 bg-lime-400/[0.04] px-3 py-2 text-[11px] leading-relaxed text-slate-300">
                  {current.prompt}
                </div>
              </div>
            )}
            {current.resultSummary && (
              <div>
                <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-400/70">Result</div>
                <div className="text-[12px] leading-relaxed text-[#d0cbb8]">{current.resultSummary}</div>
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-3 border-t border-white/8 pt-2.5 text-[10px] uppercase tracking-wider text-slate-500">
              {current.sources != null && (
                <span>Sources <span className="text-cyan-300">{current.sources}</span></span>
              )}
              {current.evidence != null && (
                <span>Evidence <span className="text-lime-300">{current.evidence}</span></span>
              )}
              {current.contacts != null && (
                <span>Contacts <span className="text-amber-300">{current.contacts}</span></span>
              )}
            </div>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left touch-manipulation"
        data-testid="button-event-history"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Event history
        </span>
        <span className="flex items-center gap-2 text-[10px] text-slate-500">
          {events.length} total
          <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
        </span>
      </button>

      {showHistory && (
        <div className="space-y-2 rounded-xl border border-white/8 bg-black/20 p-2.5" data-testid="event-history-list">
          {events.length === 0 ? (
            <div className="px-2 py-3 text-center text-[10px] text-slate-500">No events yet</div>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className={`rounded-lg border px-3 py-2.5 ${
                  index === 0 ? "border-cyan-400/25 bg-cyan-400/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {toolLabel(event.activeToolId)}
                    {event.stage ? ` · ${event.stage}` : ""}
                  </span>
                  {index === 0 && isLive && (
                    <span className="text-[8px] font-bold uppercase text-cyan-300">Current</span>
                  )}
                </div>
                {event.inputSummary && (
                  <div className="mt-1 truncate text-[10px] text-slate-400">{event.inputSummary}</div>
                )}
                {event.resultSummary && (
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-300">{event.resultSummary}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {(telemetry?.sources != null || atlasState?.phase != null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[9px] uppercase tracking-wider text-slate-600">
          {atlasState?.phaseLabel && <span>Phase {atlasState.phaseLabel}</span>}
          {telemetry?.stage && <span>Lane {telemetry.stage}</span>}
          {telemetry?.sources != null && <span>Src {telemetry.sources}</span>}
          {telemetry?.evidence != null && <span>Ev {telemetry.evidence}</span>}
          {telemetry?.contacts != null && <span>Ct {telemetry.contacts}</span>}
        </div>
      )}
    </div>
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
    scheduler,
    schedulerNow,
    exhaustedKeys,
    livePhaseDetail,
    onRefresh,
    syncing,
  } = props;

  // A failed or completed run is never presented as active. Without Atlas
  // state, liveNodes is the only explicit activity signal available.
  const isLive = atlasState
    ? atlasState.runStatus === "running"
    : liveNodes.size > 0;
  const schedulerCountdown = formatSchedulerCountdown(schedulerWaitRemaining(scheduler, schedulerNow));
  const waitingForNextCycle = Boolean(!isLive && schedulerCountdown);
  const statusLabel = atlasState?.runStatus === "failed"
    ? "Failed"
    : atlasState?.runStatus === "done"
      ? waitingForNextCycle ? "Next cycle queued" : "Complete"
      : isLive
        ? "Active"
        : waitingForNextCycle ? "Next cycle queued" : "Nominal";
  const statusClass = atlasState?.runStatus === "failed"
    ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
    : waitingForNextCycle
      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
      : atlasState?.runStatus === "done"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : isLive
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
        : "border-lime-400/30 bg-lime-400/10 text-lime-300";

  let activePhaseIndex = -1;
  if (isLive) {
    for (let i = MOBILE_PHASES.length - 1; i >= 0; i -= 1) {
      if (MOBILE_PHASES[i].nodeIds.some((id) => liveNodes.has(id))) {
        activePhaseIndex = i;
        break;
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0b1120] font-sans text-slate-200">
      <header className="shrink-0 border-b border-white/10 bg-black/25 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Reactor status</div>
            <div
              className={`mt-1 truncate text-[10px] font-mono tracking-wide ${isLive ? "text-cyan-400/80" : "text-slate-500"}`}
              role="status"
              aria-live="polite"
              data-testid="status-reactor-summary"
            >
              {isLive
                ? liveLabel || livePhaseDetail || "Live Atlas research in progress"
                : waitingForNextCycle
                  ? `Standby · next Atlas cycle in ${schedulerCountdown}`
                  : atlasState?.runStatus === "done"
                    ? "Standby · last Atlas run completed"
                    : atlasState?.runStatus === "failed"
                      ? "Standby · last Atlas run failed"
                      : "Standby · Atlas is idle by design — no research run in progress"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${statusClass}`} data-testid="status-reactor">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-pulse bg-cyan-400" : atlasState?.runStatus === "failed" ? "bg-rose-400" : waitingForNextCycle ? "bg-amber-300" : "bg-lime-400"}`} />
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={syncing}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-cyan-400/30 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={syncing ? "Refreshing Atlas data" : "Refresh Atlas data"}
              data-testid="button-refresh-atlas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5">
          <QuickStat label="Entities" value={totalEntities} color="#38bdf8" />
          <QuickStat label="Hot leads" value={hotCount} color="#a3e635" />
          <QuickStat label="Assets" value={totalAssets} color="#22d3ee" />
          <QuickStat label="Sessions" value={sessions.length} color="#a78bfa" />
        </div>
        <div
          className={`mt-2 rounded-lg border px-2.5 py-2 text-[9px] ${
            scheduler?.enabled
              ? "border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-300/80"
              : "border-white/10 bg-white/[0.025] text-slate-500"
          }`}
          data-testid="status-continuous-scheduler"
        >
          <div className="flex items-center justify-between gap-2 uppercase tracking-[0.16em]">
            <span>{scheduler?.enabled ? "Continuous Atlas enabled" : "Continuous Atlas paused"}</span>
            <span className="text-[8px] text-slate-500">
              {scheduler?.cycles ?? 0} cycle{scheduler?.cycles === 1 ? "" : "s"}
            </span>
          </div>
          {scheduler?.enabled && (
            <div className="mt-1 truncate text-[8px] text-slate-500" data-testid="status-scheduler-countdown">
              {schedulerCountdown
                ? `Next cycle in ${schedulerCountdown} · ${scheduler.nextTriggerAt ? new Date(scheduler.nextTriggerAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`
                : scheduler.nextTriggerAt
                  ? `Next cycle ${new Date(scheduler.nextTriggerAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : scheduler.lastMessage || "Preparing next discovery cycle"}
              {scheduler.lastStatus === "skipped_lock" ? " · waiting for active Atlas lock" : ""}
            </div>
          )}
        </div>
      </header>

      <div className="atlas-grid atlas-grid-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="mx-auto max-w-md">
          <LiveResearchConsole atlasState={atlasState} livePhaseDetail={livePhaseDetail} isLive={isLive} />

          {/* Mobile: live event pane only — no pipeline map */}

        </div>
      </div>

      {exhaustedKeys.length > 0 && (
        <div className="shrink-0 border-t border-amber-900/40 bg-amber-950/20 px-4 py-2.5" role="alert" data-testid="alert-provider-rate-limit">
          <div className="flex items-start gap-2 text-[9px] font-bold uppercase leading-4 tracking-wider text-amber-400">
            <Key className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Provider rate limit — configured keys rotating: {exhaustedKeys.join(", ")}</span>
          </div>
        </div>
      )}
    </div>
  );
}