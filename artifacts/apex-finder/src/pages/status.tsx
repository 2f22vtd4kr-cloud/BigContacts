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
  groqInvestigator: AIKeySlot[];
  serper: AIKeySlot[];
  tavily: AIKeySlot[];
  exa: AIKeySlot[];
}

interface GroqBossStatus {
  configured: boolean;
  model: string;
  fallbackModels: string[];
  role: "head_investigator";
  capability: "text_generation_and_case_planning";
  webSearchGrounding: false;
  provider: "groq";
}

interface GroqRightHandStatus {
  configured: boolean;
  model: string;
  fallbackModels: string[];
  endpoint: string;
  role: "right_hand_advisor";
  capability: "case_file_reasoning_only";
  provider: "groq";
}

interface GroqRightHandLatency {
  requestTimeoutMs: number;
  overallTimeoutMs: number;
  minimumOverallTimeoutMs: number;
  overallTimeoutClamped: boolean;
}

interface UpstashSlot {
  slot: number;
  status: string;
  quotaExhausted: boolean;
  latencyMs?: number | null;
}

interface SystemStatus {
  ai: AIKeyStatus;
  groqBoss: GroqBossStatus;
  groqRightHand: GroqRightHandStatus;
  groqRightHandLatency: GroqRightHandLatency;
  pythonTools: Record<string, boolean>;
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

const PROVIDER_LABELS: Record<string, string> = {
  groqInvestigator: "Groq Investigator",
  serper: "Serper search",
  tavily: "Tavily search",
  exa: "Exa search",
};

const PROVIDER_SECRET_LABELS: Record<string, string> = {
  groqInvestigator: "GROQ_INVESTIGATOR_API_KEY · numbered slots supported",
  serper: "SERPER_API_KEY · SERPER_KEY also accepted",
  tavily: "TAVILY_API_KEY · numbered slots supported",
  exa: "EXA_API_KEY · numbered slots supported",
};

function SlotBar({ active, cooling }: { active: number; cooling: number }) {
  const n = Math.max(active + cooling, 1);
  // Only draw keys that exist — never a fixed grid of empty slots.
  const cells = [
    ...Array.from({ length: active }, () => "active" as const),
    ...Array.from({ length: cooling }, () => "cool" as const),
  ];
  if (active === 0 && cooling === 0) {
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4E4DF]" role="img" aria-label="No keys" />
    );
  }
  return (
    <div
      className="flex h-2 w-full max-w-[12rem] overflow-hidden rounded-full bg-[#E4E4DF]"
      role="img"
      aria-label={`${active} live${cooling ? `, ${cooling} cooling` : ""}`}
    >
      {cells.map((kind, i) => (
        <div
          key={`${kind}-${i}`}
          className={cn(
            "h-full flex-1 border-r border-[#FAFAF8] last:border-r-0",
            kind === "active" && "bg-[#1F8A4D]",
            kind === "cool" && "bg-[#EDB92B]",
          )}
          style={{ minWidth: `${Math.max(12, 100 / n)}%`, maxWidth: "100%" }}
        />
      ))}
    </div>
  );
}

