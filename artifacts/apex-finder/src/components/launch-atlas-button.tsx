import { useState } from "react";
import { useLocation } from "wouter";
import { Crosshair, Loader2, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  launchAtlasPipeline,
  stopAtlasPipeline,
  pauseAtlasPipeline,
  resumeAtlasPipeline,
  type LaunchAtlasOptions,
} from "@/lib/launch-atlas";
import { useAtlasRun } from "@/lib/use-atlas-run";
import { LiquidMetalSurface } from "@/components/liquid-metal-surface";

type Variant = "primary" | "header" | "reactor" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "atlas-launch-glow h-12 w-full sm:w-auto px-7 text-sm tracking-tight",
  header:
    "h-9 w-9 sm:w-auto sm:px-3.5 text-[11px] font-bold tracking-wide rounded-full bg-[#9CFF1A]/12 text-[#9CFF1A] border border-[#9CFF1A]/40 hover:bg-[#9CFF1A]/20 hover:border-[#b8ff4d]/50 active:scale-[0.97] active:brightness-95",
  reactor:
    "atlas-launch-glow h-11 w-full sm:w-auto px-5 text-xs",
  ghost:
    "atlas-outline-btn h-10 px-4 text-xs font-semibold active:scale-[0.97]",
};

const VARIANT_RUNNING: Record<Variant, string> = {
  primary:
    "h-12 w-full sm:w-auto px-7 text-sm tracking-tight rounded-xl border border-[#9CFF1A]/45 bg-[#9CFF1A]/15 text-[#9CFF1A] shadow-[0_0_28px_rgba(156,255,26,0.2)]",
  header:
    "h-9 w-9 sm:w-auto sm:px-3.5 text-[11px] font-bold tracking-wide rounded-full bg-[#9CFF1A]/18 text-[#9CFF1A] border border-[#9CFF1A]/50",
  reactor:
    "h-11 w-full sm:w-auto px-5 text-xs rounded-xl border border-[#9CFF1A]/45 bg-[#9CFF1A]/15 text-[#9CFF1A]",
  ghost:
    "h-10 px-4 text-xs font-semibold rounded-xl border border-[#9CFF1A]/35 bg-[#9CFF1A]/10 text-[#9CFF1A]",
};

const CTRL =
  "atlas-pressable relative z-10 inline-flex h-9 min-w-[4.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60";
const CTRL_PAUSE =
  "border border-amber-400/45 bg-[#1a1408] text-amber-100 hover:bg-amber-500/20 focus-visible:ring-amber-400/40";
const CTRL_RESUME =
  "border border-[#9CFF1A]/45 bg-[#0f1a08] text-[#9CFF1A] hover:bg-[#9CFF1A]/20 focus-visible:ring-lime-400/40";
