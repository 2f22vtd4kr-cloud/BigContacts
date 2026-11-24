import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Minus, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_ATLAS_DISCOVERY_OBJECTIVE, launchAtlasPipeline, stopAtlasPipeline, type LaunchAtlasOptions } from "@/lib/launch-atlas";
import { useAtlasRun } from "@/lib/use-atlas-run";
import { isMockMode } from "@/lib/dev-mock-data";

type Variant = "primary" | "header" | "reactor" | "ghost";
type SourceReadiness = "ready" | "unavailable" | "unknown";
export type HomeSourceReadiness = { webSearch: SourceReadiness; registries: SourceReadiness; footprint: SourceReadiness };
function sourceLabel(label: string, readiness: SourceReadiness, apiUnavailable: boolean) {
  if (apiUnavailable || readiness === "ready") return label;
  return readiness === "unavailable" ? `${label} unavailable` : `${label} status unreported`;
}

const VARIANT_CLASS: Record<Variant, string> = {
  // Keep the home-page primary CTA on the same 48px visual rail as Reactor/Discover.
  // The previous h-13/min-h-[3.25rem] made the launch button visibly taller.
  primary: "atlas-launch-cta relative h-12 min-h-12 w-full px-8 text-[15px] font-medium rounded-lg",
  header: "atlas-launch-cta relative h-9 shrink-0 px-3 text-[12px] font-medium rounded-lg whitespace-nowrap",
  reactor: "atlas-launch-cta relative min-h-[3rem] h-12 w-full sm:w-auto min-w-[12rem] px-8 text-[15px] font-medium rounded-lg",
  ghost: "atlas-outline-btn h-10 px-4 text-xs font-semibold active:scale-[0.97]",
};

const VARIANT_RUNNING: Record<Variant, string> = {
  primary: "h-12 w-full px-7 text-sm rounded-lg border border-[#E5E5E1] bg-[#F3F3F0] text-[#55555A]",
  header: "h-9 shrink-0 px-3 text-[12px] font-medium rounded-lg border border-[#E5E5E1] bg-[#F3F3F0] text-[#55555A]",
  reactor: "h-11 w-full sm:w-auto px-5 text-sm font-medium rounded-lg border border-[#E5E5E1] bg-[#F3F3F0] text-[#55555A]",
  ghost: "h-10 px-4 text-xs font-medium rounded-lg border border-[#E5E5E1] bg-white text-[#55555A]",
};

const CTRL = "atlas-pressable relative z-10 inline-flex h-9 min-w-[4.5rem] shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-colors duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2757C6]/50 disabled:opacity-60";
const CTRL_STOP = "atlas-btn-danger focus-visible:ring-[rgba(255,77,109,0.45)]";

