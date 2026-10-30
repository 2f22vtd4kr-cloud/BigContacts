/**
 * System Status — canonical Groq roles, active search capability keys,
 * and database health. Specialist worker attestation is shown on Data Sources.
 * Auto-refreshes every 30 seconds.
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

interface AIKeySlot {
  index: number;
  state: "active" | "rate_limited" | "missing";
  expiresAt: string | null;
}
type AIKeyStatus = Partial<Record<"groqInvestigator" | "tavily" | "exa" | "serper", AIKeySlot[]>>;
interface RoleStatus { configured: boolean; model: string; provider?: string }
interface UpstashSlot { slot: number; status: string; quotaExhausted: boolean; latencyMs?: number | null }
interface SystemStatus {
  ai?: AIKeyStatus;
  groqBoss?: RoleStatus;
  groqRightHand?: RoleStatus;
  databases?: {
    postgres?: { status: string; latencyMs: number | null };
    localRedis?: { status: string; latencyMs: number | null };
    upstash?: UpstashSlot[];
  };
  lanesHonesty?: {
    bureauIntegrity?: string;
    bureauIntegrityReasons?: string[];
    agenticLlmSlots?: number;
    webSearchActive?: number;
    agenticLlmLastOk?: boolean | null;
    agenticLlmLastModel?: string | null;
  };
  bureauIntegrity?: string;
  bureauIntegrityReasons?: string[];
  generatedAt?: string;
  cached?: boolean;
  cachedAgoMs?: number;
}

const POOLS: Array<{ key: keyof AIKeyStatus; label: string; description: string }> = [
  { key: "groqInvestigator", label: "Groq Investigator capabilities", description: "Separately selectable credentials; the Boss selects a capability for the case." },
  { key: "serper", label: "Serper search", description: "Investigator-selected web-search capability." },
  { key: "tavily", label: "Tavily search", description: "Investigator-selected web-search capability." },
  { key: "exa", label: "Exa search", description: "Investigator-selected semantic-search capability." },
];

function SlotBar({ active, cooling }: { active: number; cooling: number }) {
  const total = active + cooling;
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-muted/35" aria-label="No configured keys" />;
  return (
    <div className="flex h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-muted/25" role="img" aria-label={`${active} active, ${cooling} cooling`}>
      {Array.from({ length: active }, (_, i) => <span key={`a-${i}`} className="h-full flex-1 bg-[#9CFF1A]" />)}
      {Array.from({ length: cooling }, (_, i) => <span key={`c-${i}`} className="h-full flex-1 bg-[#9CFF1A]/60 animate-pulse" />)}
    </div>
  );
}

function PoolCard({ label, description, slots }: { label: string; description: string; slots: AIKeySlot[] }) {
  const active = slots.filter((slot) => slot.state === "active").length;
  const cooling = slots.filter((slot) => slot.state === "rate_limited").length;
  const configured = slots.filter((slot) => slot.state !== "missing").length;
  return (
    <article className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground">
          {active ? `${active} active` : cooling ? `${cooling} cooling` : "none"}
        </span>
      </div>
      <SlotBar active={active} cooling={cooling} />
      <p className="text-[10px] font-mono text-muted-foreground">{configured ? `${configured} configured slot(s)` : "No credentials configured"}</p>
    </article>
  );
}

function RoleCard({ label, role }: { label: string; role?: RoleStatus }) {
  return (
    <article className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className={cn("rounded-md border px-2 py-1 text-[10px] font-mono uppercase", role?.configured ? "border-[#9CFF1A]/30 text-[#b8ff4d]" : "border-border text-muted-foreground")}>
          {role?.configured ? "configured" : "not configured"}
        </span>
      </div>
      <p className="mt-2 text-[11px] font-mono text-muted-foreground">{role?.model ?? "Model not resolved"}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {label === "Groq Boss" ? "Case direction and Investigator-capability selection; no browsing." : "Independent bounded case-file oversight; no browsing or tool selection."}
      </p>
    </article>
  );
}

function DbRow({ label, status, latency, icon: Icon }: { label: string; status: string; latency: number | null; icon: React.ElementType }) {
  const ok = status === "ok" || status === "ready";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", ok ? "text-primary" : "text-muted-foreground")} />
        <span className="font-mono text-xs text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {latency !== null && <span className="font-mono text-[10px] text-muted-foreground">{latency}ms</span>}
        <span className={cn("font-mono text-[10px] font-bold uppercase", ok ? "text-primary" : "text-muted-foreground")}>{status || "unknown"}</span>
      </div>
    </div>
  );
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [integrity, setIntegrity] = useState<{ level: string; reasons: string[]; agenticSlots?: number; webSearch?: number; lastOk?: boolean | null; lastModel?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const loadIntegrity = async (snapshot?: SystemStatus) => {
    const lanes = snapshot?.lanesHonesty;
    if (lanes) {
      setIntegrity({
        level: snapshot?.bureauIntegrity ?? lanes.bureauIntegrity ?? "ok",
        reasons: snapshot?.bureauIntegrityReasons ?? lanes.bureauIntegrityReasons ?? [],
        agenticSlots: lanes.agenticLlmSlots,
        webSearch: lanes.webSearchActive,
        lastOk: lanes.agenticLlmLastOk,
        lastModel: lanes.agenticLlmLastModel,
      });
      return;
    }
    try {
      const response = await fetch(`${BASE}/api/healthz`);
      if (!response.ok) return;
      const health = await response.json();
      const current = health?.lanesHonesty ?? {};
      setIntegrity({
        level: current.bureauIntegrity ?? (health?.registryShallowRisk ? "critical" : "ok"),
        reasons: current.bureauIntegrityReasons ?? [],
        agenticSlots: current.agenticLlmSlots,
        webSearch: current.webSearchActive,
        lastOk: current.agenticLlmLastOk,
        lastModel: current.agenticLlmLastModel,
      });
    } catch { /* optional health detail */ }
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      if (isMockMode()) {
        const mock = mockSystemStatus() as SystemStatus;
        setStatus(mock);
        setError(null);
        await loadIntegrity(mock);
      } else {
        const response = await fetch(`${BASE}/api/system/status`);
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
        setStatus(data as SystemStatus);
        setError(null);
        await loadIntegrity(data as SystemStatus);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load system status.");
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = window.setInterval(() => void fetchStatus(), 30_000);
    return () => window.clearInterval(interval);
  }, [fetchStatus]);

  const pools = POOLS.map((pool) => ({ ...pool, slots: status?.ai?.[pool.key] ?? [] }));
  const activeCount = pools.reduce((sum, pool) => sum + pool.slots.filter((slot) => slot.state === "active").length, 0);
  const upstashSlots = status?.databases?.upstash ?? [];

  return (
    <div className="atlas-page max-w-4xl space-y-5 sm:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">System status</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
            Canonical Groq reasoning roles, Investigator/search capabilities, specialist-worker attestation,
            and database health. Retired model providers are not displayed as active services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && <span className="font-mono text-[10px] text-muted-foreground">Updated {lastFetch.toLocaleTimeString()}</span>}
          <button onClick={() => void fetchStatus()} disabled={loading} className="atlas-outline-btn atlas-pressable flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[11px] disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3" role="alert">
          <div className="flex items-center gap-2 text-xs font-semibold text-destructive"><AlertCircle className="h-4 w-4" /> Status unavailable</div>
          <p className="mt-1 text-[11px] text-muted-foreground">{error}</p>
        </div>
      )}

      {status && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            {activeCount} active configured capability/search key slot(s)
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{status.cached ? `Cached · ${Math.round((status.cachedAgoMs ?? 0) / 1000)}s` : "Live snapshot"}</span>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-foreground"><Zap className="h-4 w-4 text-primary" /> Control-plane roles</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RoleCard label="Groq Boss" role={status?.groqBoss} />
          <RoleCard label="Groq Right-hand" role={status?.groqRightHand} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-foreground">Investigator and web-search capability keys</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pools.map((pool) => <PoolCard key={pool.key} label={pool.label} description={pool.description} slots={pool.slots} />)}
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          A configured key is not proof of provider quota or successful live research. The Investigator chooses
          among enabled capabilities; these rows do not prescribe a search order.
        </p>
      </section>

      {integrity && integrity.level !== "ok" && (
        <section className={cn("rounded-2xl border px-4 py-3", integrity.level === "critical" ? "border-rose-500/40 bg-rose-950/30" : "border-[#9CFF1A]/25 bg-[#9CFF1A]/5")} data-testid="status-bureau-integrity">
          <h2 className="text-xs font-semibold text-foreground">{integrity.level === "critical" ? "Bureau integrity critical" : "Bureau degraded"}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
            {(integrity.reasons.length ? integrity.reasons : ["See /api/healthz lanesHonesty"]).slice(0, 6).map((reason, index) => <li key={index}>{reason}</li>)}
          </ul>
          <p className="mt-2 text-[10px] font-mono text-muted-foreground">
            Investigator slots: {integrity.agenticSlots ?? "—"} · Web search: {integrity.webSearch ?? "—"} · Last step: {integrity.lastOk === false ? "failed" : integrity.lastOk === true ? `ok (${integrity.lastModel ?? "—"})` : "not exercised"}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-foreground"><Database className="h-4 w-4 text-primary" /> Databases</h2>
        <div className="space-y-2">
          <DbRow label="PostgreSQL" status={status?.databases?.postgres?.status ?? "unknown"} latency={status?.databases?.postgres?.latencyMs ?? null} icon={Server} />
          <DbRow label="Redis" status={status?.databases?.localRedis?.status ?? "unknown"} latency={status?.databases?.localRedis?.latencyMs ?? null} icon={Layers} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-foreground"><Wifi className="h-4 w-4 text-primary" /> Upstash cache slots</h2>
        {upstashSlots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No Upstash slots configured.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {upstashSlots.map((slot) => (
              <div key={slot.slot} className="rounded-xl border border-border bg-card/30 px-3 py-3 text-center">
                <div className="text-[10px] font-mono text-muted-foreground">Slot {slot.slot}</div>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  {slot.quotaExhausted ? <WifiOff className="h-3.5 w-3.5 text-amber-400" /> : slot.status === "ready" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{slot.quotaExhausted ? "quota" : slot.status}</span>
                </div>
                {typeof slot.latencyMs === "number" && <div className="mt-1 text-[10px] text-muted-foreground">{slot.latencyMs}ms</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