const CTRL_STOP =
  "border border-rose-400/45 bg-[#1a0c10] text-rose-200 hover:bg-rose-500/20 focus-visible:ring-rose-400/40";

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
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const { run, refresh } = useAtlasRun(4_000);

  const paused = run.status === "paused";
  const running = (run.active || busy) && !paused;
  const inFlight = run.active || busy || paused;

  const handleLaunch = async () => {
    if (inFlight) {
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

  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    setStatus(null);
    const result = await stopAtlasPipeline(run.jobId);
    setStopping(false);
    setStatus(result.message);
    void refresh();
  };

  const handlePause = async () => {
    if (pausing || paused) return;
    setPausing(true);
    setStatus(null);
    const result = await pauseAtlasPipeline(run.jobId);
    setPausing(false);
    setStatus(result.message);
    void refresh();
  };

  const handleResume = async () => {
    if (pausing || !paused) return;
    setPausing(true);
    setStatus(null);
    const result = await resumeAtlasPipeline(run.jobId);
    setPausing(false);
    setStatus(result.message);
    void refresh();
  };

  const idleLabel =
    label ?? (variant === "header" ? "Launch Atlas" : "Launch Apex Atlas");

  const runningLabel = busy
    ? "Launching…"
    : paused
      ? variant === "header"
        ? "Paused"
        : "Atlas paused"
      : run.targetName
        ? variant === "header"
          ? "Researching"
          : `Researching ${run.targetName}`
        : variant === "header"
          ? "Atlas live"
          : "Atlas researching…";

  /** Shared control strip: Pause/Resume + Stop with real gaps (no pile-up, no green launch). */
  const controls = inFlight ? (
    <div
      className={cn(
        "relative z-20 flex shrink-0 flex-nowrap items-center gap-2 sm:gap-2.5",
        variant === "header" ? "flex-row" : "flex-row flex-wrap",
      )}
      role="group"
      aria-label="Atlas run controls"
    >
      {paused ? (
        <button
          type="button"
          onClick={handleResume}
          disabled={pausing || stopping}
          data-testid="button-resume-apex-atlas"
          aria-label="Resume Atlas research"
          className={cn(CTRL, CTRL_RESUME)}
        >
          {pausing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Play className="h-3 w-3 fill-current" aria-hidden />
          )}
          <span>{pausing ? "…" : "Resume"}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePause}
          disabled={pausing || stopping || busy}
          data-testid="button-pause-apex-atlas"
          aria-label="Pause Atlas research"
          className={cn(CTRL, CTRL_PAUSE)}
        >
          {pausing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Pause className="h-3 w-3 fill-current" aria-hidden />
          )}
          <span>{pausing ? "…" : "Pause"}</span>
        </button>
      )}
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        data-testid="button-stop-apex-atlas"
        aria-label="Stop Atlas research"
        className={cn(CTRL, CTRL_STOP)}
      >
        {stopping ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Square className="h-3 w-3 fill-current" aria-hidden />
        )}
        <span>{stopping ? "…" : "Stop"}</span>
      </button>
    </div>
  ) : null;

  // Header while in-flight: only Pause/Resume + Stop (no green launch icon pile-up)
  if (variant === "header" && inFlight) {
    return controls;
  }

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-2.5",
        variant === "header" ? "flex-row items-center justify-end" : "flex-col sm:flex-row sm:items-center",
      )}
    >
      <button
        type="button"
        onClick={handleLaunch}
        disabled={busy || stopping || pausing}
        data-testid="button-launch-apex-atlas"
        data-atlas-running={running ? "true" : "false"}
        data-atlas-paused={paused ? "true" : "false"}
        aria-label={
          inFlight
            ? "Atlas research is active — open reactor desk"
            : "Launch Apex Atlas research pipeline"
        }
        className={cn(
          "atlas-pressable inline-flex items-center justify-center gap-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
          inFlight ? VARIANT_RUNNING[variant] : VARIANT_CLASS[variant],
          flash && "atlas-click-flash",
          className,
        )}
      >
        {(variant === "primary" || variant === "reactor") && !inFlight && (
          <LiquidMetalSurface />
        )}
        <span
          className={cn(
            (variant === "primary" || variant === "reactor") && !inFlight && "atlas-liquid-label",
            "inline-flex items-center gap-2",
          )}
        >
          {(busy || running) && (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          )}
          {variant === "header" && !inFlight && (
            <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span
            className={cn(
              "truncate max-w-[14rem] sm:max-w-none",
              variant === "header" && "hidden sm:inline",
              (variant === "primary" || variant === "reactor") && !inFlight && "atlas-liquid-type",
            )}
            aria-hidden={false}
          >
            {(variant === "primary" || variant === "reactor") && !inFlight
              ? (idleLabel).split("").map((ch, i) =>
                  ch === " " ? (
                    <span key={`s-${i}`} className="atlas-liquid-char is-space">
                      {"\u00a0"}
                    </span>
                  ) : (
                    <span
                      key={`${ch}-${i}`}
                      className="atlas-liquid-char"
                      style={{ animationDelay: `${i * 0.07}s` }}
                    >
                      {ch}
                    </span>
                  ),
                )
              : inFlight
                ? runningLabel
                : idleLabel}
          </span>
        </span>
      </button>

      {variant !== "header" && controls}

      {status && (
        <p
          className={cn(
            "w-full text-[10px] leading-relaxed font-mono",
            variant === "header" && "text-right",
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
