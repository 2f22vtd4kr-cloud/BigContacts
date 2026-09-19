/**
 * Compact header chip: API key / provider health.
 * Soft-fails offline so the shell still renders.
 * Public healthz exposes only a coarse key-readiness bit; detailed provider
 * counts remain behind the authenticated system-status endpoint.
 */
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { fetchSystemStatus, summarizeApiKeys } from "@/lib/system-status";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ChipState = "loading" | "ok" | "degraded" | "offline";

type PublicHealth = {
  researchKeysConfigured?: boolean;
};

async function fetchPublicHealth(): Promise<PublicHealth | null> {
  try {
    const r = await fetch(`${BASE}/api/healthz`, { cache: "no-store", credentials: "same-origin" });
    if (!r.ok) return null;
    return (await r.json()) as PublicHealth;
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
      const health = await fetchPublicHealth();
      if (cancelled) return;

      // This is intentionally only a coarse public readiness signal. Never expose
      // provider names, counts, rate limits, or secret state on the public shell.
      if (health?.researchKeysConfigured) {
        setState("ok");
        setLabel("KEYS SET");
      }

      // If an operator session exists, upgrade the coarse state to the precise
      // authenticated provider summary. If not, keep the honest public signal.
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
        if (!health?.researchKeysConfigured) {
          setState("offline");
          setLabel("KEYS OFF");
        }
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
