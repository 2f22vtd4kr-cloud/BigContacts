/**
 * System Status — AI key pools, databases, Upstash slots.
 * Auto-refreshes every 15 seconds.
 */
import { useEffect, useState, useCallback } from "react";
import {
  Activity, AlertCircle, CheckCircle2, Clock, Database,
  Layers, RefreshCw, Server, Wifi, WifiOff, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readApiJson } from "@/lib/api-json";
import { isMockMode, mockSystemStatus } from "@/lib/dev-mock-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIKeySlot {
  index: number;
  state: "active" | "rate_limited" | "missing";
  expiresAt: string | null;
}

interface AIKeyStatus {
  groq:       AIKeySlot[];
  perplexity: AIKeySlot[];
  gemini:     AIKeySlot[];
  tavily:     AIKeySlot[];
  exa:        AIKeySlot[];
}

interface OpenResearchStatus {
  state: "ready" | "incomplete" | "unavailable";
  huggingFace: { configured: boolean };
  serper: { configured: boolean };
  adapter: { available: boolean; model: string };
  mistral: { configured: boolean; model: string; rateLimit: string };
}

interface BureauReasoningStatus {
  configured: boolean;
  model: string;
  endpoint: string;
  role: "right_hand_advisor";
  capability: "case_file_reasoning_only";
}

interface GeminiBossStatus {
  configured: boolean;
  model: string;
  role: "head_investigator";
  capability: "text_generation_and_case_planning";
  webSearchGrounding: false;
}

interface UpstashSlot {
  slot: number;
  status: string;
  quotaExhausted: boolean;
  latencyMs?: number | null;
}

interface SystemStatus {
  ai: AIKeyStatus;
  openResearch?: OpenResearchStatus;
  bureauReasoning?: BureauReasoningStatus;
  geminiBoss?: GeminiBossStatus;
  databases: {
    postgres:   { status: "ok" | "error"; latencyMs: number | null };
    localRedis: { status: string;         latencyMs: number | null };
    upstash:    UpstashSlot[];
  };
  generatedAt: string;
  cached:      boolean;
  cachedAgoMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<keyof AIKeyStatus, string> = {
  groq:       "Groq LLaMA",
  perplexity: "Perplexity",
  gemini:     "Gemini",
  tavily:     "Tavily",
  exa:        "Exa",
};

const OPEN_RESEARCH_LABELS = {
  ready: "ready",
  incomplete: "incomplete",
  unavailable: "unavailable",
} as const;

const PROVIDER_COLORS: Record<string, string> = {
  groq:       "from-orange-500/20 border-orange-500/30",
  perplexity: "from-blue-500/20 border-blue-500/30",
  gemini:     "from-purple-500/20 border-purple-500/30",
  tavily:     "from-cyan-500/20 border-cyan-500/30",
  exa:        "from-emerald-500/20 border-emerald-500/30",
};

function SlotBar({ slots }: { slots: AIKeySlot[] }) {
  if (!slots.length) {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div className="h-full w-0 rounded-full bg-muted" />
      </div>
    );
  }
  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/30"
      role="img"
      aria-label={`${slots.filter((s) => s.state === "active").length} of ${slots.length} slots active`}
    >
      {slots.map((slot) => (
        <div
          key={slot.index}
          title={`Slot ${slot.index + 1}: ${slot.state}${slot.expiresAt ? ` · resets ${new Date(slot.expiresAt).toLocaleTimeString()}` : ""}`}
          className={cn(
            "h-full flex-1 border-r border-background/40 last:border-r-0 transition-colors",
            slot.state === "active" && "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.45)]",
            slot.state === "rate_limited" && "bg-amber-400/90 animate-pulse",
            slot.state === "missing" && "bg-muted/50",
          )}
        />
      ))}
    </div>
  );
}

