/**
 * Compact header chip: API key / provider health.
 * Soft-fails offline so the shell still renders.
 * Falls back to /api/healthz when /api/system/status is slow or fails —
 * so Overview never shows KEYS OFF while the ledger shows 5 LIVE.
 */
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { fetchSystemStatus, summarizeApiKeys } from "@/lib/system-status";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ChipState = "loading" | "ok" | "degraded" | "offline";

async function countLiveFromHealthz(): Promise<number | null> {
  try {
    const r = await fetch(`${BASE}/api/healthz`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    const prov = j.providers ?? {};
    const lanes = j.lanesHonesty ?? {};
    let n = 0;
    for (const k of ["groq", "gemini", "tavily", "exa", "mistral", "nvidiaNim", "serper", "companiesHouse", "scrapfly", "zenrows"] as const) {
      const v = prov[k] ?? lanes[k];
      if (typeof v === "number" && v > 0) n += v;
    }
    // Prefer lane aggregates when they are higher (honest total capacity)
    const web = typeof lanes.webSearchActive === "number" ? lanes.webSearchActive : 0;
    const agentic = typeof lanes.agenticLlmSlots === "number" ? lanes.agenticLlmSlots : 0;
    n = Math.max(n, web + agentic, web, agentic);
    return n > 0 ? n : 0;
  } catch {
    return null;
  }
}

export function ApiKeyHealth({ className }: { className?: string }) {
  const [state, setState] = useState<ChipState>("loading");
  const [label, setLabel] = useState("KEYS");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      // Prefer healthz first — includes serper/mistral/nvidiaNim/webSearchActive.
      // system/status alone can under-count and paint false KEYS OFF (LIVE-18).
      const hz = await countLiveFromHealthz();
      if (cancelled) return;
      if (hz != null && hz > 0) {
        setState("ok");
        setLabel(`${hz} LIVE`);
        // Still merge system/status for rate-limit tone when available
        try {
          const status = await fetchSystemStatus(BASE || "");
          if (cancelled) return;
          const summary = summarizeApiKeys(status);
          if (summary.rateLimited > 0) {
            setState("degraded");
            if (summary.active > 0) setLabel(`${Math.max(hz, summary.active)} LIVE`);
          } else if (summary.active > hz) {
            setLabel(`${summary.active} LIVE`);
          }
        } catch {
          /* healthz already won */
        }
        return;
      }
      try {
        const status = await fetchSystemStatus(BASE || "");
        if (cancelled) return;
        const summary = summarizeApiKeys(status);
        if (summary.active > 0) {
          setState(summary.rateLimited > 0 ? "degraded" : "ok");
          setLabel(`${summary.active} LIVE`);
          return;
        }
        if (summary.configured > 0 || summary.rateLimited > 0) {
          setState("degraded");
          setLabel("LIMITED");
          return;
        }
        setState("offline");
        setLabel("KEYS OFF");
      } catch {
        if (cancelled) return;
        setState("offline");
        setLabel("KEYS OFF");
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const tone =
    state === "ok"
      ? "text-[#d4ff8a] border-[#9CFF1A]/30 bg-lime-500/10"
      : state === "degraded"
        ? "text-[#d4ff8a] border-[#9CFF1A]/30 bg-[#9CFF1A]/10"
        : state === "loading"
          ? "text-muted-foreground border-border bg-card/40"
          : "text-rose-300 border-rose-400/30 bg-rose-500/10";

  return (
    <Link
      href="/status"
      data-testid="link-api-key-health"
      aria-label={`API key status: ${label}`}
      title="Open System status"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border px-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors hover:opacity-90 sm:gap-1.5 sm:px-2.5 sm:text-[13px]",
        tone,
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
      ) : (
        <KeyRound className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="whitespace-nowrap tabular-nums">{label}</span>
    </Link>
  );
}
