import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AI_PROVIDERS,
  PROVIDER_LABELS,
  fetchSystemStatus,
  getSoonestReset,
  summarizeApiKeys,
  type AIKeySlot,
  type AIKeyStatus,
  type SystemStatus,
} from "@/lib/system-status";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL_MS = 15_000;

type HealthState = "loading" | "healthy" | "degraded" | "rate-limited" | "down" | "offline";

function getHealthState(
  summary: ReturnType<typeof summarizeApiKeys>,
  hasError: boolean,
  loading: boolean,
): HealthState {
  if (loading && summary.total === 0) return "loading";
  if (hasError && summary.total === 0) return "offline";
  if (summary.configured === 0) return "down";
  if (summary.active === 0 && summary.rateLimited > 0) return "rate-limited";
  if (summary.active === 0) return "down";
  if (summary.rateLimited > 0) return "degraded";
  return "healthy";
}

const HEALTH_COPY: Record<HealthState, { label: string; detail: string; className: string }> = {
  loading: {
    label: "CHECKING KEYS",
    detail: "Reading provider key pools…",
    className: "text-muted-foreground",
  },
  healthy: {
    label: "KEYS NOMINAL",
    detail: "All configured provider pools have an active slot.",
    className: "text-primary",
  },
  degraded: {
    label: "KEYS DEGRADED",
    detail: "Some configured slots are rate-limited; research can continue.",
    className: "text-amber-400",
  },
  "rate-limited": {
    label: "KEYS RATE-LIMITED",
    detail: "Every configured key is temporarily cooling down from a provider 429. Keys remain configured and will re-enter rotation automatically.",
    className: "text-amber-400",
  },
  down: {
    label: "KEYS DOWN",
    detail: "No AI key slots are currently active. OSINT coverage is impaired.",
    className: "text-destructive",
  },
  offline: {
    label: "KEY STATUS OFFLINE",
    detail: "The API status endpoint could not be reached.",
    className: "text-destructive",
  },
};

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function formatResetTime(timestamp: string | null, now: number): string | null {
  if (!timestamp) return null;
  const remaining = Date.parse(timestamp) - now;
  if (remaining <= 0) return "refreshing";
  return `${formatCountdown(remaining)} · ${new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

function SlotSummary({ slots, now }: { slots: AIKeySlot[]; now: number }) {
  const active = slots.filter((slot) => slot.state === "active").length;
  const rateLimited = slots.filter((slot) => slot.state === "rate_limited").length;
  const missing = slots.filter((slot) => slot.state === "missing").length;
  const nextReset = slots
    .filter((slot) => slot.state === "rate_limited" && slot.expiresAt)
    .map((slot) => slot.expiresAt as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 font-mono text-[10px]">
      <span className="text-primary">{active} up</span>
      {rateLimited > 0 && (
        <span className="text-amber-400">
          {active === 0 ? "ALL TEMPORARILY RATE-LIMITED" : `${rateLimited} cooling`}
        </span>
      )}
      {missing > 0 && <span className="text-muted-foreground/55">{missing} missing</span>}
      {nextReset && <span className="w-full text-right text-[9px] text-amber-400/80">refresh {formatResetTime(nextReset, now)}</span>}
    </div>
  );
}

function ProviderRow({
  name,
  slots,
  now,
}: {
  name: keyof AIKeyStatus;
  slots: AIKeySlot[];
  now: number;
}) {
  const active = slots.filter((slot) => slot.state === "active").length;
  const rateLimited = slots.filter((slot) => slot.state === "rate_limited").length;
  const state = active > 0 ? (rateLimited > 0 ? "degraded" : "healthy") : rateLimited > 0 ? "degraded" : "missing";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            state === "healthy" && "bg-primary shadow-[0_0_7px_rgba(132,204,22,0.6)]",
            state === "degraded" && "bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.45)]",
            state === "missing" && "bg-muted-foreground/35",
          )}
        />
        <span className="truncate font-mono text-[11px] text-foreground">{PROVIDER_LABELS[name]}</span>
      </div>
      <SlotSummary slots={slots} now={now} />
    </div>
  );
}

export function ApiKeyHealth() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const refresh = async () => {
      try {
        const nextStatus = await fetchSystemStatus(BASE, controller.signal);
        if (!mounted) return;
        setStatus(nextStatus);
        setError(null);
      } catch (nextError) {
        if (!mounted || controller.signal.aborted) return;
        setError(nextError instanceof Error ? nextError.message : "Status unavailable");
      } finally {
        if (mounted) setLoading(false);
      }
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
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

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

  const summary = summarizeApiKeys(status);
  const health = getHealthState(summary, Boolean(error), loading);
  const healthCopy = HEALTH_COPY[health];
  const soonestReset = getSoonestReset(status);
  const soonestResetLabel = formatResetTime(soonestReset, now);
  const icon = health === "healthy" ? ShieldCheck : health === "degraded" || health === "rate-limited" ? AlertTriangle : health === "loading" ? Loader2 : ShieldAlert;
  const HealthIcon = icon;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="api-key-health-panel"
        aria-label={`${healthCopy.label}. Open API key status details.`}
        data-testid="button-api-key-health"
        className={cn(
          "group flex h-9 items-center gap-2 rounded-lg border px-2.5 transition-colors sm:px-3",
          "border-border/70 bg-background/70 hover:border-primary/40 hover:bg-muted/50",
          health === "down" || health === "offline" ? "border-destructive/40" : "",
        )}
      >
        <HealthIcon className={cn("h-3.5 w-3.5 shrink-0", healthCopy.className, health === "loading" && "animate-spin")} />
        <span className={cn("hidden font-mono text-[10px] font-bold tracking-[0.12em] sm:inline", healthCopy.className)}>
          {healthCopy.label}
        </span>
        <span className={cn("font-mono text-[10px] font-bold sm:hidden", healthCopy.className)}>
          {health === "loading" || health === "offline" ? "—" : `${summary.active}/${summary.configured}`}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id="api-key-health-panel"
          role="dialog"
          aria-label="API key status"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(410px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/70",
                health === "down" || health === "offline" ? "text-destructive" : health === "degraded" || health === "rate-limited" ? "text-amber-400" : "text-primary",
              )}>
                <KeyRound className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">OSINT access layer</div>
                <div className={cn("mt-1 font-mono text-[12px] font-bold tracking-wide", healthCopy.className)}>
                  {healthCopy.label}
                </div>
                <p className="mt-1 max-w-[280px] text-[11px] leading-4 text-muted-foreground">{healthCopy.detail}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-xl font-bold text-foreground">{summary.active}<span className="text-muted-foreground/40">/{summary.configured}</span></div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">active / configured</div>
            </div>
          </div>

          <div className="mt-3">
            {health === "rate-limited" && soonestResetLabel && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Temporary provider cooldown
                  </span>
                </div>
                <span className="shrink-0 text-right font-mono text-[10px] text-amber-200">
                  next refresh {soonestResetLabel}
                </span>
              </div>
            )}
            {loading && !status ? (
              <div className="flex items-center gap-2 py-3 font-mono text-[11px] text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Reading provider pools…
              </div>
            ) : error && !status ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-3 font-mono text-[11px] text-destructive">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                API status unavailable
              </div>
            ) : (
              AI_PROVIDERS.map((provider) => (
                <ProviderRow key={provider} name={provider} slots={status?.ai?.[provider] ?? []} now={now} />
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/55">
              {status?.cached ? `Cached ${Math.round(status.cachedAgoMs / 1000)}s ago` : status ? "Live status" : "Awaiting API"}
            </div>
            <Link
              href="/status"
              onClick={() => setOpen(false)}
              data-testid="link-api-key-status"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
            >
              Full diagnostics
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}