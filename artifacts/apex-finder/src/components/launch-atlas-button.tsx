import { useState } from "react";
import { useLocation } from "wouter";
import { Crosshair, Loader2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { launchAtlasPipeline, type LaunchAtlasOptions } from "@/lib/launch-atlas";
import { useAtlasRun } from "@/lib/use-atlas-run";

type Variant = "primary" | "header" | "reactor" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "atlas-launch-glow h-12 w-full sm:w-auto px-7 text-sm tracking-tight",
  header:
    "h-9 px-3.5 text-[11px] font-bold tracking-wide rounded-full bg-[#eab308]/12 text-[#fde047] border border-[#eab308]/40 hover:bg-[#eab308]/20 hover:border-[#facc15]/50 active:scale-[0.97] active:brightness-95",
  reactor:
    "atlas-launch-glow h-11 w-full sm:w-auto px-5 text-xs",
  ghost:
    "atlas-outline-btn h-10 px-4 text-xs font-semibold active:scale-[0.97]",
};

const VARIANT_RUNNING: Record<Variant, string> = {
  primary:
    "h-12 w-full sm:w-auto px-7 text-sm tracking-tight rounded-xl border border-[#eab308]/45 bg-[#eab308]/15 text-[#fde047] shadow-[0_0_28px_rgba(234,179,8,0.2)]",
  header:
    "h-9 px-3.5 text-[11px] font-bold tracking-wide rounded-full bg-[#eab308]/18 text-[#fde047] border border-[#eab308]/50",
  reactor:
    "h-11 w-full sm:w-auto px-5 text-xs rounded-xl border border-[#eab308]/45 bg-[#eab308]/15 text-[#fde047]",
  ghost:
    "h-10 px-4 text-xs font-semibold rounded-xl border border-[#eab308]/35 bg-[#eab308]/10 text-[#fde047]",
};

export function LaunchAtlasButton({
  variant = "primary",
  className,
  label,
  opts,
  navigateToReactor = true,
  onLaunched,
}: {
  variant?: Variant;
  className?: string;
  label?: string;
  opts?: LaunchAtlasOptions;
  navigateToReactor?: boolean;
  onLaunched?: (result: Awaited<ReturnType<typeof launchAtlasPipeline>>) => void;
}) {
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const { run, refresh } = useAtlasRun(4_000);

  const running = run.active || busy;

  const handleLaunch = async () => {
    if (running) {
      if (navigateToReactor) setLocation("/reactor");
      return;
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 480);
    setBusy(true);
    setStatus(null);
    const result = await launchAtlasPipeline(opts);
    setBusy(false);
    setStatus(result.message);
    onLaunched?.(result);
    void refresh();

    if (result.ok && (result.alreadyRunning || navigateToReactor)) {
      setLocation("/reactor");
    }
  };

  const idleLabel =
    label ?? (variant === "header" ? "Launch Atlas" : "Launch Apex Atlas");

  const runningLabel = busy
    ? "Launching…"
    : run.targetName
      ? variant === "header"
        ? "Researching"
        : `Researching ${run.targetName}`
      : variant === "header"
        ? "Atlas live"
        : "Atlas researching…";

  return (
    <div className={cn("flex flex-col gap-2", variant === "header" && "items-end")}>
      <button
        type="button"
        onClick={handleLaunch}
        disabled={busy}
        data-testid="button-launch-apex-atlas"
        data-atlas-running={running ? "true" : "false"}
        aria-label={
          running
            ? "Atlas research is running — open reactor desk"
            : "Launch Apex Atlas research pipeline"
        }
        title={
          running
            ? run.message || "Research in progress — open reactor"
            : undefined
        }
        className={cn(
          "atlas-pressable inline-flex items-center justify-center gap-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
          running ? VARIANT_RUNNING[variant] : VARIANT_CLASS[variant],
          flash && "atlas-click-flash",
          className,
        )}
      >
        {busy || run.active ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        ) : variant === "header" ? (
          <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Radar className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="truncate max-w-[16rem] sm:max-w-none">
          {running ? runningLabel : idleLabel}
        </span>
      </button>
      {status && !running && (
        <p
          className={cn(
            "max-w-md text-[10px] leading-relaxed font-mono",
            variant === "header" && "text-right max-w-[12rem]",
            status.toLowerCase().includes("fail") ||
              status.toLowerCase().includes("could not") ||
              status.toLowerCase().includes("not reachable")
              ? "text-rose-300/90"
              : "text-muted-foreground",
          )}
          role="status"
          data-testid="text-launch-atlas-status"
        >
          {status}
        </p>
      )}
    </div>
  );
}
