import { useState } from "react";
import { useLocation } from "wouter";
import { Crosshair, Loader2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { launchAtlasPipeline, type LaunchAtlasOptions } from "@/lib/launch-atlas";

type Variant = "primary" | "header" | "reactor" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "atlas-launch-glow h-12 w-full sm:w-auto px-7 text-sm tracking-tight",
  header:
    "h-9 px-3.5 text-[11px] font-bold tracking-wide rounded-full bg-[#eab308]/12 text-[#fde047] border border-[#eab308]/40 hover:bg-[#eab308]/20 hover:border-[#facc15]/50",
  reactor:
    "atlas-launch-glow h-11 w-full sm:w-auto px-5 text-xs",
  ghost:
    "h-10 px-4 text-xs font-semibold border border-[#2a2a2a] bg-[#0c0c0c] text-stone-200 hover:border-[#eab308]/40 hover:bg-[#eab308]/10 hover:text-[#fde047]",
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
    <div className={cn("flex flex-col gap-2", variant === "header" && "items-end")}>
      <button
        type="button"
        onClick={handleLaunch}
        disabled={busy}
        data-testid="button-launch-apex-atlas"
        aria-label="Launch Apex Atlas research pipeline"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 disabled:opacity-60 disabled:cursor-not-allowed",
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