export function LaunchAtlasButton({
  variant = "primary",
  className,
  label,
  opts,
  navigateToReactor = true,
  onLaunched,
  apiUnavailable = false,
  onRetryApi,
  sourceStatuses = { webSearch: "unknown", registries: "unknown", footprint: "unknown" },
}: {
  variant?: Variant;
  className?: string;
  label?: string;
  opts?: LaunchAtlasOptions;
  navigateToReactor?: boolean;
  onLaunched?: (result: Awaited<ReturnType<typeof launchAtlasPipeline>>) => void;
  apiUnavailable?: boolean;
  onRetryApi?: () => void;
  sourceStatuses?: HomeSourceReadiness;
}) {
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [launchDepth, setLaunchDepth] = useState<"fast" | "standard" | "deep">(opts?.researchDepth ?? "standard");
  const [launchTargetCount, setLaunchTargetCount] = useState(Math.min(25, Math.max(1, opts?.targetCount ?? (variant === "primary" ? 25 : 1))));
  const [launchObjective, setLaunchObjective] = useState(opts?.discoveryObjective ?? (variant === "primary" ? "" : DEFAULT_ATLAS_DISCOVERY_OBJECTIVE));
  const [objectiveLimit, setObjectiveLimit] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    void fetch(`${base}/api/healthz`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Launch configuration unavailable (${response.status}).`);
        return response.json() as Promise<{ launchLimits?: { discoveryObjectiveMaxChars?: unknown } }>;
      })
      .then((payload) => {
        const limit = payload.launchLimits?.discoveryObjectiveMaxChars;
        if (active && typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0) setObjectiveLimit(limit);
      })
      .catch(() => {
        if (active) setStatus("Atlas launch configuration is unavailable. Retry when the API is back.");
      });
    return () => { active = false; };
  }, []);
  const { run, refresh } = useAtlasRun(8_000);

  useEffect(() => {
    if (objectiveLimit !== null) setLaunchObjective((value) => value.slice(0, objectiveLimit));
  }, [objectiveLimit]);

  const running = (run.active || busy) && run.status !== "paused";
  const inFlight = run.active || busy;

  const handleLaunch = async () => {
    if (demoPreview) return;
    if (inFlight) {
      if (navigateToReactor) setLocation("/reactor");
      return;
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 2800);
    try {
      const hr = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/healthz`, { credentials: "same-origin" });
      if (hr.ok) {
        const hj = await hr.json();
        const level = hj.bureauIntegrity ?? hj.lanesHonesty?.bureauIntegrity;
        if (level === "critical") {
          const reasons = (hj.bureauIntegrityReasons ?? hj.lanesHonesty?.bureauIntegrityReasons ?? []).slice(0, 2).join("; ");
          setStatus(`bureauIntegrity=critical — research will underperform. ${reasons || "Check secrets + restart API."}`);
        }
      }
    } catch {
      // Health is advisory; canonical launch remains the authoritative gate.
    }
    const objective = launchObjective.trim();
    if (objectiveLimit === null || objective.length > objectiveLimit) {
      setStatus("Atlas launch configuration is unavailable or the objective exceeds its current limit. Reload before launching.");
      return;
    }
    if (!objective) {
      setStatus("Enter an investigation objective before launching Apex.");
      return;
    }
    setBusy(true);
    const result = await launchAtlasPipeline({ ...opts, targetCount: opts?.targetCount ?? (variant === "primary" ? launchTargetCount : undefined), discoveryObjective: objective, researchDepth: opts?.researchDepth ?? launchDepth });
    setBusy(false);
    setStatus(result.message);
    onLaunched?.(result);
    void refresh();
    if (result.ok && navigateToReactor) setLocation("/reactor");
  };

  const handleStop = async () => {
    if (stopping || !run.jobId) return;
    setStopping(true);
    setStatus(null);
    const result = await stopAtlasPipeline(run.jobId);
    setStopping(false);
    setStatus(result.message);
    void refresh();
  };

  const runningLabel = busy
    ? "Launching…"
    : run.targetName
      ? variant === "header" ? "Researching" : `Researching ${run.targetName}`
      : variant === "header" ? "Atlas live" : "Atlas researching…";

  const controls = inFlight ? (
    <div className="relative z-20 flex shrink-0 flex-nowrap items-center gap-2 sm:gap-2.5" role="group" aria-label="Atlas run controls">
      <button type="button" onClick={handleStop} disabled={stopping || busy || !run.jobId} data-testid="button-stop-apex-atlas" aria-label="Stop Atlas research" className={cn(CTRL, CTRL_STOP)}>
        {stopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Square className="h-3 w-3 fill-current" aria-hidden />}
        <span>{stopping ? "Stopping…" : "Stop"}</span>
      </button>
    </div>
  ) : null;

  if (variant === "header" && inFlight) {
    return <div className="flex min-h-[40px] flex-shrink-0 items-center justify-end gap-2 py-1 pl-2" data-testid="atlas-header-inflight-controls">{controls}</div>;
  }

  if (inFlight && (variant === "primary" || variant === "reactor")) {
    return (
      <div className={cn("flex w-full flex-col gap-2", variant === "primary" && "atlas-launch-primary-root")} data-testid="atlas-inflight-controls">
        <button type="button" onClick={() => navigateToReactor && setLocation("/reactor")} className={cn("inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E1] bg-[#F3F3F0] px-4 text-sm font-medium text-[#55555A] transition-colors duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2757C6]/50", flash && "atlas-click-flash")} aria-label="Open Reactor while Atlas research is active">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /><span className="truncate">{runningLabel}</span>
        </button>
        {controls}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 sm:gap-2.5", variant === "primary" && "atlas-launch-primary-root", variant === "header" ? "flex-row items-center justify-end" : "w-full flex-col items-stretch")}>
      {variant !== "header" && apiUnavailable && (
        <div className="atlas-home-api-down" role="alert" data-testid="atlas-home-api-down">
          <span className="atlas-home-api-down-mark" aria-hidden="true" />
          <div><strong>Atlas can’t reach the research API</strong><span>Runs are paused until it is back</span></div>
          <button type="button" onClick={onRetryApi} disabled={!onRetryApi}>Retry</button>
        </div>
      )}
      {variant === "primary" && (
        <div className="atlas-home-source-status" aria-label="Research source availability">
          <span className={`is-${sourceStatuses.webSearch}`}>{sourceLabel("Web search", sourceStatuses.webSearch, apiUnavailable)}</span>
          <span className={`is-${sourceStatuses.registries}`}>{sourceLabel("Registries", sourceStatuses.registries, apiUnavailable)}</span>
          <span className={`is-${sourceStatuses.footprint}`}>{sourceLabel("Footprint tools", sourceStatuses.footprint, apiUnavailable)}</span>
        </div>
      )}
      {variant !== "header" && !inFlight && (
        <label className="flex w-full flex-col gap-1.5">
          
          <textarea
            aria-label="Describe who you want to reach"
            data-testid="textarea-atlas-discovery-objective"
            value={launchObjective}
            onChange={(event) => setLaunchObjective(event.target.value)}
            maxLength={objectiveLimit ?? undefined}
            placeholder="Describe who you want to reach"
            rows={3}
            disabled={busy || stopping || apiUnavailable}
            className="w-full resize-y rounded-xl border border-border bg-background/80 px-3 py-2.5 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
          />
          <span className="text-[10px] leading-relaxed text-muted-foreground">Apex chooses its own targets, sources, providers, queries and next actions from the evidence. You can edit this mission before launching.</span>
          <span className="atlas-home-objective-count">{launchObjective.length.toLocaleString()} / {objectiveLimit?.toLocaleString() ?? "—"}</span>
        </label>
      )}
      <div className={cn("flex gap-2 sm:gap-2.5", variant === "header" ? "flex-row items-center justify-end" : "w-full flex-col items-stretch")}>
        {variant !== "header" && !opts?.researchDepth && !inFlight && (
          <div className="atlas-launch-settings">
            <div className="atlas-launch-depth" role="group" aria-label="Research depth">
              <span>Depth</span>
              {(["fast", "standard", "deep"] as const).map((depth) => (
                <button key={depth} type="button" aria-pressed={launchDepth === depth} onClick={() => setLaunchDepth(depth)} disabled={apiUnavailable} data-testid={"button-depth-" + depth}>
                  {depth === "fast" ? "Fast" : depth === "standard" ? "Standard" : "Deep"}
                </button>
              ))}
            </div>
            <div className="atlas-launch-target-count" role="group" aria-label="Maximum people to investigate">
              <span>Up to</span>
              <button type="button" aria-label="Decrease people limit" onClick={() => setLaunchTargetCount((n) => Math.max(1, n - 1))} disabled={apiUnavailable || launchTargetCount <= 1}><Minus aria-hidden="true" /></button>
              <output aria-live="polite">{launchTargetCount}</output>
              <button type="button" aria-label="Increase people limit" onClick={() => setLaunchTargetCount((n) => Math.min(25, n + 1))} disabled={apiUnavailable || launchTargetCount >= 25}><Plus aria-hidden="true" /></button>
              <span>people</span>
            </div>
          </div>
        )}
        <button type="button" onClick={handleLaunch} title={demoPreview ? "Demo preview only; research actions are disabled." : undefined} disabled={demoPreview || busy || stopping || apiUnavailable || objectiveLimit === null || (variant === "primary" && !launchObjective.trim())} data-testid="button-launch-apex-atlas" data-atlas-running={running ? "true" : "false"} aria-label="Launch Apex Atlas free dig" className={cn("atlas-pressable inline-flex items-center justify-center gap-2 rounded-xl transition-[background-color,border-color,opacity,transform] duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2757C6]/50 disabled:opacity-60 disabled:cursor-not-allowed", inFlight ? VARIANT_RUNNING[variant] : VARIANT_CLASS[variant], flash && "atlas-click-flash", className)}>
          <span className="relative z-10 inline-flex items-center gap-2">{(busy || running) && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />}<span className="whitespace-nowrap">{inFlight ? runningLabel : (label ?? (variant === "header" ? "Launch" : "Launch Apex Atlas"))}</span></span>
        </button>
        {variant !== "header" && controls}
      </div>
      {status && <p className={cn("w-full text-[10px] leading-relaxed font-mono", variant === "header" && "text-right", status.toLowerCase().includes("failed") || status.toLowerCase().includes("error") ? "text-rose-300" : "text-muted-foreground")} role="status">{status}</p>}
    </div>
  );
}
