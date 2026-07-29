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
  // Registry confidence score — how many independent public registries confirm this person
  if (score == null) return null;
  const colorClasses = getScoreColor(score);
  const pct = Math.round(score * 100);
  const label = pct >= 70 ? "Multi-registry" : pct >= 40 ? "Single-registry" : "Unverified";
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses}`}
         title={`Registry confidence ${pct}/100 — strength of public registry verification. Higher means more independent sources confirm this person's wealth profile.`}>
      <span className="font-bold tabular-nums">{pct}</span>
      <span className="opacity-50 text-[9px] uppercase tracking-wide leading-none">{label}</span>
    </div>
  );
}

export function AccessScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || typeof score !== "number" || isNaN(score)) return null;
  const pct = Math.round(score * 100);
  
  // Derive label + color from score bands
  let label: string;
  let colorClass: string;
  
  if (pct === 0) {
    label = "No vector";
    colorClass = "text-muted-foreground border-border bg-muted/30";
  } else if (pct < 30) {
    label = "Weak";
    colorClass = "text-orange-400 border-orange-400/20 bg-orange-400/8";
  } else if (pct < 60) {
    label = "Reachable";
    colorClass = "text-amber-400 border-amber-400/30 bg-amber-400/8";
  } else if (pct < 85) {
    label = "Strong";
    colorClass = "text-primary border-primary/30 bg-primary/8";
  } else {
    label = "Direct";
    colorClass = "text-primary border-primary bg-primary/15";
  }
  
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}
      title={`Access score ${pct}/100 — how realistically this person can be reached through public contact evidence`}
      data-testid="badge-access-score"
    >
      <span className="font-bold tabular-nums text-[11px]">{pct}</span>
      <span className="opacity-60 text-[9px] uppercase tracking-wide leading-none">{label}</span>
    </div>
  );
}

export function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  // Contact confidence — how trustworthy the extracted contact data itself is
  // (email/phone/social evidence quality), distinct from Access (reachability)
  // and Signal (wealth/registry evidence). This is the primary surfaced metric
  // for prioritizing outreach — see reachability-rank.ts on the API side.
  if (score == null || typeof score !== "number" || isNaN(score)) return null;
  const pct = Math.round(score);

  let label: string;
  let colorClass: string;
  if (pct === 0) {
    label = "None";
    colorClass = "text-muted-foreground border-border bg-muted/30";
  } else if (pct < 30) {
    label = "Low";
    colorClass = "text-orange-400 border-orange-400/20 bg-orange-400/8";
  } else if (pct < 60) {
    label = "Moderate";
    colorClass = "text-amber-400 border-amber-400/30 bg-amber-400/8";
  } else if (pct < 85) {
    label = "High";
    colorClass = "text-primary border-primary/30 bg-primary/8";
  } else {
    label = "Verified";
    colorClass = "text-primary border-primary bg-primary/15";
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}
      title={`Contact confidence ${pct}/100 — how trustworthy the discovered contact data is`}
      data-testid="badge-confidence-score"
    >
      <span className="font-bold tabular-nums text-[11px]">{pct}</span>
      <span className="opacity-60 text-[9px] uppercase tracking-wide leading-none">{label}</span>
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
