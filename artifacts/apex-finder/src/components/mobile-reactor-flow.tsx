import React from "react";
import {
  Key,
  Radio,
  RefreshCw,
  History,
} from "lucide-react";
import { formatSchedulerCountdown, schedulerWaitRemaining } from "./scheduler-utils";
import { BureauOpsStage } from "./bureau-ops-stage";
import { REACTOR_ARM_MS, REACTOR_CSS, REACTOR_CELEBRATE_MS, REACTOR_SHIMMER_MS, REACTOR_SCENE_MS, REACTOR_UI_MS, motionOrNone, prefersReducedMotion } from "../lib/reactor-motion";

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
  const [edgeHint, setEdgeHint] = React.useState<string | null>(null);
  // P2 desk arming — brief scaffold when a run first goes live
  const [arming, setArming] = React.useState(false);
  const [reachSettled, setReachSettled] = React.useState(false);
  /** Phase N — history archive filter */
  type HistoryFilter = "all" | "live" | "done" | "failed";
  const [historyFilter, setHistoryFilter] = React.useState<HistoryFilter>("all");
  const [rateLimitDismissed, setRateLimitDismissed] = React.useState(false);
  /** Phase O — history text search */
  const [historyQuery, setHistoryQuery] = React.useState("");
  const wasLiveRef = React.useRef(false);
  React.useEffect(() => {
    if (isLive && !wasLiveRef.current) {
      wasLiveRef.current = true;
      if (prefersReducedMotion()) {
        setArming(false);
        return;
      }
      setArming(true);
      const t = window.setTimeout(() => setArming(false), REACTOR_ARM_MS);
      return () => clearTimeout(t);
    }
    if (!isLive) {
      wasLiveRef.current = false;
      setArming(false);
    }
  }, [isLive]);


  // Phase K — REACH one-shot then soft settle (celebrate once, then quiet)
  const hasReach =
    atlasState?.atlasTelemetry?.disposition === "contact_route_found"
    || (atlasState?.atlasTelemetry?.contacts != null && atlasState.atlasTelemetry.contacts > 0);
  React.useEffect(() => {
    if (!hasReach) {
      setReachSettled(false);
      return;
    }
    setReachSettled(false);
    if (prefersReducedMotion()) {
      setReachSettled(true);
      return;
    }
    const t = window.setTimeout(() => setReachSettled(true), REACTOR_CELEBRATE_MS + 40);
    return () => window.clearTimeout(t);
  }, [hasReach, atlasState?.atlasTelemetry?.disposition, atlasState?.atlasTelemetry?.contacts]);

  // Keyboard handlers registered after deskEvents (Phase O)


  React.useEffect(() => {
    if (!showHistory) {
      setHistoryFilter("all");
      setHistoryQuery("");
    }
  }, [showHistory]);

  React.useEffect(() => {
    setRateLimitDismissed(false);
  }, [exhaustedKeys.join("|")]);

  const deskEvents = atlasState?.eventLog ?? [];
  // Live strip = recent; History = full target action list (optional status filter)
  const filteredDeskEvents = React.useMemo(() => {
    let list = deskEvents;
    if (showHistory && historyFilter !== "all") {
      list = list.filter((e) => {
        const s = String(e.status || "").toLowerCase();
        if (historyFilter === "live") return !/complete|done|success|fail|error|blocked/i.test(s);
        if (historyFilter === "done") return /complete|done|success/i.test(s);
        if (historyFilter === "failed") return /fail|error|blocked/i.test(s);
        return true;
      });
    }
    const q = historyQuery.trim().toLowerCase();
    if (showHistory && q) {
      list = list.filter((e) => {
        const blob = [
          e.stage, e.status, e.targetName, e.activeToolId,
          e.prompt, e.inputSummary, e.resultSummary, e.raw,
          ...(e.toolIds || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [deskEvents, showHistory, historyFilter, historyQuery]);
  const liveEvents = showHistory ? filteredDeskEvents : deskEvents.slice(-6);

  // Keyboard: Escape returns from History; "/" focuses history search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showHistory) {
        e.preventDefault();
        setShowHistory(false);
        return;
      }
      if (e.key === "/" && showHistory && deskEvents.length > 0) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        document.getElementById("history-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHistory, deskEvents.length]);
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
      <div className="sr-only" aria-live="polite" data-testid="status-desk-mode" style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}>
        {showHistory ? "History archive open" : isLive ? "Live desk" : "Desk standby"}
      </div>
      {/* Minimal chrome — target + live pulse only */}
      <header
        className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md"
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
            className={`reactor-pressable flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[10px] font-bold uppercase tracking-wider ${
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
            className="reactor-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50 disabled:pointer-events-none"
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
            data-settled={reachSettled ? "true" : "false"}
            role="status"
            aria-live="polite"
            style={{ animation: motionOrNone(`reachIn ${REACTOR_CELEBRATE_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both`) }}
          >
            <div className="reactor-reach-label text-[10px] font-bold uppercase tracking-[0.16em]">
              {reachSettled ? "Contact route locked · REACH" : "Contact found · REACH"}
            </div>
            <div className="mt-1 text-[13px] leading-snug text-emerald-50">
              {atlasState?.atlasTelemetry?.resultSummary
                || `${atlasState?.atlasTelemetry?.contacts} attributable vector(s)`}
            </div>
            {(() => {
              const q = (
                atlasState?.atlasTelemetry?.targetName
                || atlasState?.currentEntities?.[0]
                || ""
              ).trim();
              if (!q) return null;
              const href = `/profiles?q=${encodeURIComponent(q)}`;
              return (
                <a
                  href={href}
                  data-testid="link-reach-open-profile"
                  className="reactor-pressable mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/15"
                >
                  Open in Profiles
                  <span className="font-mono text-[9px] opacity-70" aria-hidden>→</span>
                </a>
              );
            })()}
          </div>
        )}
      </header>


      {/* Phase K — terminal run state (done / failed) — clear end of wait without looking live */}
      {!isLive && atlasState?.runStatus === "done" && (
        <div
          className="reactor-terminal-banner mx-3 mt-2 border"
          data-kind="done"
          data-testid="banner-run-terminal"
          role="status"
          style={{ animation: motionOrNone(`terminalIn ${REACTOR_UI_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both`) }}
        >
          <div className="reactor-done-label text-[10px] font-bold uppercase">Run complete</div>
          <div className="mt-1 text-[12px] leading-snug text-emerald-50/90">
            {atlasState.detail || atlasState.phaseLabel || "Atlas finished this target. Review tools below or open History."}
          </div>
        </div>
      )}
      {!isLive && atlasState?.runStatus === "failed" && (
        <div
          className="reactor-terminal-banner mx-3 mt-2 border"
          data-kind="failed"
          data-testid="banner-run-terminal"
          role="alert"
          style={{ animation: motionOrNone(`terminalIn ${REACTOR_UI_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both`) }}
        >
          <div className="reactor-fail-label text-[10px] font-bold uppercase">Run failed</div>
          <div className="mt-1 text-[12px] leading-snug text-rose-50/90">
            {atlasState.detail || "Atlas could not finish this pass. Refresh or retry when keys and targets are ready."}
          </div>
        </div>
      )}

      {/* Phase L — run-complete summary strip */}
      {!isLive && atlasState?.runStatus === "done" && (
        <div
          className="mx-3 mt-2 flex flex-wrap gap-2"
          data-testid="strip-run-summary"
          aria-label="Run summary"
        >
          {[
            { k: "Contacts", v: atlasState.atlasTelemetry?.contacts },
            { k: "Sources", v: atlasState.atlasTelemetry?.sources },
            { k: "Evidence", v: atlasState.atlasTelemetry?.evidence },
            { k: "Phase", v: atlasState.phaseTotal ? `${atlasState.phase}/${atlasState.phaseTotal}` : atlasState.phase },
          ].filter((x) => x.v != null && x.v !== "").map((x) => (
            <div
              key={x.k}
              className="min-w-[72px] flex-1 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-2.5 py-1.5"
            >
              <div className="text-[8px] font-mono font-bold uppercase tracking-wider text-emerald-400/80">{x.k}</div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-emerald-50">{x.v}</div>
            </div>
          ))}
        </div>
      )}


      {edgeHint && (
        <div
          role="status"
          className="sticky top-[52px] z-10 shrink-0 px-4 py-1.5 text-center text-[9px] font-mono uppercase tracking-wider text-cyan-200 bg-cyan-400/15 border-b border-cyan-400/20 backdrop-blur-sm"
          style={{ animation: "armIn 220ms ease-out both" }}
        >
          {edgeHint}
        </div>
      )}
      {/* Primary: immersive tool window — what Atlas is doing right now */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        style={{ scrollPaddingTop: 8, WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pb-8">
          {arming ? (
            <section
              className="rounded-2xl border border-cyan-400/25 bg-[#071018] p-3 shadow-[0_0_40px_rgba(34,211,238,0.06)]"
              data-testid="panel-live-desk-arming"
              aria-busy="true"
              aria-label="Arming live desk"
              style={{ animation: motionOrNone(`armIn ${REACTOR_ARM_MS}ms ease-out both`) }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">Arming desk…</div>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400/60"
                    style={{
                      width: "40%",
                      animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                    }}
                  />
                </div>
              </div>
              {/* Tool-shaped window chrome */}
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1220]">
                <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                  <div className="ml-1 flex h-5 flex-1 items-center overflow-hidden rounded bg-slate-800/90 px-2">
                    <span className="truncate text-[9px] font-mono text-slate-500">atlas://desk/arming…</span>
                    <div
                      className="ml-auto h-2 w-8 overflow-hidden rounded bg-slate-700"
                    >
                      <div
                        className="h-full w-full"
                        style={{
                          background: "linear-gradient(90deg,transparent,rgba(34,211,238,.35),transparent)",
                          animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Prompt / search line placeholder */}
                <div className="border-b border-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-cyan-400/40" />
                    <div className="h-2.5 flex-1 rounded bg-slate-800/80" />
                  </div>
                </div>
                {/* Two metric cards */}
                <div className="grid grid-cols-2 gap-2 p-3">
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-2.5">
                    <div className="h-2 w-10 rounded bg-slate-700/80" />
                    <div className="mt-2 h-4 w-8 rounded bg-slate-700/50" />
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-900/60 p-2.5">
                    <div className="h-2 w-12 rounded bg-slate-700/80" />
                    <div className="mt-2 h-4 w-6 rounded bg-slate-700/50" />
                  </div>
                </div>
              </div>
            </section>
          ) : liveEvents.length > 0 ? (
            <section
              key={showHistory ? "history" : "live"}
              className={`rounded-2xl border p-3 ${
                showHistory
                  ? "reactor-archive-panel border-slate-500/35"
                  : "border-cyan-400/25 bg-[#071018] shadow-[0_0_40px_rgba(34,211,238,0.06)]"
              }`}
              data-testid="panel-live-desk-mobile"
              aria-label={showHistory ? "Target history archive" : "Live research window"}
              data-mode={showHistory ? "archive" : "live"}
              style={{ animation: motionOrNone(`armIn ${REACTOR_SCENE_MS}ms ease-out both`) }}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    showHistory ? "text-slate-300" : "text-cyan-300/90"
                  }`}>
                    {showHistory ? "History archive" : "Under the hood"}
                  </div>
                  {showHistory && (
                    <span className="rounded-full border border-slate-400/50 bg-slate-500/20 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-slate-200">
                      archive
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-500">
                  {liveEvents.length} step{liveEvents.length === 1 ? "" : "s"}
                </div>
              </div>
              {showHistory && deskEvents.length > 0 && (
                <div className="mb-2">
                  <label className="sr-only" htmlFor="history-search-input">Search history steps</label>
                  <input
                    id="history-search-input"
                    data-testid="input-history-search"
                    type="search"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Search tools, results…"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}
              {showHistory && deskEvents.length > 0 && (
                <div
                  className="mb-3 flex flex-wrap gap-1.5"
                  role="tablist"
                  aria-label="Filter history steps"
                  data-testid="history-filter-chips"
                >
                  {([
                    ["all", "All"],
                    ["live", "Live"],
                    ["done", "Done"],
                    ["failed", "Failed"],
                  ] as const).map(([id, label]) => {
                    const selected = historyFilter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setHistoryFilter(id)}
                        className={`reactor-pressable min-h-[32px] rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                          selected
                            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                            : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              {showHistory && deskEvents.length > 0 && liveEvents.length === 0 && (
                <div className="mb-3 rounded-lg border border-dashed border-slate-600/40 bg-slate-900/40 px-3 py-3 text-center text-[11px] text-slate-400" data-testid="history-filter-empty">
                  {historyQuery.trim() ? `No steps match “${historyQuery.trim()}”.` : `No ${historyFilter} steps in this archive. Try All.`}
                </div>
              )}
              <BureauOpsStage
                events={liveEvents as any}
                compact
                maxScenes={showHistory ? 14 : 8}
                title=""
                onEdgeSwipe={(dir) => {
                  if (dir === "prev" && !showHistory) {
                    setShowHistory(true);
                    setEdgeHint("Opened history archive");
                    window.setTimeout(() => setEdgeHint(null), 1800);
                  }
                  if (dir === "next" && showHistory) {
                    setShowHistory(false);
                    setEdgeHint("Back to live desk");
                    window.setTimeout(() => setEdgeHint(null), 1800);
                  }
                }}
              />
              <div className={`mt-2 text-center text-[9px] font-mono uppercase tracking-wider ${
                showHistory ? "text-slate-400" : "text-slate-500"
              }`}>
                {showHistory ? "Swipe right or tap Live to return" : "Swipe left at start for history"}
              </div>
            </section>
          ) : (
            <div
              className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border px-6 text-center transition-colors duration-300 ${
                isLive
                  ? "border-cyan-400/30 bg-cyan-400/[0.05]"
                  : showHistory
                    ? "reactor-archive-panel border-slate-500/30"
                    : "border-dashed border-white/10 bg-white/[0.02]"
              }`}
              data-testid="panel-live-desk-idle"
              aria-live="polite"
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
                {isLive
                  ? "Desk is live — first tool window incoming"
                  : showHistory
                    ? "Archive empty for this target"
                    : atlasState?.runStatus === "done"
                      ? "Run complete — no tool scenes buffered"
                      : atlasState?.runStatus === "failed"
                        ? "Run failed — no tool scenes to show"
                        : "Standby — no live tool scenes yet"}
              </div>
              <div className="mt-2 max-w-xs text-[12px] leading-relaxed text-slate-500">
                {isLive
                  ? "Atlas is running. The first search, page read, or extraction window will appear here as soon as a tool reports."
                  : showHistory
                    ? "When Atlas runs, every search, page read, and extraction for this target is archived here for review."
                    : atlasState?.runStatus === "done"
                      ? "Summary metrics are above. Open History after the next run to review each tool step."
                      : "When Atlas runs, this window shows each tool as it works — search, page reads, extraction, contact recovery — so you can see progress while contacts arrive."}
              </div>
              {isLive && (
                <div className="mt-5 w-full max-w-[260px] space-y-2 opacity-60" aria-hidden>
                  <div className="h-2 w-full overflow-hidden rounded bg-slate-800/80">
                    <div
                      className="h-full w-1/2 rounded"
                      style={{
                        background: "linear-gradient(90deg,transparent,rgba(34,211,238,.3),transparent)",
                        animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 rounded-lg border border-white/5 bg-slate-900/50" />
                    <div className="h-8 flex-1 rounded-lg border border-white/5 bg-slate-900/50" />
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="px-1 text-center text-[10px] leading-relaxed text-slate-400">
            Swipe or arrows step tools · Space pauses · edge-swipe opens history. Views match the work: search, browser, domain, analyst.
          </p>
        </div>
      </div>


      {exhaustedKeys.length > 0 && !rateLimitDismissed && (
        <div className="shrink-0 border-t border-amber-500/30 bg-amber-950/35 px-4 py-2.5" role="alert" data-testid="alert-provider-rate-limit">
          <div className="flex items-start gap-2">
            <Key className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase leading-4 tracking-wider text-amber-300">
                Provider rate limit
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-amber-100/90">
                Atlas is rotating configured keys and will keep working. Fresh quota usually returns within the provider window.
                <span className="text-amber-200/80"> · {exhaustedKeys.slice(0, 4).join(", ")}{exhaustedKeys.length > 4 ? ` +${exhaustedKeys.length - 4}` : ""}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="reactor-pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/15"
                  onClick={() => onRefresh()}
                  disabled={syncing}
                  data-testid="button-rate-limit-refresh"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} aria-hidden />
                  Check status
                </button>
                <button
                  type="button"
                  className="reactor-pressable inline-flex min-h-[36px] items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:border-white/20"
                  onClick={() => setRateLimitDismissed(true)}
                  data-testid="button-rate-limit-dismiss"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}