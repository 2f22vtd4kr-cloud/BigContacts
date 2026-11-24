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
  const [label, setLabel] = useState("Checking");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const health = await fetchPublicHealth();
      if (cancelled) return;

      // This is intentionally only a coarse public readiness signal. Never expose
      // provider names, counts, rate limits, or secret state on the public shell.
      if (health?.researchKeysConfigured) {
        setState("degraded");
        setLabel("Keys configured");
      }

      // If an operator session exists, upgrade the coarse state to the precise
      // authenticated provider summary. If not, keep the honest public signal.
      try {
        const status = await fetchSystemStatus(BASE || "");
        if (cancelled) return;
        const summary = summarizeApiKeys(status);
        if (summary.active > 0) {
          setState(summary.rateLimited > 0 ? "degraded" : "ok");
          setLabel(`${summary.active} active`);
          return;
        }
        if (summary.configured > 0 || summary.rateLimited > 0) {
          setState("degraded");
          setLabel("Limited");
          return;
        }
        if (health?.researchKeysConfigured) {
          setState("degraded");
          setLabel("Keys configured");
        } else {
          setState("offline");
          setLabel("Keys off");
        }
      } catch {
        if (cancelled) return;
        if (!health?.researchKeysConfigured) {
          setState("offline");
          setLabel("Keys off");
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
      ? "text-[#1F8A4D] border-[#E4E4DF] bg-[#F3F3F0]"
      : state === "degraded"
        ? "text-[#EDB92B] border-[#E4E4DF] bg-[#F3F3F0]"
        : state === "loading"
          ? "text-[#74747A] border-[#E4E4DF] bg-[#FAFAF8]"
          : "text-[#C8321E] border-[#E4E4DF] bg-[#F3F3F0]";

  return (
    <Link
      href="/status"
      data-testid="link-api-key-health"
      aria-label={`API key status: ${label}`}
      title="Open System status"
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 rounded-md border px-2 font-mono text-[11px] font-medium transition-colors hover:opacity-90 sm:text-[13px]",
        tone,
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="whitespace-nowrap tabular-nums">{label}</span>
    </Link>
  );
}
