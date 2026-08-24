/**
 * Operator announcement when the bureau cannot out-perform a general agent
 * (dead agentic LLM, zero web search, last ReAct step failed across providers).
 */
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type IntegrityPayload = {
  bureauIntegrity?: "ok" | "degraded" | "critical";
  bureauIntegrityReasons?: string[];
  agenticLlmSlots?: number;
  agenticLlmLastOk?: boolean | null;
  webSearchActive?: number;
};

export function BureauIntegrityBanner() {
  const [payload, setPayload] = useState<IntegrityPayload | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${BASE}/api/healthz`, { credentials: "same-origin" });
        if (!res.ok) return;
        const data = await res.json();
        const lanes = data.lanesHonesty ?? {};
        if (!cancelled) {
          setPayload({
            bureauIntegrity: lanes.bureauIntegrity ?? (data.registryShallowRisk ? "critical" : "ok"),
            bureauIntegrityReasons: lanes.bureauIntegrityReasons ?? [],
            agenticLlmSlots: lanes.agenticLlmSlots,
            agenticLlmLastOk: lanes.agenticLlmLastOk,
            webSearchActive: lanes.webSearchActive,
          });
        }
      } catch {
        /* offline */
      }
    };
    load();
    const id = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (dismissed || !payload) return null;
  const level = payload.bureauIntegrity ?? "ok";
  if (level === "ok") return null;

  const reasons =
    payload.bureauIntegrityReasons?.length
      ? payload.bureauIntegrityReasons
      : level === "critical"
        ? ["Bureau control plane or web search is not healthy."]
        : ["Bureau is running in a reduced configuration."];

  const critical = level === "critical";

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="bureau-integrity-banner"
      className={
        critical
          ? "border-b border-rose-500/40 bg-rose-950/90 px-3 py-2.5 text-rose-50 sm:px-5"
          : "border-b border-lime-500/35 bg-lime-950/80 px-3 py-2.5 text-lime-50 sm:px-5"
      }
    >
      <div className="mx-auto flex max-w-[1400px] items-start gap-2.5">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${critical ? "text-rose-300" : "text-lime-300"}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold tracking-tight">
            {critical
              ? "Bureau is not functioning correctly"
              : "Bureau is degraded"}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug opacity-90">
            Apex is designed to beat general agents (Grok / Perplexity / Replit-class) via multi-LLM
            ReAct plus OSINT tools. Right now it may underperform those agents until this is fixed.
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] opacity-90">
            {reasons.slice(0, 4).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-wider">
            <Link href="/status" className="underline decoration-white/30 underline-offset-2 hover:decoration-white">
              System status
            </Link>
            <Link href="/reactor" className="underline decoration-white/30 underline-offset-2 hover:decoration-white">
              Reactor
            </Link>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss bureau warning"
          className="atlas-pressable rounded p-1 opacity-70 hover:opacity-100"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
