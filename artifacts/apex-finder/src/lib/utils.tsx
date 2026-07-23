import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number) {
  if (score >= 0.8) return "text-primary border-primary bg-primary/10";
  if (score >= 0.5) return "text-amber-500 border-amber-500/50 bg-amber-500/10";
  return "text-muted-foreground border-border bg-muted";
}

export function getScoreBarColor(score: number) {
  if (score >= 0.8) return "bg-primary";
  if (score >= 0.5) return "bg-amber-500";
  return "bg-muted-foreground";
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Unknown";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const colorClasses = getScoreColor(score);
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses}`} title="Signal score — strength of the wealth and registry evidence (0–100)">
      <span className="opacity-50 text-[9px] uppercase tracking-wide leading-none">Signal</span>
      <span className="font-bold tabular-nums">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

export function AccessScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const colorClasses = getScoreColor(score);
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses}`}
      title="Access score — how realistically this person can be reached through public contact evidence (0–100)"
      data-testid="badge-access-score"
    >
      <span className="opacity-50 text-[9px] uppercase tracking-wide leading-none">Access</span>
      <span className="font-bold tabular-nums">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

export function formatRegistry(source: string | null | undefined) {
  if (!source) return "Unknown";
  return source.split(',').map(s => s.trim()).join(' / ');
}

/**
 * Display-formats entity names stored as ALL CAPS (FAA/EDGAR style).
 * "THIEL PETER" → "Thiel Peter"  |  "Chadwick John Huston" → unchanged
 */
export function formatEntityName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  // Already mixed-case → leave as-is
  if (/[a-z]/.test(name)) return name;
  // ALL CAPS → title-case each word
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, c => c.toUpperCase());
}

/**
 * Cleans up verbose raw signal text from SEC EDGAR / FAA ingestors.
 * "Source: SEC EDGAR — SC 13G. Filing type: SC 13G." → "SEC EDGAR — SC 13G filing"
 * "Aviation: Jet — N112AE · FAA Releasable Aircraft Database" → unchanged
 */
export function formatSignal(signal: string | null | undefined): string {
  if (!signal) return "No signal";
  return signal
    .replace(/^Source:\s*/i, "")                          // strip "Source: " prefix
    .replace(/\.\s*Filing type:\s*[\w\s\d]+\./gi, " filing") // collapse duplicate filing type
    .replace(/\.$/, "")                                   // trailing period
    .trim();
}
