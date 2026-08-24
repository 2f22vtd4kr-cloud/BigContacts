import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ChevronDown, ExternalLink, Loader2, Radio, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { fetchSystemStatus, summarizeApiKeys, type SystemStatus } from "@/lib/system-status";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL_MS = 45_000;

type AtlasStatus = {
  status?: string;
  active?: boolean;
  message?: string;
  jobId?: string;
  atlasPhase?: number;
  atlasPhaseTotal?: number;
  progress?: number;
  scheduler?: {
    enabled?: boolean;
    active?: boolean;
    nextTriggerAt?: string;
    lastStatus?: string;
    lastMessage?: string;
    cycles?: number;
  } | null;
  phaseJ?: { status?: string; progress?: number; total?: number; message?: string } | null;
};

type WorkspaceState = "loading" | "researching" | "researching-degraded" | "queued" | "ready" | "degraded" | "offline";

const STATE_COPY: Record<WorkspaceState, {
  label: string;
  /** Mobile header chip — must fit without truncating mid-word */
  shortLabel: string;
  detail: string;
  className: string;
  dotClassName: string;
}> = {
  loading: {
    label: "CHECKING WORKSPACE",
    shortLabel: "CHECK",
    detail: "Checking whether Atlas and services are online…",
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground/60",
  },
  researching: {
    label: "ATLAS RESEARCHING",
    shortLabel: "LIVE",
    detail: "Live research is running on a target.",
    className: "text-lime-300",
    dotClassName: "bg-lime-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]",
  },
  "researching-degraded": {
    label: "ATLAS LIVE · LIMITED",
    shortLabel: "LIVE",
    detail: "Research is running; some AI/search keys are rate-limited or offline.",
    className: "text-[#d4ff8a]",
    dotClassName: "bg-[#9CFF1A] shadow-[0_0_8px_rgba(156,255,26,0.55)]",
  },
  queued: {
    label: "ATLAS STANDBY",
    shortLabel: "QUEUE",
    detail: "Next research cycle is queued.",
    className: "text-[#d4ff8a]",
    dotClassName: "bg-[#9CFF1A] shadow-[0_0_8px_rgba(156,255,26,0.55)]",
  },
  ready: {
    label: "WORKSPACE READY",
    shortLabel: "READY",
    detail: "Services are healthy. Atlas is ready to research.",
    className: "text-primary",
    dotClassName: "bg-primary shadow-[0_0_8px_rgba(96,165,250,0.65)]",
  },
  degraded: {
    label: "WORKSPACE DEGRADED",
    shortLabel: "WARN",
    detail: "App is up, but one or more research services need attention.",
    className: "text-[#d4ff8a]",
    dotClassName: "bg-[#9CFF1A] shadow-[0_0_8px_rgba(156,255,26,0.55)]",
  },
  offline: {
    label: "WORKSPACE OFFLINE",
    shortLabel: "OFF",
    detail: "Could not reach the API. Check connection or server status.",
    className: "text-destructive",
    dotClassName: "bg-destructive shadow-[0_0_8px_rgba(248,113,113,0.55)]",
  },
};

