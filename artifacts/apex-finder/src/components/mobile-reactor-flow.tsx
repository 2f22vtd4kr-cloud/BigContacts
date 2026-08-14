import React from "react";
import {
  Key,
  Radio,
  RefreshCw,
  History,
} from "lucide-react";
import { formatSchedulerCountdown, schedulerWaitRemaining } from "./scheduler-utils";
import { BureauOpsStage } from "./bureau-ops-stage";
import { REACTOR_ARM_MS, REACTOR_CSS, REACTOR_CELEBRATE_MS, REACTOR_SHIMMER_MS, REACTOR_SCENE_MS } from "../lib/reactor-motion";

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
  const [showHistory, setShowHistory] = React.useState(false);
  // P2 desk arming — brief scaffold when a run first goes live
  const [arming, setArming] = React.useState(false);
  const wasLiveRef = React.useRef(false);
  React.useEffect(() => {
    if (isLive && !wasLiveRef.current) {
      setArming(true);
      const t = window.setTimeout(() => setArming(false), REACTOR_ARM_MS);
      wasLiveRef.current = true;
      return () => clearTimeout(t);
    }
    if (!isLive) {
      wasLiveRef.current = false;
      setArming(false);
    }
  }, [isLive]);

  // Keyboard: Escape returns from History to Live desk
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showHistory) {
        e.preventDefault();
        setShowHistory(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHistory]);
  const deskEvents = atlasState?.eventLog ?? [];
  // Live strip = recent; History = full target action list
  const liveEvents = showHistory ? deskEvents : deskEvents.slice(-6);
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
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0b1120] font-sans text-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Fallback tokens if parent did not inject KEYFRAMES */}
      <style>{REACTOR_CSS}</style>
      {/* Minimal chrome — target + live pulse only */}
      <header
        className="shrink-0 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${isLive ? "animate-pulse bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : atlasState?.runStatus === "failed" ? "bg-rose-400" : "bg-slate-600"}`} />
              <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isLive ? "reactor-live-label" : "text-slate-400"}`}>
                {isLive ? "Live" : statusLabel}
              </span>
              {showHistory && (
                <span className="rounded-full border border-slate-500/40 bg-slate-500/15 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  history
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-[16px] font-semibold text-white" data-testid="status-reactor-summary">
              {atlasState?.atlasTelemetry?.targetName
                || atlasState?.currentEntities?.[0]
                || (isLive ? "Researching…" : "Atlas idle")}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              {showHistory
                ? "Archive of this target’s tool steps"
                : isLive
                ? (liveLabel || livePhaseDetail || atlasState?.detail || "Working public sources")
                : waitingForNextCycle
                  ? `Next cycle in ${schedulerCountdown}`
                  : "Standby"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={`reactor-pressable flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold uppercase tracking-wider ${
              showHistory ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20"
            }`}
            data-testid="button-history"
            aria-pressed={showHistory}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            {showHistory ? "Live" : "History"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className="reactor-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Refresh Atlas status"
            data-testid="button-refresh-atlas"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
        {(atlasState?.atlasTelemetry?.disposition === "contact_route_found"
          || (atlasState?.atlasTelemetry?.contacts != null && atlasState.atlasTelemetry.contacts > 0)) && (
          <div
            className="reactor-reach mt-3 rounded-xl border px-3 py-2.5 shadow-[0_0_24px_rgba(52,211,153,0.18)]"
            data-testid="card-reach-contact-found"
            role="status"
            aria-live="polite"
            style={{ animation: `reachIn ${REACTOR_CELEBRATE_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both` }}
          >
            <div className="reactor-reach-label text-[10px] font-bold uppercase">Contact found · REACH</div>
            <div className="mt-1 text-[13px] leading-snug text-emerald-50">
              {atlasState?.atlasTelemetry?.resultSummary
                || `${atlasState?.atlasTelemetry?.contacts} attributable vector(s)`}
            </div>
          </div>
        )}
      </header>

      {/* Primary: immersive tool window — what Atlas is doing right now */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pb-8">
          {arming ? (
            <section
              className="rounded-2xl border border-cyan-400/25 bg-[#071018] p-3 shadow-[0_0_40px_rgba(34,211,238,0.06)]"
              data-testid="panel-live-desk-arming"
              aria-hidden
            >
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">Arming desk…</div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1220]">
                <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                  <div className="ml-1 h-2 flex-1 overflow-hidden rounded bg-slate-800">
                    <div className="h-full w-2/3" style={{ background: "linear-gradient(90deg,transparent,rgba(34,211,238,.25),transparent)", animation: `reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite` }} />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-3 w-4/5 rounded bg-slate-800/90" />
                  <div className="h-3 w-3/5 rounded bg-slate-800/70" />
                  <div className="h-3 w-2/3 rounded bg-slate-800/50" />
                </div>
              </div>
            </section>
          ) : liveEvents.length > 0 ? (
            <section
              key={showHistory ? "history" : "live"}
              className={`rounded-2xl border p-3 ${
                showHistory
                  ? "border-slate-500/35 bg-[#0a0f18] shadow-[0_0_32px_rgba(100,116,139,0.08)]"
                  : "border-cyan-400/25 bg-[#071018] shadow-[0_0_40px_rgba(34,211,238,0.06)]"
              }`}
              data-testid="panel-live-desk-mobile"
              aria-label={showHistory ? "Target history" : "Live research window"}
              style={{ animation: `armIn ${REACTOR_SCENE_MS}ms ease-out both` }}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    showHistory ? "text-slate-300" : "text-cyan-300/90"
                  }`}>
                    {showHistory ? "History" : "Under the hood"}
                  </div>
                  {showHistory && (
                    <span className="rounded-full border border-slate-500/40 bg-slate-500/15 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      archive
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-500">
                  {liveEvents.length} step{liveEvents.length === 1 ? "" : "s"}
                </div>
              </div>
              <BureauOpsStage
                events={liveEvents as any}
                compact
                maxScenes={showHistory ? 14 : 8}
                title=""
                onEdgeSwipe={(dir) => {
                  if (dir === "prev" && !showHistory) setShowHistory(true);
                  if (dir === "next" && showHistory) setShowHistory(false);
                }}
              />
              <div className={`mt-2 text-center text-[8px] font-mono uppercase tracking-wider ${
                showHistory ? "text-slate-500" : "text-slate-600"
              }`}>
                {showHistory ? "Swipe right or tap Live to return" : "Swipe left at start for history"}
              </div>
            </section>
          ) : (
            <div
              className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border px-6 text-center transition-colors duration-300 ${
                isLive
                  ? "border-cyan-400/20 bg-cyan-400/[0.03]"
                  : "border-dashed border-white/10 bg-white/[0.02]"
              }`}
              data-testid="panel-live-desk-idle"
            >
              <div className="relative mb-3">
                <Radio className={`h-8 w-8 ${isLive ? "text-cyan-400/80" : "text-slate-600"}`} />
                {isLive && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  </span>
                )}
              </div>
              <div className="text-[14px] font-medium text-slate-300">
                {isLive ? "Desk is live — first tool window incoming" : "Standby — no live tool scenes yet"}
              </div>
              <div className="mt-2 max-w-xs text-[12px] leading-relaxed text-slate-500">
                {isLive
                  ? "Atlas is running. The first search, page read, or extraction window will appear here as soon as a tool reports."
                  : "When Atlas runs, this window shows each tool as it works — search, page reads, extraction, contact recovery — so you can see progress while contacts arrive."}
              </div>
            </div>
          )}

          <p className="px-1 text-center text-[10px] leading-relaxed text-slate-600">
            Swipe or use arrows to step tools. Space pauses auto-advance. Each view matches the work: search, browser, domain, analyst.
          </p>
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