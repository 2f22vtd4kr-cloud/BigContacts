import { useState } from "react";
import { useLocation } from "wouter";
import { Crosshair, Loader2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { launchAtlasPipeline, type LaunchAtlasOptions } from "@/lib/launch-atlas";

type Variant = "primary" | "header" | "reactor" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "atlas-launch-glow h-12 w-full sm:w-auto px-6 text-sm font-bold tracking-tight bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-[0_0_24px_rgba(234,179,8,0.25)] hover:from-yellow-400 hover:to-yellow-500 border border-yellow-300/40",
  header:
    "h-9 px-3 text-[11px] font-bold tracking-wide bg-yellow-500/15 text-yellow-100 border border-yellow-400/35 hover:bg-yellow-500/25 hover:border-yellow-300/50",
  reactor:
    "h-11 w-full sm:w-auto px-5 text-xs font-bold bg-yellow-500 text-black hover:bg-yellow-400 border border-yellow-300/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]",
  ghost:
    "h-10 px-4 text-xs font-semibold border border-border bg-card/60 text-foreground hover:border-yellow-400/40 hover:bg-yellow-400/10",
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

  const handleLaunch = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const result = await launchAtlasPipeline(opts);
    setBusy(false);
    setStatus(result.message);
    onLaunched?.(result);

    if (result.ok && navigateToReactor) {
      setLocation("/reactor");
    }
  };

  const text =
    label ??
    (variant === "header" ? "Launch Atlas" : "Launch Apex Atlas");

  return (
    <div className={cn("flex flex-col gap-1.5", variant === "header" && "items-end")}>
      <button
        type="button"
        onClick={handleLaunch}
        disabled={busy}
        data-testid="button-launch-apex-atlas"
        aria-label="Launch Apex Atlas research pipeline"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
          VARIANT_CLASS[variant],
          className,
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : variant === "header" ? (
          <Crosshair className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Radar className="h-4 w-4" aria-hidden />
        )}
        {busy ? "Launching…" : text}
      </button>
      {status && (
        <p
          className={cn(
            "max-w-md text-[10px] leading-relaxed font-mono",
            variant === "header" && "text-right max-w-[12rem]",
            status.toLowerCase().includes("fail") || status.toLowerCase().includes("could not") || status.toLowerCase().includes("not reachable")
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