function formatNextCycle(timestamp?: string): string | null {
  if (!timestamp) return null;
  const remaining = Date.parse(timestamp) - Date.now();
  if (remaining <= 0) return "starting soon";
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  if (minutes < 1) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function phaseLabel(atlas: AtlasStatus | null): string {
  if (!atlas?.active) return "No active target";
  const phase = Number(atlas.atlasPhase ?? atlas.progress ?? 0);
  // Open-ended — never paint a fixed dig plan denominator
  if (!Number.isFinite(phase) || phase <= 0) return "Live research";
  return `Phase ${phase}`;
}

export function WorkspaceStatus() {
  const [atlas, setAtlas] = useState<AtlasStatus | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const refresh = async () => {
      const [atlasResult, systemResult] = await Promise.allSettled([
        fetch(`${BASE}/api/ingest/atlas-status`, { cache: "no-store", signal: controller.signal }),
        fetchSystemStatus(BASE, controller.signal),
      ]);
      if (!mounted) return;
      let nextError = true;
      if (atlasResult.status === "fulfilled" && atlasResult.value.ok) {
        try {
          const body = await atlasResult.value.text();
          const trimmed = body.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            setAtlas(JSON.parse(trimmed) as AtlasStatus);
            nextError = false;
          }
        } catch {
          /* HTML/proxy error body — stay degraded, never throw into overlay */
        }
      }
      if (systemResult.status === "fulfilled") {
        setSystem(systemResult.value);
        nextError = false;
      }
      setError(nextError);
      setLoading(false);
    };
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const summary = summarizeApiKeys(system);
  const upstashHealthy = Boolean(
    system?.databases.upstash.length &&
    system.databases.upstash.every((slot) => slot.status === "ready" || slot.status === "ok"),
  );
  const localRedisHealthy = Boolean(
    system?.databases.localRedis.status === "ready" || system?.databases.localRedis.status === "ok",
  );
  // Permanent Upstash is enough for bureau jobs; local Redis is optional cache on Replit.
  const servicesHealthy = Boolean(
    system?.databases.postgres.status === "ok" &&
    (upstashHealthy || localRedisHealthy),
  );
  const active = Boolean(
    atlas?.active ||
    atlas?.status === "running" ||
    atlas?.status === "paused"
  );
  const schedulerEnabled = Boolean(atlas?.scheduler?.enabled);
  const schedulerActive = Boolean(atlas?.scheduler?.active);
  const noAiCapacity = Boolean(system && summary.configured > 0 && summary.active === 0);
  // Only treat keys as "degraded" when every configured slot is cooling — partial
  // rate-limits while some keys are still LIVE should not WARN the whole desk.
  const allKeysCooling = Boolean(
    summary.configured > 0 && summary.active === 0 && summary.rateLimited >= summary.configured,
  );
  const providerDegraded = allKeysCooling || noAiCapacity;
  const state: WorkspaceState = loading && !atlas && !system
    ? "loading"
    : error && !atlas && !system
      ? "offline"
      : active
        ? // Job running: never show generic WARN — use LIVE / LIVE·LTD
          providerDegraded
            ? "researching-degraded"
            : "researching"
        : schedulerEnabled && schedulerActive
          ? "queued"
          : !servicesHealthy || providerDegraded
            ? "degraded"
            : "ready";
  const copy = STATE_COPY[state];
  const Icon = state === "researching" || state === "researching-degraded"
    ? Radio
    : state === "degraded"
      ? AlertTriangle
      : state === "offline"
        ? XCircle
        : state === "loading"
          ? Loader2
          : state === "queued"
            ? Activity
            : ShieldCheck;
  const nextCycle = formatNextCycle(atlas?.scheduler?.nextTriggerAt);
  const refreshedNow = now;
  const persistentRedisTotal = system?.databases.upstash.length ?? 0;
  const persistentRedisHealthy = system?.databases.upstash.filter(
    (slot) => slot.status === "ready" || slot.status === "ok",
  ).length ?? 0;
  const databaseState = !system
    ? "DB —"
    : persistentRedisTotal > 0
      ? `DB ${persistentRedisHealthy}/${persistentRedisTotal}`
      : servicesHealthy
        ? "DB OK"
        : "DB !";
  const databaseDetail = !system
    ? "Database status is still loading."
    : `PostgreSQL and local Redis are ${servicesHealthy ? "healthy" : "available"}; persistent Redis capacity is ${persistentRedisHealthy}/${persistentRedisTotal || "—"} slots healthy.`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="workspace-status-panel"
        aria-label={`${copy.label}. Open whole workspace status.`}
        data-testid="button-workspace-status"
        className={cn(
          "group flex h-8 items-center gap-1 rounded-lg border px-1.5 transition-colors sm:h-9 sm:max-w-[230px] sm:gap-2 sm:px-3",
          "border-[#9CFF1A]/15 bg-background/70 hover:border-primary/40 hover:bg-muted/50",
          (state === "degraded" || state === "researching-degraded" || state === "offline") && "border-[#9CFF1A]/30",
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", copy.dotClassName, state === "researching" && "animate-pulse")} />
        <Icon className={cn("h-3.5 w-3.5 shrink-0", copy.className, state === "loading" && "animate-spin")} />
        {/* Mobile: short word that never truncates mid-label; desktop: full phrase */}
        <span className={cn("font-mono text-[13px] font-bold tracking-[0.06em] sm:hidden", copy.className)}>
          {copy.shortLabel}
        </span>
        <span className={cn("hidden truncate font-mono text-[14px] font-bold tracking-[0.1em] sm:inline", copy.className)}>
          {copy.label}
        </span>
        <span className="text-stone-600 font-mono text-[13px] sm:text-[14px]" aria-hidden>
          ·
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-[13px] font-bold tabular-nums sm:text-[14px]",
            servicesHealthy ? "text-primary" : copy.className,
          )}
          title={databaseDetail}
        >
          {databaseState}
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground/70 transition-transform sm:h-3.5 sm:w-3.5", open && "rotate-180")} />
      </button>

      {open && (
        <>
        {/* Opaque scrim — never glass-through to Reactor (LIVE-17) */}
        <button
          type="button"
          className="fixed inset-0 z-[70] bg-[#05070c]/85 sm:bg-black/50"
          aria-label="Close workspace status"
          onClick={() => setOpen(false)}
        />
        <div
          id="workspace-status-panel"
          role="dialog"
          aria-label="Whole workspace status"
          className="fixed left-3 right-3 top-[max(3.5rem,env(safe-area-inset-top))] z-[80] max-h-[min(75dvh,560px)] overflow-y-auto rounded-xl border border-[#9CFF1A]/25 bg-[#0c1220] p-4 shadow-2xl shadow-black/80 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.4rem)] sm:w-[min(390px,calc(100vw-1rem))] sm:max-h-[min(70dvh,520px)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/70", copy.className)}>
                <Icon className={cn("h-3.5 w-3.5", state === "loading" && "animate-spin")} />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[14px] uppercase tracking-[0.2em] text-muted-foreground/60">Whole workspace</div>
                <div className={cn("mt-1 font-mono text-[12px] font-bold tracking-wide", copy.className)}>{copy.label}</div>
                <p className="mt-1 max-w-[260px] text-[11px] leading-4 text-muted-foreground">{copy.detail}</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 font-mono text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              Close
            </button>
            <div className="shrink-0 text-right">
              <div className={cn("font-mono text-xl font-bold", copy.className)}>
                {active ? phaseLabel(atlas) : schedulerEnabled ? "AUTO" : "—"}
              </div>
              <div className="font-mono text-[13px] uppercase tracking-widest text-muted-foreground/60">
                {active ? "current operation" : schedulerEnabled ? "continuous cycle" : "atlas state"}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-muted-foreground/60">Research engine</span>
                  <span className={cn("font-mono text-[14px] font-bold", active ? (providerDegraded ? "text-[#d4ff8a]" : "text-lime-300") : schedulerEnabled ? "text-[#d4ff8a]" : "text-muted-foreground")}>
                  {active ? (providerDegraded ? "ACTIVE · PARTIAL COVERAGE" : "DISCOVERING + ENRICHING") : schedulerEnabled ? "QUEUED" : "READY"}
                </span>
              </div>
              <div className="mt-1 truncate text-[11px] text-foreground/80">
                {active ? atlas?.message || atlas?.phaseJ?.message || "Processing the current target…" : nextCycle ? `Next cycle in ${nextCycle}` : atlas?.message || "No active Atlas target"}
              </div>
              {active && atlas?.jobId && <div className="mt-1 truncate font-mono text-[13px] text-muted-foreground/50">run {atlas.jobId}</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <div className="font-mono text-[13px] uppercase tracking-widest text-muted-foreground/55">Services</div>
                <div className={cn("mt-1 font-mono text-[11px] font-bold", servicesHealthy ? "text-primary" : "text-[#d4ff8a]")}>
                  {servicesHealthy ? "API · DB · REDIS OK" : "ATTENTION NEEDED"}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <div className="font-mono text-[13px] uppercase tracking-widest text-muted-foreground/55">AI capacity</div>
                <div className={cn("mt-1 font-mono text-[11px] font-bold", summary.active > 0 ? "text-primary" : "text-[#d4ff8a]")}>
                  WEB {summary.active}/{summary.configured || "—"}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-muted-foreground/60">Database / persistence</span>
                <span className={cn("font-mono text-[14px] font-bold", servicesHealthy ? "text-primary" : "text-[#d4ff8a]")}>
                  {databaseState}
                </span>
              </div>
              <div className="mt-1 text-[11px] leading-4 text-foreground/80">{databaseDetail}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="font-mono text-[13px] uppercase tracking-wider text-muted-foreground/55">
              {atlas?.scheduler?.cycles ? `${atlas.scheduler.cycles} cycles · live poll` : `Updated ${new Date(refreshedNow).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </div>
            <div className="flex items-center gap-1">
              <Link href="/reactor" onClick={() => setOpen(false)} data-testid="link-workspace-reactor" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[14px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10">
                Reactor <ExternalLink className="h-3 w-3" />
              </Link>
              <Link href="/status" onClick={() => setOpen(false)} data-testid="link-workspace-status" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[14px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted">
                Details
              </Link>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}