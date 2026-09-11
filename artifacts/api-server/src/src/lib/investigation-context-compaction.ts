/** Deterministic high-signal compaction for durable investigation context. */

export interface ContextCompactionInput { raw: string; maxChars?: number; trajectory?: readonly string[]; trajectoryRecords?: readonly unknown[]; evidenceGraphSummaries?: readonly string[]; }
const DEFAULT_MAX_CHARS = 32_000;
function clip(value: string, max: number): string { return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 24))}\n…[compacted]`; }
function keepSection(raw: string, heading: string, max: number): string { const start = raw.indexOf(heading); if (start < 0) return ""; const next = raw.indexOf("\n## ", start + heading.length); return clip(raw.slice(start, next < 0 ? raw.length : next).trim(), max); }
export function compactInvestigationContext(input: ContextCompactionInput): string {
  const maxChars = Math.max(8_000, Math.min(64_000, input.maxChars ?? DEFAULT_MAX_CHARS));
  const raw = input.raw.trim();
  const sections = [
    keepSection(raw, "# Apex Atlas — Investigation Context", 5_000),
    keepSection(raw, "## Bureau operating law", 3_500),
    keepSection(raw, "## Prior durable context", 8_000),
    keepSection(raw, "## Right Hand — latest state", 3_000),
    keepSection(raw, "## Gemini Boss — latest state", 3_500),
    keepSection(raw, "## Investigator result", 2_500),
    keepSection(raw, "## Recent finding summaries", 4_000),
  ].filter(Boolean);
  const trajectory = (input.trajectory ?? []).slice(-24); if (trajectory.length) sections.push(`## Compacted trajectory tail\n${trajectory.join("\n")}`);
  const records = (input.trajectoryRecords ?? []).slice(-16); if (records.length) sections.push(`## Compacted structured turns\n${JSON.stringify(records).slice(0, 7_000)}`);
  const graphs = (input.evidenceGraphSummaries ?? []).slice(-12); if (graphs.length) sections.push(`## Evidence attribution state\n${graphs.join("\n")}`);
  const result = sections.join("\n\n"); if (result.length <= maxChars) return result;
  return `${clip(sections.slice(0, 7).join("\n\n"), Math.floor(maxChars * 0.72))}\n\n${clip(sections.slice(7).join("\n\n"), Math.floor(maxChars * 0.28))}`.slice(0, maxChars);
}