function ProviderCard({ name, slots }: { name: string; slots: AIKeySlot[] }) {
  const active = slots.filter((s) => s.state === "active").length;
  const rateLimited = slots.filter((s) => s.state === "rate_limited").length;
  const configured = slots.filter((s) => s.state !== "missing").length;

  const tone =
    active > 0
      ? "border-[#E4E4DF] bg-[#F3F3F0]"
      : rateLimited > 0
        ? "border-[#E4E4DF] bg-[#F3F3F0]"
        : "border-[#E4E4DF] bg-[#FAFAF8]";

  return (
    <article
      className={cn(
        "group relative min-w-0 max-w-full overflow-hidden rounded-xl border border-[#E4E4DF] p-4 transition-colors hover:border-[#BDBDB8]",
        tone,
      )}
      data-testid={`provider-card-${name}`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-sans text-[14px] font-medium text-[#18181A]">
            {PROVIDER_LABELS[name] ?? (name.charAt(0).toUpperCase() + name.slice(1))}
          </div>
          <div className="mt-1 font-mono text-[12px] text-[#74747A]">
            {configured === 0
              ? "No keys configured"
              : configured === 1
                ? "1 key configured"
                : `${configured} keys configured`}
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-[#74747A]" title={PROVIDER_SECRET_LABELS[name]}>
            {PROVIDER_SECRET_LABELS[name] ?? "Provider-specific secret"}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] font-medium",
            active > 0
              ? "border-[#E4E4DF] bg-[#F3F3F0] text-[#1F8A4D]"
              : rateLimited > 0
                ? "border-[#E4E4DF] bg-[#F3F3F0] text-[#EDB92B]"
                : "border-[#E4E4DF] bg-[#F3F3F0] text-[#74747A]",
          )}
        >
          {active > 0 ? `${active} active` : rateLimited > 0 ? "cooldown" : "empty"}
        </span>
      </div>

      <div className="relative mt-4 space-y-2">
        <SlotBar active={active} cooling={rateLimited} />
        <div className="font-mono text-[12px] text-[#74747A]">
          {active > 0 && (
            <span className="text-[#1F8A4D]">
              {active} live now
              {rateLimited > 0 ? ` · ${rateLimited} cooling` : ""}
            </span>
          )}
          {active === 0 && rateLimited > 0 && (
            <span className="text-[#EDB92B]">{rateLimited} cooling — will return</span>
          )}
          {active === 0 && rateLimited === 0 && (
            <span className="text-[#74747A]">Add a key in Secrets, then restart API</span>
          )}
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
    <div className="flex items-center justify-between rounded-md border border-[#E4E4DF] px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", ok ? "text-[#1F8A4D]" : "text-[#C8321E]")} />
        <span className="font-mono text-[12px] text-[#18181A]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {latency !== null && (
          <span className="font-mono text-[11px] text-[#74747A]">{latency}ms</span>
        )}
        <span className={cn(
          "flex items-center gap-2 rounded-full px-2 py-1 font-mono text-[12px] font-medium",
          ok ? "bg-[#F3F3F0] text-[#1F8A4D]" : "bg-[#F3F3F0] text-[#C8321E]",
        )}>
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {ok ? "Connected" : status}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SystemStatusPage() {
  const [status,    setStatus]    = useState<SystemStatus | null>(null);
  const [integrity, setIntegrity] = useState<{
    level: string;
    reasons: string[];
    agenticSlots?: number;
    webSearch?: number;
    lastOk?: boolean | null;
    lastModel?: string | null;
  } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);


  const loadIntegrity = async (fromStatus?: any) => {
    try {
      const lanes = fromStatus?.lanesHonesty;
      if (lanes && (lanes.bureauIntegrity || fromStatus?.bureauIntegrity)) {
        setIntegrity({
          level: fromStatus.bureauIntegrity ?? lanes.bureauIntegrity ?? "ok",
          reasons: fromStatus.bureauIntegrityReasons ?? lanes.bureauIntegrityReasons ?? [],
          agenticSlots: lanes.agenticLlmSlots,
          webSearch: lanes.webSearchActive,
          lastOk: lanes.agenticLlmLastOk,
          lastModel: lanes.agenticLlmLastModel,
        });
        return;
      }
      const hr = await fetch(`${BASE}/api/healthz`);
      if (!hr.ok) return;
      const hj = await hr.json();
      const L = hj.lanesHonesty ?? {};
      setIntegrity({
        level: L.bureauIntegrity ?? (hj.registryShallowRisk ? "critical" : "ok"),
        reasons: L.bureauIntegrityReasons ?? [],
        agenticSlots: L.agenticLlmSlots,
        webSearch: L.webSearchActive,
        lastOk: L.agenticLlmLastOk,
        lastModel: L.agenticLlmLastModel,
      });
    } catch { /* non-fatal */ }
  };

  const fetchStatus = useCallback(async () => {
    if (isMockMode()) {
      setStatus(mockSystemStatus() as any);
      setError(null);
      setLoading(false);
      await loadIntegrity();
      setLastFetch(new Date());
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/system/status`);
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setStatus(data);
      setError(null);
      await loadIntegrity(data);
    } catch (e: any) {
      setError(e.message ?? "Fetch error");
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const aiProviders = status?.ai
    ? Object.keys(status.ai).filter((k) => Array.isArray((status.ai as any)[k]))
    : (["groqInvestigator", "serper", "tavily", "exa"]);

  const totalActive = status?.ai
    ? aiProviders.reduce((sum, k) => sum + (status.ai[k]?.filter(s => s.state === "active").length ?? 0), 0)
    : 0;
  const totalCooling = status?.ai
    ? aiProviders.reduce((sum, k) => sum + (status.ai[k]?.filter(s => s.state === "rate_limited").length ?? 0), 0)
    : 0;
  const activeProviderNames = aiProviders
    .filter((k) => (status?.ai[k]?.filter((slot) => slot.state === "active").length ?? 0) > 0)
    .map((k) => PROVIDER_LABELS[k] ?? k)
    .join(" · ");
  const keySummary = totalActive > 0
    ? totalActive + " search-provider slots active (" + activeProviderNames + ")" + (totalCooling > 0 ? " · " + totalCooling + " cooling" : "")
    : totalCooling > 0
      ? totalCooling + " search-provider slots cooling down after provider rate limits."
      : "No active search-provider pool keys. Check the provider-specific Secrets listed below and restart the API.";

  const upstashSlots = status?.databases?.upstash ?? [];

  return (
    <div className="atlas-system-status atlas-page max-w-4xl space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="max-w-full text-[13px] leading-relaxed text-[#55555A] break-words">
            Search-provider key pools, Redis and database health. Other source tools appear under research lanes below; the Groq model roles are reported separately.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastFetch && (
            <span className="font-mono text-[12px] text-[#74747A]">
              Updated {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStatus}
            className="atlas-outline-btn atlas-pressable flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2757C6]/40"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick-glance banner */}
      {status && (
        <div className={cn(
          "flex min-w-0 flex-col gap-2 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
          totalActive > 0
            ? "border-[#E4E4DF] bg-[#F3F3F0]"
            : "border-[#E4E4DF] bg-[#FAFAF8]",
        )}>
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn(
              "mt-2 h-2 w-2 shrink-0 rounded-full",
              totalActive > 0 ? "bg-[#1F8A4D]" : "bg-[#C8321E]",
            )} />
            <span className="min-w-0 text-[13px] font-medium leading-snug text-[#18181A] break-words">
              {totalActive > 0
                ? `${totalActive} search-provider slot${totalActive === 1 ? "" : "s"} active (${aiProviders
                    .filter((k) => (status.ai[k]?.filter((s) => s.state === "active").length ?? 0) > 0)
                    .map((k) => PROVIDER_LABELS[k] ?? k)
                    .join(" · ")})`
                : "No active search-provider pool keys. Check provider-specific Secrets and restart the API."}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[12px] text-[#74747A]">
            <Activity className="h-4 w-4" />
            {status.cached ? `Cached · ${Math.round(status.cachedAgoMs / 1000)}s` : "Live feed"}
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#C8321E]/30 bg-[#F3F3F0] px-4 py-3 sm:flex-row sm:items-start" role="alert">
          <AlertCircle className="h-4 w-4 text-[#C8321E] shrink-0 mt-1" aria-hidden />
          <div className="min-w-0 space-y-1">
            <div className="font-mono text-[12px] font-medium text-[#C8321E]">Could not load system status</div>
            <p className="font-mono text-[11px] leading-relaxed text-[#C8321E]">{error}</p>
            <p className="text-[11px] leading-relaxed text-[#74747A]">
              This page needs api-server at <span className="font-mono">/api/system/status</span>. Static UI alone will show this error.
            </p>
          </div>
        </div>
      )}

      {/* AI Key Pools */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#2757C6]" />
          <h2 className="font-mono text-[14px] font-medium text-[#18181A]">
            Search provider key pools
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          
      {/* Bureau integrity — explicit when Apex cannot beat general agents */}
      {integrity && integrity.level !== "ok" && (
        <div
          data-testid="status-bureau-integrity"
          className={
            integrity.level === "critical"
              ? "rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-4"
              : "rounded-xl border border-lime-500/35 bg-lime-950/40 px-4 py-4"
          }
        >
          <div className="text-[13px] font-medium text-[#18181A]">
            {integrity.level === "critical"
              ? "Bureau is not functioning correctly"
              : "Bureau is degraded"}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#55555A]">
            Apex uses the canonical Groq roles and model-selected public-source capabilities. This state means
            one or more configured capabilities are currently unavailable or rate-limited.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-[#55555A]">
            {(integrity.reasons.length ? integrity.reasons : ["See healthz.lanesHonesty"]).slice(0, 5).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="mt-2 font-mono text-[12px] text-[#74747A]">
            agentic LLM slots: {integrity.agenticSlots ?? "—"}
            {" · "}web search: {integrity.webSearch ?? "—"}
            {" · "}last step: {integrity.lastOk === false ? "failed" : integrity.lastOk === true ? `ok (${integrity.lastModel ?? "—"})` : "not exercised"}
          </div>
        </div>
      )}

{aiProviders.map((key) => (
            <ProviderCard
              key={key}
              name={key}
              slots={(status?.ai as any)?.[key] ?? []}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#74747A]">
          Each bar shows only keys you have set. Green = live right now. Cooling keys are dimmer. Empty secret slots are not shown — there is no fixed “out of 11”. Scrapfly, Companies House, Serper, Zenrows and similar tools appear under Open research / tools below.
        </p>
      </section>

      <section data-testid="canonical-model-roles">
        <div className="mb-4 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-[#2757C6]" />
          <h2 className="font-mono text-[14px] font-medium text-[#18181A]">
            Canonical model roles
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              label: "Groq Boss",
              sub: "Case direction · Investigator selection",
              configured: status?.groqBoss?.configured ?? false,
              model: status?.groqBoss?.model,
            },
            {
              label: "Groq Right-hand",
              sub: "Independent bounded oversight · no browsing",
              configured: status?.groqRightHand?.configured ?? false,
              model: status?.groqRightHand?.model,
            },
          ].map((role) => (
            <div key={role.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#E4E4DF] bg-[#FAFAF8] px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#18181A]">{role.label}</div>
                <div className="mt-1 font-mono text-[11px] text-[#74747A]">{role.sub}</div>
                <div className="mt-1 truncate font-mono text-[11px] text-[#74747A]">{role.model ?? "Model route not reported"}</div>
              </div>
              <span className={cn(
                "shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] font-medium",
                role.configured ? "border-[#E4E4DF] bg-[#F3F3F0] text-[#1F8A4D]" : "border-[#E4E4DF] bg-[#F3F3F0] text-[#74747A]",
              )}>{role.configured ? "Configured" : "Missing"}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#74747A]">
          The selected Groq Investigator owns research choices and tool selection. Runtime-generated availability and authorization determine which capabilities can execute; role credentials are never crossed over.
        </p>
      </section>

      {/* Databases */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-[#2757C6]" />
          <h2 className="font-mono text-[14px] font-medium text-[#18181A]">
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
          <Wifi className="h-4 w-4 text-[#2757C6]" />
          <h2 className="font-mono text-[14px] font-medium text-[#18181A]">
            Upstash Permanent Cache Slots
          </h2>
        </div>
        {upstashSlots.length === 0 ? (
          <p className="font-mono text-[12px] text-[#74747A]">No Upstash slots configured.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {upstashSlots.map((slot) => (
              <div
                key={slot.slot}
                className={cn(
                  "rounded-xl border px-3 py-3 text-center",
                  slot.quotaExhausted
                    ? "border-[#E4E4DF] bg-[#F3F3F0]"
                    : slot.status === "ready"
                    ? "border-[#E4E4DF] bg-[#F3F3F0]"
                    : "border-[#E4E4DF] bg-[#FAFAF8]",
                )}
              >
                <div className="mb-1 font-mono text-[12px] text-[#74747A]">
                  Slot {slot.slot}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {slot.quotaExhausted
                    ? <WifiOff className="h-4 w-4 text-[#EDB92B]" />
                    : slot.status === "ready"
                    ? <CheckCircle2 className="h-4 w-4 text-[#1F8A4D]" />
                    : <Clock className="h-4 w-4 text-[#74747A]" />
                  }
                  <span className={cn(
                    "font-mono text-[12px] font-medium",
                    slot.quotaExhausted ? "text-[#EDB92B]" :
                    slot.status === "ready" ? "text-[#1F8A4D]" : "text-[#74747A]",
                  )}>
                    {slot.quotaExhausted ? "quota" : slot.status}
                  </span>
                </div>
                {typeof slot.latencyMs === "number" && slot.latencyMs !== null && (
                  <div className="mt-1 font-mono text-[11px] text-[#74747A]">{slot.latencyMs}ms</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 border-t border-[#E4E4DF] pt-4 font-mono text-[12px] text-[#74747A]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#1F8A4D]" /> Active — key operational
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#EDB92B]" /> Temporary cooldown — provider returned 429 (auto-recovers)
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-[#E4E4DF] bg-[#F3F3F0]" /> Missing — secret not configured
        </div>
      </div>
    </div>
  );
}
