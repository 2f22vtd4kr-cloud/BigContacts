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

type Variant = "primary" | "header" | "reactor" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  // Clean solid CTA — no WebGL/oil noise (desktop + mobile identical language)
  primary:
    "atlas-launch-cta relative min-h-[3.25rem] h-13 w-full sm:w-auto min-w-[11rem] px-8 text-[15px] font-extrabold tracking-[0.03em] rounded-full",
  header:
    "atlas-launch-cta relative h-8 shrink-0 px-2.5 text-[11px] font-extrabold tracking-wide rounded-full whitespace-nowrap sm:h-9 sm:px-3.5 sm:text-[12px]",
  reactor:
    "atlas-launch-cta relative min-h-[3rem] h-12 w-full sm:w-auto min-w-[12rem] px-8 text-[15px] font-extrabold tracking-[0.03em] rounded-full",
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
/* State actions — static palette (not animated primary) */
const CTRL_PAUSE =
  "border border-amber-400/45 bg-[#1a1408] text-amber-100 hover:bg-amber-500/20 focus-visible:ring-amber-400/40";
const CTRL_RESUME =
  "atlas-btn-success focus-visible:ring-[rgba(156,255,26,0.45)]";
const CTRL_STOP =
  "atlas-btn-danger focus-visible:ring-[rgba(255,77,109,0.45)]";

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
  const [launchDepth, setLaunchDepth] = useState<"fast" | "standard" | "deep">(opts?.researchDepth ?? "standard");
  const { run, refresh } = useAtlasRun(8_000);

  const paused = run.status === "paused";
  const running = (run.active || busy) && !paused;
  const inFlight = run.active || busy || paused;

  const handleLaunch = async () => {
    if (inFlight) {
      if (navigateToReactor) setLocation("/reactor");
      return;
    }
    // Soft gate: warn when bureau integrity is critical (still allow launch)
    try {
      const hr = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/healthz`, {
        credentials: "same-origin",
      });
      if (hr.ok) {
        const hj = await hr.json();
        const level = hj.bureauIntegrity ?? hj.lanesHonesty?.bureauIntegrity;
        if (level === "critical") {
          const reasons = (hj.bureauIntegrityReasons ?? hj.lanesHonesty?.bureauIntegrityReasons ?? [])
            .slice(0, 2)
            .join("; ");
          setStatus(
            `bureauIntegrity=critical — research will underperform. ${reasons || "Check secrets + restart API."} Launching anyway…`,
          );
        }
      }
    } catch {
      /* healthz optional — still launch */
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 480);
    setBusy(true);
    const result = await launchAtlasPipeline({ ...opts, researchDepth: opts?.researchDepth ?? launchDepth });
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
    label ?? (variant === "header" ? "Launch" : "Launch Apex Atlas");

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
  // Keep in document flow with padding so Pause/Stop are never clipped under app chrome
  if (variant === "header" && inFlight) {
    return (
      <div
        className="flex min-h-[40px] flex-shrink-0 items-center justify-end gap-2 py-1 pl-2"
        data-testid="atlas-header-inflight-controls"
        style={{ position: "relative", zIndex: 30 }}
      >
        {controls}
      </div>
    );
  }

  // Mobile-safe: keep Pause/Stop in document flow (never fixed under browser chrome)
  if (inFlight && (variant === "primary" || variant === "reactor")) {
    return (
      <div
        className="flex w-full flex-col gap-2"
        data-testid="atlas-inflight-controls"
      >
        <div
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#9CFF1A]/45 bg-[#9CFF1A]/12 px-4 py-3 text-sm font-semibold text-[#9CFF1A]",
            flash && "atlas-click-flash",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          <span className="truncate">{runningLabel}</span>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2">{controls}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-2.5",
        variant === "header" ? "flex-row items-center justify-end" : "flex-col sm:flex-row sm:items-center",
      )}
    >
      {variant !== "header" && !opts?.researchDepth && !inFlight && (
        <select
          aria-label="Research depth"
          data-testid="select-launch-depth"
          value={launchDepth}
          onChange={(e) => {
            const v = e.target.value;
            setLaunchDepth(v === "deep" ? "deep" : v === "fast" ? "fast" : "standard");
          }}
          className="rounded-lg border border-border bg-background/80 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          title="fast / standard / deep — free dig budget only"
        >
          <option value="fast">Depth · fast</option>
          <option value="standard">Depth · standard</option>
          <option value="deep">Depth · deep</option>
        </select>
      )}
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
            : "Launch Apex Atlas free dig"
        }
        className={cn(
          "atlas-pressable inline-flex items-center justify-center gap-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
          inFlight ? VARIANT_RUNNING[variant] : VARIANT_CLASS[variant],
          flash && "atlas-click-flash",
          className,
        )}
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          {(busy || running) && (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          )}
          {variant === "header" && !inFlight && (
            <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span className="whitespace-nowrap">
            {inFlight ? runningLabel : idleLabel}
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
