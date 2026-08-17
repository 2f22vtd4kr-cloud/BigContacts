/**
 * Compact header chip: API key / provider health.
 * Soft-fails offline so the shell still renders.
 */
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { fetchSystemStatus, summarizeApiKeys } from "@/lib/system-status";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ChipState = "loading" | "ok" | "degraded" | "offline";

export function ApiKeyHealth({ className }: { className?: string }) {
  const [state, setState] = useState<ChipState>("loading");
  const [label, setLabel] = useState("KEYS…");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await fetchSystemStatus(BASE || "");
        if (cancelled) return;
        const summary = summarizeApiKeys(status);
        if (summary.active > 0 && summary.rateLimited === 0) {
          setState("ok");
          setLabel(`${summary.active} KEYS`);
        } else if (summary.active > 0 || summary.configured > 0) {
          setState("degraded");
          setLabel(
            summary.rateLimited > 0
              ? `${summary.rateLimited} LTD`
              : `${summary.active}/${summary.configured}`,
          );
        } else {
          setState("offline");
          setLabel("KEYS OFF");
        }
      } catch {
        if (!cancelled) {
          setState("offline");
          setLabel("KEYS OFF");
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const tone =
    state === "ok"
      ? "text-yellow-200 border-yellow-400/30 bg-yellow-500/10"
      : state === "degraded"
        ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
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
        "inline-flex h-8 max-w-[6.5rem] items-center gap-1.5 truncate rounded-md border px-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors hover:opacity-90 sm:max-w-none sm:px-2.5 sm:text-[10px]",
        tone,
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
      ) : (
        <KeyRound className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