function ProviderCard({ name, slots }: { name: keyof AIKeyStatus; slots: AIKeySlot[] }) {
  const active = slots.filter((s) => s.state === "active").length;
  const rateLimited = slots.filter((s) => s.state === "rate_limited").length;
  const missing = slots.filter((s) => s.state === "missing").length;
  const configured = slots.filter((s) => s.state !== "missing").length;
  const total = Math.max(slots.length, 1);
  const health = active / total;

  const tone =
    active > 0
      ? "border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.07] via-card/80 to-card/40"
      : rateLimited > 0
        ? "border-amber-400/25 bg-gradient-to-br from-amber-500/[0.07] via-card/80 to-card/40"
        : "border-border/60 bg-card/30";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all hover:border-cyan-400/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.06)]",
        tone,
        configured === 0 && "opacity-55",
      )}
      data-testid={`provider-card-${name}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-400/5 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[13px] font-semibold tracking-tight text-foreground">
            {PROVIDER_LABELS[name]}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {configured}/{total} slots keyed
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
            active > 0
              ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-200"
              : rateLimited > 0
                ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
                : "border-border/70 bg-muted/20 text-muted-foreground",
          )}
        >
          {active > 0 ? `${active} live` : rateLimited > 0 ? "cooldown" : "empty"}
        </span>
      </div>

      <div className="relative mt-4 space-y-2">
        <SlotBar slots={slots} />
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="text-cyan-300/90">{Math.round(health * 100)}% capacity</span>
          <span className="truncate text-right">
            {rateLimited > 0 && <span className="text-amber-300/90">{rateLimited} cooling · </span>}
            {missing > 0 && <span className="text-muted-foreground/55">{missing} open</span>}
            {missing === 0 && rateLimited === 0 && active > 0 && (
              <span className="text-emerald-300/80">all clear</span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

function DbRow({
  label, status, latency, icon: Icon,
}: {
  label: string;
  status: "ok" | "error" | "ready" | "connecting" | string;
  latency: number | null;
  icon: React.ElementType;
}) {
  const ok = status === "ok" || status === "ready";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", ok ? "text-primary" : "text-destructive")} />
        <span className="font-mono text-[12px] text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {latency !== null && (
          <span className="font-mono text-[11px] text-muted-foreground">{latency}ms</span>
        )}
        <span className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
          ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
        )}>
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {ok ? "connected" : status}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SystemStatusPage() {
  const [status,    setStatus]    = useState<SystemStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    if (isMockMode()) {
      setStatus(mockSystemStatus() as any);
      setError(null);
      setLoading(false);
      setLastFetch(new Date());
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/system/status`);
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Fetch error");
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const aiProviders = status?.ai
    ? (Object.keys(status.ai) as Array<keyof AIKeyStatus>)
    : (["groq", "perplexity", "gemini", "tavily", "exa"] as Array<keyof AIKeyStatus>);

  const totalActive = status?.ai
    ? aiProviders.reduce((sum, k) => sum + (status.ai[k]?.filter(s => s.state === "active").length ?? 0), 0)
    : 0;

  const upstashSlots = status?.databases?.upstash ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="max-w-lg text-[12px] leading-relaxed text-muted-foreground">
            Provider keys, databases, and cooldown state for the research desk.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastFetch && (
            <span className="font-mono text-[10px] text-muted-foreground/60">
              Updated {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStatus}
            className="flex min-h-[40px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick-glance banner */}
      {status && (
        <div className={cn(
          "flex flex-col gap-2 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
          totalActive > 0
            ? "border-cyan-400/25 bg-gradient-to-r from-cyan-500/[0.08] to-transparent"
            : "border-destructive/30 bg-destructive/5",
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-2 w-2 rounded-full",
              totalActive > 0 ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" : "bg-destructive",
            )} />
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              {totalActive > 0
                ? `${totalActive} AI key slots operational`
                : "No AI keys active"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            {status.cached ? `Cached · ${Math.round(status.cachedAgoMs / 1000)}s` : "Live feed"}
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-start sm:gap-3" role="alert">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 space-y-1">
            <div className="font-mono text-[12px] font-semibold text-destructive">Could not load system status</div>
            <p className="font-mono text-[11px] leading-relaxed text-destructive/90">{error}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              This page needs api-server at <span className="font-mono">/api/system/status</span>. Static UI alone will show this error.
            </p>
          </div>
        </div>
      )}

      {/* AI Key Pools */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            AI Engine Key Pools
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aiProviders.map(key => (
            <ProviderCard
              key={key}
              name={key}
              slots={status?.ai[key] ?? []}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Segment bars show slot health. Temporary 429 cooldowns auto-recover after the provider window; configured keys are not credit claims.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Open Research Lane
          </h2>
          <span className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
            status?.openResearch?.state === "ready"
              ? "bg-primary/15 text-primary"
              : status?.openResearch?.state === "incomplete"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-muted/30 text-muted-foreground",
          )}>
            {OPEN_RESEARCH_LABELS[status?.openResearch?.state ?? "unavailable"]}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            { label: "Hugging Face", sub: "Model host", configured: status?.openResearch?.huggingFace?.configured ?? false },
            { label: "Serper", sub: "Live search", configured: status?.openResearch?.serper?.configured ?? false },
            { label: "Mistral", sub: "Web search", configured: status?.openResearch?.mistral?.configured ?? false },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                item.configured
                  ? "border-cyan-400/20 bg-cyan-500/[0.06]"
                  : "border-border/50 bg-card/25",
              )}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold tracking-tight text-foreground">{item.label}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/65">{item.sub}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
                  item.configured
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-border/60 bg-muted/20 text-muted-foreground",
                )}
              >
                {item.configured ? "ready" : "off"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-border/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
            <span className="text-muted-foreground">Bounded smolagents adapter</span>
            <span className={status?.openResearch?.adapter?.available ? "text-primary" : "text-muted-foreground"}>
              {status?.openResearch?.adapter?.available ? "installed" : "unavailable"}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[9px] text-muted-foreground/55">
            {status?.openResearch?.adapter?.model ?? "Qwen/Qwen2.5-7B-Instruct"} · review-only, no direct promotion
          </div>
          <div className="mt-1 truncate font-mono text-[9px] text-muted-foreground/55">
            {status?.openResearch?.mistral?.configured
              ? `Mistral ${status.openResearch.mistral.model} · ${status.openResearch.mistral.rateLimit}`
              : "Mistral web search not configured"}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
            <span className="text-muted-foreground">Gemini Boss</span>
            <span className={status?.geminiBoss?.configured ? "text-primary" : "text-muted-foreground"}>
              {status?.geminiBoss?.configured ? "configured" : "missing"}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[9px] text-muted-foreground/55">
            {status?.geminiBoss?.configured
              ? `${status.geminiBoss.model} · head investigator · text only · no web grounding`
              : "Gemini Boss text-planning model not configured"}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
            <span className="text-muted-foreground">Boss's right-hand advisor</span>
            <span className={status?.bureauReasoning?.configured ? "text-primary" : "text-muted-foreground"}>
              {status?.bureauReasoning?.configured ? "configured" : "missing"}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[9px] text-muted-foreground/55">
            {status?.bureauReasoning?.configured
              ? `${status.bureauReasoning.model} · advisory only · no web search`
              : "NVIDIA NIM right-hand advisor not configured"}
          </div>
        </div>
      </section>

      {/* Databases */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Databases
          </h2>
        </div>
        <div className="space-y-2">
          <DbRow
            label="PostgreSQL"
            status={status?.databases?.postgres?.status ?? "—"}
            latency={status?.databases?.postgres?.latencyMs ?? null}
            icon={Server}
          />
          <DbRow
            label="Local Redis (cache)"
            status={status?.databases?.localRedis?.status ?? "—"}
            latency={status?.databases?.localRedis?.latencyMs ?? null}
            icon={Layers}
          />
        </div>
      </section>

      {/* Upstash Slots */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Upstash Permanent Cache Slots
          </h2>
        </div>
        {upstashSlots.length === 0 ? (
          <p className="font-mono text-[12px] text-muted-foreground">No Upstash slots configured.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {upstashSlots.map((slot) => (
              <div
                key={slot.slot}
                className={cn(
                  "rounded-lg border px-3 py-3 text-center",
                  slot.quotaExhausted
                    ? "border-amber-500/30 bg-amber-500/5"
                    : slot.status === "ready"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/10",
                )}
              >
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  Slot {slot.slot}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  {slot.quotaExhausted
                    ? <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                    : slot.status === "ready"
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  <span className={cn(
                    "font-mono text-[10px] font-bold uppercase",
                    slot.quotaExhausted ? "text-amber-400" :
                    slot.status === "ready" ? "text-primary" : "text-muted-foreground",
                  )}>
                    {slot.quotaExhausted ? "quota" : slot.status}
                  </span>
                </div>
                {typeof slot.latencyMs === "number" && slot.latencyMs !== null && (
                  <div className="mt-1 font-mono text-[9px] text-muted-foreground/50">{slot.latencyMs}ms</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 border-t border-border/40 pt-5 font-mono text-[10px] text-muted-foreground/60">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary" /> Active — key operational
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" /> Temporary cooldown — provider returned 429 (auto-recovers)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full border border-muted/50 bg-muted/20" /> Missing — secret not configured
        </div>
      </div>
    </div>
  );
}
