import React from "react";
import {
  Key,
  Radio,
  RefreshCw,
  History,
} from "lucide-react";
import { formatSchedulerCountdown, schedulerWaitRemaining } from "./scheduler-utils";
import { BureauOpsStage } from "./bureau-ops-stage";
import { useBureauLiveDesk } from "../lib/use-bureau-live";
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
    story?: string;
    actor?: string;
    methodKind?: string;
    sourceUrls?: string[];
    links?: Array<{ title?: string; url: string }>;
    caseUpdate?: string;
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
  // Job status only — never "Atlas idle" while header shows researching.
  // Integrity: no LIVE theater from lit scheme nodes when Atlas is idle/down
  const isLive = Boolean(
    atlasState && (atlasState.runStatus === "running" || atlasState.runStatus === "paused"),
  );
  const [showHistory, setShowHistory] = React.useState(false);
  const [jumpToLiveSignal, setJumpToLiveSignal] = React.useState(0);
  const [edgeHint, setEdgeHint] = React.useState<string | null>(null);
  // P2 desk arming — brief scaffold when a run first goes live
  const [arming, setArming] = React.useState(false);
  const [reachSettled, setReachSettled] = React.useState(false);
  /** Polite live-region message — discrete milestones only (WCAG 4.1.3) */
  const [statusAnnounce, setStatusAnnounce] = React.useState("");
  const lastAnnounceRef = React.useRef("");
  /** Phase N — history archive filter */
  type HistoryFilter = "all" | "live" | "done" | "failed";
  const [historyFilter, setHistoryFilter] = React.useState<HistoryFilter>("all");
  const [rateLimitDismissed, setRateLimitDismissed] = React.useState(false);
  /** Phase O — history text search */
  const [historyQuery, setHistoryQuery] = React.useState("");
  const [eventCountPulse, setEventCountPulse] = React.useState(false);
  const prevEventCountRef = React.useRef(0);
  const wasLiveRef = React.useRef(false);
  // QA: ?arming=1 holds arming scaffold; ?liveempty=1 skips auto-fill of mock scenes feel
  const forceArming = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("arming");
  const forceLiveEmpty = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("liveempty");

  React.useEffect(() => {
    if (forceArming) {
      setArming(true);
      return;
    }
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
  }, [isLive, forceArming]);


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

  const { deskEvents, latestNarration } = useBureauLiveDesk(atlasState?.eventLog as any, { enabled: true, pollMs: 8000, atlasLive: Boolean(isLive) });
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
  // Live desk: current target only; drop stale "done" windows; inject telemetry when bureau tail is old
  const liveEvents = React.useMemo(() => {
    if (showHistory) return filteredDeskEvents;
    // Idle / cancelled / failed / done: empty live strip — history is the archive
    if (!isLive) return [] as typeof deskEvents;
    const current =
      atlasState?.atlasTelemetry?.targetName
      || atlasState?.targetName
      || [...deskEvents].reverse().find((e: any) => e?.targetName && !/complete|done/i.test(String(e?.status || "")))?.targetName;
    const now = Date.now();
    let scoped = current
      ? deskEvents.filter((e: any) => !e?.targetName || e.targetName === current)
      : deskEvents;
    // While Atlas is live, ignore events older than 3 minutes so stale finished tool cards do not look current
    if (isLive) {
      scoped = scoped.filter((e: any) => {
        if (!e?.timestamp) return true;
        const ts = Date.parse(String(e.timestamp));
        if (!Number.isFinite(ts)) return true;
        return now - ts < 180_000;
      });
    }
    const out = scoped.slice(-6);
    // If live but desk only has finished/stale steps, surface the live phase as one active window
    const tel = atlasState?.atlasTelemetry as any;
    const allDone = out.length > 0 && out.every((e: any) => /complete|done|success/i.test(String(e?.status || "")));
    if (isLive && tel?.targetName && (out.length === 0 || allDone)) {
      out.push({
        timestamp: new Date().toISOString(),
        kind: "log",
        stage: tel.stage || atlasState?.detail || "Research",
        status: "active",
        targetName: tel.targetName,
        activeToolId: tel.activeToolId,
        toolIds: Array.isArray(tel.toolIds) ? tel.toolIds : [],
        inputSummary: tel.inputSummary,
        resultSummary: tel.resultSummary,
        story: tel.story || tel.inputSummary || tel.stage,
      } as any);
    }
    return out;
  }, [showHistory, filteredDeskEvents, deskEvents, atlasState?.atlasTelemetry, atlasState?.targetName, atlasState?.detail, isLive]);

  // Discrete polite announcements: arming → first scene → REACH (no per-tick spam)
  React.useEffect(() => {
    let msg = "";
    if (arming) msg = "Arming live desk";
    else if (hasReach && !reachSettled) msg = "Contact found. REACH route available";
    else if (hasReach && reachSettled) msg = "Contact route locked";
    else if (isLive && liveEvents.length === 1) msg = "First research step on desk";
    else if (isLive && liveEvents.length > 1) msg = `Open dig on live desk`;
    else if (showHistory) msg = "History archive open";
    else if (!isLive && atlasState?.runStatus === "done") msg = "Run complete";
    else if (!isLive && atlasState?.runStatus === "failed") msg = "Run failed";
    else if (!isLive && atlasState?.runStatus === "cancelled") msg = "Run stopped";
    else if (isLive) msg = "Live desk active";
    if (msg && msg !== lastAnnounceRef.current) {
      lastAnnounceRef.current = msg;
      setStatusAnnounce(msg);
    }
  }, [arming, hasReach, reachSettled, isLive, liveEvents.length, showHistory, atlasState?.runStatus]);



  React.useEffect(() => {
    const n = deskEvents.length;
    if (n > prevEventCountRef.current && prevEventCountRef.current > 0) {
      setEventCountPulse(true);
      const t = window.setTimeout(() => setEventCountPulse(false), 900);
      prevEventCountRef.current = n;
      return () => window.clearTimeout(t);
    }
    prevEventCountRef.current = n;
  }, [deskEvents.length]);

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
  const schedulerRemainingMs = schedulerWaitRemaining(
    typeof scheduler === "object" && scheduler ? (scheduler as any).nextTriggerAt ?? (scheduler as any).nextAt : scheduler,
  );
  const schedulerCountdown = formatSchedulerCountdown(schedulerRemainingMs);
  const waitingForNextCycle = Boolean(
    !isLive && schedulerRemainingMs > 0 && Boolean((scheduler as any)?.enabled),
  );
  const statusLabel = atlasState?.runStatus === "failed"
    ? "Failed"
    : atlasState?.runStatus === "cancelled"
      ? "Stopped"
      : atlasState?.runStatus === "done"
        ? waitingForNextCycle ? "Next cycle queued" : "Complete"
        : isLive
          ? "Active"
          : waitingForNextCycle ? "Next cycle queued" : "Nominal";
  const statusClass = atlasState?.runStatus === "failed"
    ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
    : atlasState?.runStatus === "cancelled"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : waitingForNextCycle
        ? "border-[#9CFF1A]/35 bg-[#9CFF1A]/10 text-[#d4ff8a]"
        : atlasState?.runStatus === "done"
          ? "border-[#9CFF1A]/35 bg-[#9CFF1A]/10 text-[#d4ff8a]"
          : isLive
            ? "border-[#9CFF1A]/30 bg-[#9CFF1A]/10 text-[#d4ff8a]"
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
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111827] font-sans text-stone-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Fallback tokens if parent did not inject KEYFRAMES */}
      <style>{REACTOR_CSS}</style>
      {/* Polite status — milestones only; assertive path uses role=alert on failure banners */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="status-desk-live"
        style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}
      >
        {statusAnnounce || (showHistory ? "History archive open" : isLive ? "Live desk" : "Desk standby")}
      </div>
      {/* Minimal chrome — target + live pulse only */}
      <header
        className="sticky top-0 z-20 shrink-0 overflow-visible border-b border-[#9CFF1A]/14 bg-[#111827]/95 px-3 py-2 backdrop-blur-md"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top, 10px))" }}
        data-testid="live-desk-sticky-chrome"
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${isLive ? "bg-[#9CFF1A] shadow-[0_0_8px_#9CFF1A]" : atlasState?.runStatus === "failed" ? "bg-rose-400" : atlasState?.runStatus === "cancelled" ? "bg-amber-400" : "bg-stone-600"}`}
                style={isLive && !prefersReducedMotion() ? { animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" } : undefined}
              />
              <button
                type="button"
                className={`text-[14px] font-bold uppercase tracking-[0.16em] ${isLive ? "text-[#d4ff8a]" : "text-stone-500"}`}
                onClick={() => {
                  setShowHistory(false);
                  setJumpToLiveSignal((n) => n + 1);
                }}
                data-testid="button-jump-to-live"
                aria-label="Jump to current live research step"
              >
                {isLive ? "Live" : statusLabel}
              </button>
              {showHistory && (
                <span className="rounded-full border border-stone-500/40 bg-stone-500/15 px-1.5 py-0.5 text-[12px] font-mono font-bold uppercase tracking-wider text-stone-300">
                  history
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[14px] font-semibold leading-snug text-stone-100" data-testid="status-reactor-summary">
              {atlasState?.atlasTelemetry?.targetName
                || atlasState?.currentEntities?.[0]
                || (isLive ? "Researching…" : "Atlas idle")}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-stone-500">
              {showHistory
                ? "Prior tool steps for this target"
                : isLive
                ? (liveLabel || livePhaseDetail || atlasState?.detail || "Working public sources")
                : waitingForNextCycle
                  ? `Next cycle in ${schedulerCountdown}`
                  : "Standby — launch from header or Overview"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showHistory) {
                setShowHistory(false);
                setJumpToLiveSignal((n) => n + 1);
              } else {
                setShowHistory(true);
              }
            }}
            className={`reactor-pressable flex h-10 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[14px] font-bold uppercase tracking-wider ${
              showHistory ? "border-[#9CFF1A]/40 bg-[#9CFF1A]/10 text-[#d4ff8a]" : "border-[#9CFF1A]/14 bg-[#0d1219] text-stone-400 hover:border-[#9CFF1A]/35"
            }`}
            data-testid="button-history"
            aria-pressed={showHistory}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            {showHistory ? "Live" : "Hist"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className="reactor-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9CFF1A]/14 bg-[#0d1219] text-stone-400 hover:border-[#9CFF1A]/35 hover:text-[#d4ff8a] disabled:pointer-events-none disabled:opacity-50"
            aria-label="Refresh Atlas status"
            data-testid="button-refresh-atlas"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
        {(atlasState?.atlasTelemetry?.disposition === "contact_route_found"
          || (atlasState?.atlasTelemetry?.contacts != null && atlasState.atlasTelemetry.contacts > 0)) && (
          <div
            className="reactor-reach mt-3 rounded-xl border px-3 py-2.5 shadow-[0_0_24px_rgba(156,255,26,0.2)]"
            data-testid="card-reach-contact-found"
            data-settled={reachSettled ? "true" : "false"}
            role="status"
            aria-live="polite"
            style={{ animation: motionOrNone(`reachIn ${REACTOR_CELEBRATE_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both`) }}
          >
            <div className="reactor-reach-label text-[14px] font-bold uppercase tracking-[0.16em]">
              {reachSettled ? "Contact route locked · REACH" : "Contact found · REACH"}
            </div>
            <div className="mt-1 text-[13px] leading-snug text-lime-50">
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
                  className="reactor-pressable mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#9CFF1A]/35 bg-[#9CFF1A]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#fef9c3] hover:border-[#b8ff4d]/60 hover:bg-[#9CFF1A]/15"
                >
                  Open in Profiles
                  <span className="font-mono text-[13px] opacity-70" aria-hidden>→</span>
                </a>
              );
            })()}
            <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="reach-provenance">
              <span className="rounded-full border border-[#9CFF1A]/25 bg-[#9CFF1A]/10 px-1.5 py-0.5 text-[12px] font-mono font-bold uppercase tracking-wider text-[#d4ff8a]/90">
                attributable
              </span>
              <span className="rounded-full border border-[#9CFF1A]/12 bg-white/[0.04] px-1.5 py-0.5 text-[12px] font-mono uppercase tracking-wider text-muted-foreground">
                public surface
              </span>
              {atlasState?.atlasTelemetry?.sources != null && (
                <span className="rounded-full border border-[#9CFF1A]/12 bg-white/[0.04] px-1.5 py-0.5 text-[12px] font-mono tabular-nums text-muted-foreground">
                  {atlasState.atlasTelemetry.sources} source{atlasState.atlasTelemetry.sources === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        )}
        {/* Compact telemetry chips — product density without clutter */}
        {(isLive || hasReach) && (
          <div
            className="mt-2.5 flex flex-wrap gap-1.5"
            data-testid="live-telemetry-chips"
            aria-label="Run metrics"
          >
            {[
              atlasState?.atlasTelemetry?.contacts != null
                ? { k: "Contacts", v: String(atlasState.atlasTelemetry.contacts), hot: true }
                : null,
              atlasState?.atlasTelemetry?.sources != null
                ? { k: "Sources", v: String(atlasState.atlasTelemetry.sources), hot: false }
                : null,
              atlasState?.atlasTelemetry?.evidence != null
                ? { k: "Evidence", v: String(atlasState.atlasTelemetry.evidence), hot: false }
                : null,
              atlasState?.atlasTelemetry?.stage
                ? { k: "Stage", v: String(atlasState.atlasTelemetry.stage).replace(/_/g, " "), hot: false }
                : null,
            ].filter(Boolean).map((chip: any) => (
              <div
                key={chip.k}
                className={`rounded-lg border px-2 py-1 ${
                  chip.hot
                    ? "border-[#9CFF1A]/30 bg-[#9CFF1A]/10"
                    : "border-[#9CFF1A]/12 bg-white/[0.03]"
                }`}
              >
                <div className={`text-[11px] font-mono uppercase tracking-wider ${chip.hot ? "text-[#d4ff8a]/80" : "text-stone-500"}`}>
                  {chip.k}
                </div>
                <div className={`text-[11px] font-semibold tabular-nums capitalize ${chip.hot ? "text-lime-50" : "text-stone-200"}`}>
                  {chip.v}
                </div>
              </div>
            ))}
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
          <div className="reactor-done-label text-[14px] font-bold uppercase">Run complete</div>
          <div className="mt-1 text-[12px] leading-snug text-lime-50/90">
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
          <div className="reactor-fail-label text-[14px] font-bold uppercase">Run failed</div>
          <div className="mt-1 text-[12px] leading-snug text-rose-50/90">
            {atlasState.detail || "Atlas could not finish this pass. Refresh or retry when keys and targets are ready."}
          </div>
        </div>
      )}
      {!isLive && atlasState?.runStatus === "cancelled" && (
        <div
          className="reactor-terminal-banner mx-3 mt-2 border border-amber-400/30 bg-amber-400/10"
          data-kind="cancelled"
          data-testid="banner-run-terminal"
          role="status"
          style={{ animation: motionOrNone(`terminalIn ${REACTOR_UI_MS}ms var(--reactor-ease, cubic-bezier(0.22,1,0.36,1)) both`) }}
        >
          <div className="text-[14px] font-bold uppercase text-amber-200">Stopped</div>
          <div className="mt-1 text-[12px] leading-snug text-amber-50/90">
            {atlasState.detail || "Operator stopped this run. Desk is idle — Launch when ready."}
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
              className="min-w-[72px] flex-1 rounded-lg border border-[#9CFF1A]/25 bg-[#9CFF1A]/[0.06] px-2.5 py-1.5"
            >
              <div className="text-[12px] font-mono font-bold uppercase tracking-wider text-lime-400/80">{x.k}</div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-lime-50">{x.v}</div>
            </div>
          ))}
        </div>
      )}


      {edgeHint && (
        <div
          role="status"
          className="sticky top-[52px] z-10 shrink-0 px-4 py-1.5 text-center text-[13px] font-mono uppercase tracking-wider text-[#d4ff8a] bg-[#9CFF1A]/15 border-b border-[#9CFF1A]/20 backdrop-blur-sm"
          style={{ animation: motionOrNone(`armIn ${REACTOR_UI_MS}ms ease-out both`) }}
        >
          {edgeHint}
        </div>
      )}
      {/* Primary: immersive tool window — what Atlas is doing right now */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        style={{ scrollPaddingTop: 72, WebkitOverflowScrolling: "touch" }}
        data-testid="live-desk-scroll"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pb-8">
          {arming ? (
            <section
              className="rounded-2xl border border-[#9CFF1A]/35 bg-[#111827] p-3 shadow-[0_0_48px_rgba(156,255,26,0.12)]"
              data-testid="panel-live-desk-arming"
              aria-busy="true"
              aria-label="Arming live desk"
              style={{ animation: motionOrNone(`armIn ${REACTOR_ARM_MS}ms ease-out both`) }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#9CFF1A] opacity-60" style={{ animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`) }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
                  </span>
                  <div className="text-[14px] font-bold uppercase tracking-[0.2em] text-[#d4ff8a]/90">Arming desk…</div>
                </div>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-[#9CFF1A]/70"
                    style={{
                      width: "55%",
                      animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                    }}
                  />
                </div>
              </div>
              {/* Tool-shaped window — first frame of a live run */}
              <div className="overflow-hidden rounded-xl border border-[#9CFF1A]/15 bg-[#0d1219] shadow-[inset_0_1px_0_rgba(156,255,26,0.06)]">
                <div className="flex items-center gap-2 border-b border-[#9CFF1A]/10 px-3 py-2">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#9CFF1A]/30 bg-[#9CFF1A]/15 font-mono text-[12px] font-bold text-[#d4ff8a]">
                    BX
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[14px] text-stone-200">Bureau channels</div>
                    <div className="truncate font-mono text-[12px] uppercase tracking-wider text-stone-500">Search · Registry · Extract · Fetch</div>
                  </div>
                  <div className="h-1.5 w-12 overflow-hidden rounded bg-stone-800">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "linear-gradient(90deg,transparent,rgba(156,255,26,.45),transparent)",
                        animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                      }}
                    />
                  </div>
                </div>
                <div className="border-b border-[#9CFF1A]/08 px-3 py-1.5">
                  <div className="text-[12px] font-mono uppercase tracking-[0.16em] text-[#9CFF1A]/80">Powering research lanes</div>
                </div>
                {/* Prompt / search line placeholder */}
                <div className="border-b border-[#9CFF1A]/08 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#9CFF1A]/50" />
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded bg-stone-800/90">
                      <div
                        className="absolute inset-y-0 left-0 w-1/3"
                        style={{
                          background: "linear-gradient(90deg,transparent,rgba(156,255,26,.25),transparent)",
                          animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Metric cards — decorative while arming */}
                <div className="grid grid-cols-2 gap-2 p-3" aria-hidden="true">
                  <div className="rounded-lg border border-[#9CFF1A]/10 bg-[#0d1219]/90 p-2.5">
                    <div className="text-[12px] font-mono uppercase tracking-wider text-stone-500">Sources</div>
                    <div className="mt-1.5 h-3.5 w-10 rounded bg-stone-700/70" />
                  </div>
                  <div className="rounded-lg border border-[#9CFF1A]/10 bg-[#0d1219]/90 p-2.5">
                    <div className="text-[12px] font-mono uppercase tracking-wider text-stone-500">Findings</div>
                    <div className="mt-1.5 h-3.5 w-8 rounded bg-stone-700/50" />
                  </div>
                </div>
                {/* Result line ghosts — decorative */}
                <div className="space-y-1.5 border-t border-[#9CFF1A]/08 px-3 py-2.5" aria-hidden="true">
                  <div className="h-2 w-full rounded bg-stone-800/80" />
                  <div className="h-2 w-4/5 rounded bg-stone-800/60" style={{ width: "80%" }} />
                  <div className="h-2 w-2/3 rounded bg-stone-800/40" style={{ width: "62%" }} />
                </div>
              </div>
            </section>
          ) : liveEvents.length > 0 && !forceLiveEmpty ? (
            <section
              key={showHistory ? "history" : "live"}
              className={`flex h-[min(58vh,420px)] flex-col overflow-hidden rounded-2xl border p-3 ${
                showHistory
                  ? "reactor-archive-panel border-stone-500/35"
                  : "border-[#9CFF1A]/25 bg-[#111827] shadow-[0_0_48px_rgba(240,180,41,0.1)]"
              }`}
              data-testid="panel-live-desk-mobile"
              aria-label={showHistory ? "Target history archive" : "Live research window"}
              data-mode={showHistory ? "archive" : "live"}
              style={{ animation: motionOrNone(`armIn ${REACTOR_SCENE_MS}ms ease-out both`) }}
            >
              <div className="mb-3 space-y-2 px-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`text-[14px] font-bold uppercase tracking-[0.2em] ${
                      showHistory ? "text-stone-300" : "text-[#d4ff8a]/90"
                    }`}>
                      {showHistory ? "History" : "Live activity"}
                    </div>
                    {showHistory && (
                      <span className="rounded-full border border-stone-400/50 bg-stone-500/20 px-1.5 py-0.5 text-[12px] font-mono font-bold uppercase tracking-wider text-stone-200">
                        archive
                      </span>
                    )}
                    {!showHistory && isLive && (
                      <span className="rounded-full border border-[#9CFF1A]/30 bg-[#9CFF1A]/10 px-1.5 py-0.5 text-[12px] font-mono font-bold uppercase tracking-wider text-[#d4ff8a]">
                        live
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[14px] font-mono tabular-nums transition-colors ${
                      eventCountPulse ? "text-[#d4ff8a]" : "text-stone-500"
                    }`}
                    data-testid="mobile-step-count"
                    style={eventCountPulse ? { textShadow: "0 0 10px rgba(156,255,26,0.45)" } : undefined}
                  >
                    {showHistory
                      ? `${liveEvents.length} archived`
                      : isLive
                        ? `${liveEvents.length} open`
                        : `${liveEvents.length}`}
                    {eventCountPulse && isLive && !showHistory ? " · new" : ""}
                  </div>
                </div>
                {!showHistory && liveEvents.length > 1 && (
                  <div
                    className="h-0.5 w-full overflow-hidden rounded-full bg-stone-800"
                    aria-hidden
                    data-testid="live-step-rail"
                  >
                    <div
                      className="h-full rounded-full bg-[#9CFF1A]/70 transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.round((liveEvents.length / Math.max(liveEvents.length, 1)) * 100))}%` }}
                    />
                  </div>
                )}
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
                    className="w-full rounded-lg border border-[#9CFF1A]/12 bg-[#0d1219]/90 px-3 py-2 text-[12px] text-stone-200 outline-none placeholder:text-muted-foreground/60 focus-visible:border-[#9CFF1A]/50 focus-visible:ring-1 focus-visible:ring-lime-400/40"
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
                        className={`reactor-pressable min-h-[32px] rounded-full border px-2.5 py-1 text-[14px] font-mono font-bold uppercase tracking-wider transition-colors ${
                          selected
                            ? "border-[#9CFF1A]/50 bg-[#9CFF1A]/15 text-[#d4ff8a]"
                            : "border-[#9CFF1A]/12 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-stone-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              {showHistory && deskEvents.length > 0 && liveEvents.length === 0 && (
                <div className="mb-3 rounded-lg border border-dashed border-[#9CFF1A]/15 bg-[#0d1219]/50 px-3 py-3 text-center text-[11px] text-muted-foreground" data-testid="history-filter-empty">
                  {historyQuery.trim() ? `No steps match “${historyQuery.trim()}”.` : `No ${historyFilter} steps in this archive. Try All.`}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {latestNarration && !showHistory && (
                  <div
                    className="mb-2 rounded-xl border border-violet-400/40 bg-violet-950/50 px-3 py-2.5 text-[12px] leading-snug text-violet-50"
                    data-testid="mobile-desk-right-hand-strip"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="mb-1 block font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-violet-200">Right-hand · under the hood</span>
                    {latestNarration}
                  </div>
                )}
                <BureauOpsStage
                  events={liveEvents as any}
                  compact
                  maxScenes={showHistory ? 16 : 12}
                  title=""
                  jumpToLiveSignal={jumpToLiveSignal}
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
              </div>
            </section>
          ) : (
            <div
              className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border px-6 text-center transition-colors duration-300 ${
                isLive
                  ? "border-[#9CFF1A]/30 bg-[#9CFF1A]/[0.05]"
                  : showHistory
                    ? "reactor-archive-panel border-stone-500/30"
                    : "border-dashed border-[#9CFF1A]/12 bg-white/[0.02]"
              }`}
              data-testid="panel-live-desk-idle"
              aria-live="polite"
            >
              <div className="relative mb-3">
                <Radio className={`h-8 w-8 ${isLive ? "text-lime-400/80" : "text-muted-foreground/60"}`} />
                {isLive && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9CFF1A] opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#9CFF1A]" />
                  </span>
                )}
              </div>
              <div className="text-[14px] font-medium text-stone-300">
                {isLive
                  ? "Desk is live — waiting for the first search or page"
                  : showHistory
                    ? "Archive empty for this target"
                    : atlasState?.runStatus === "done"
                      ? "Run complete — no tool scenes buffered"
                      : atlasState?.runStatus === "failed"
                        ? "Run failed — no tool scenes to show"
                        : atlasState?.runStatus === "cancelled"
                          ? "Stopped — no live tool scenes"
                          : "Standby — no live tool scenes yet"}
              </div>
              <div className="mt-2 max-w-xs text-[12px] leading-relaxed text-stone-500">
                {isLive
                  ? "Atlas is running. Tool windows and right-hand live narration will appear as each step happens."
                  : showHistory
                    ? "When Atlas runs, every search, page read, extraction, and right-hand narration for this target is archived here."
                    : atlasState?.runStatus === "done"
                      ? "Summary metrics are above. Open History after the next run to review each tool step."
                      : "When Atlas runs, each line starts with Now or Done so you can see the work at a glance."}
              </div>
              {(isLive || forceLiveEmpty) && (
                <div
                  className="mt-5 w-full max-w-[280px] overflow-hidden rounded-xl border border-[#9CFF1A]/20 bg-[#0d1219]/90"
                  data-testid="panel-live-empty-scaffold"
                  aria-hidden
                >
                  <div className="flex items-center gap-2 border-b border-[#9CFF1A]/10 px-3 py-1.5">
                    <div className="grid h-5 w-5 place-items-center rounded border border-[#9CFF1A]/25 bg-[#9CFF1A]/10 font-mono text-[11px] font-bold text-[#d4ff8a]">
                      BX
                    </div>
                    <span className="truncate font-mono text-[12px] text-stone-400">Listening for bureau steps…</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="h-2 w-full overflow-hidden rounded bg-stone-800/80">
                      <div
                        className="h-full w-1/2 rounded"
                        style={{
                          background: "linear-gradient(90deg,transparent,rgba(156,255,26,.35),transparent)",
                          animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-[#9CFF1A]/08 bg-[#0d1219]/70 p-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">Sources</div>
                        <div className="mt-1 h-3 w-8 rounded bg-stone-700/50" />
                      </div>
                      <div className="rounded-lg border border-[#9CFF1A]/08 bg-[#0d1219]/70 p-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">Findings</div>
                        <div className="mt-1 h-3 w-6 rounded bg-stone-700/40" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="px-1 text-center font-mono text-[12px] uppercase tracking-wider text-stone-600">
            {showHistory ? "Tap Live · swipe activity" : "Swipe activity · Hist for archive"}
          </p>
        </div>
      </div>


      {exhaustedKeys.length > 0 && !rateLimitDismissed && (
        <div className="shrink-0 border-t border-[#9CFF1A]/30 bg-[#1a1508] px-4 py-2.5" role="alert" data-testid="alert-provider-rate-limit">
          <div className="flex items-start gap-2">
            <Key className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9CFF1A]" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold uppercase leading-4 tracking-wider text-[#d4ff8a]">
                Provider rate limit
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#fef3c7]/90">
                Atlas is rotating configured keys and will keep working. Fresh quota usually returns within the provider window.
                <span className="text-[#d4ff8a]/80"> · {exhaustedKeys.slice(0, 4).join(", ")}{exhaustedKeys.length > 4 ? ` +${exhaustedKeys.length - 4}` : ""}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="reactor-pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#9CFF1A]/40 bg-[#9CFF1A]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#fef3c7] hover:bg-[#9CFF1A]/15"
                  onClick={() => onRefresh()}
                  disabled={syncing}
                  data-testid="button-rate-limit-refresh"
                >
                  <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} aria-hidden />
                  Check status
                </button>
                <button
                  type="button"
                  className="reactor-pressable inline-flex min-h-[36px] items-center rounded-lg border border-[#9CFF1A]/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-stone-300 hover:border-white/20"
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