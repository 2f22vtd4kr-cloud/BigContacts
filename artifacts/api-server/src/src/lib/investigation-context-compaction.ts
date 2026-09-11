/**
 * Deterministic high-signal compaction for durable investigation context.
 *
 * The case document is a control-plane snapshot, not an event-log dump. Raw
 * context can contain an earlier context document, so blindly retaining the
 * whole prior section creates recursive prompt growth. This compactor keeps
 * current state plus a bounded, structured tail of actual observations.
 */
export interface ContextCompactionInput {
  raw: string;
  maxChars?: number;
  trajectory?: readonly string[];
  trajectoryRecords?: readonly unknown[];
  evidenceGraphSummaries?: readonly string[];
}

const DEFAULT_MAX_CHARS = 32_000;
const MIN_MAX_CHARS = 8_000;
const MAX_MAX_CHARS = 64_000;

function clip(value: string, max: number): string {
  const normalized = String(value ?? "").trim();
  if (normalized.length <= max) return normalized;
  const keep = Math.max(0, max - 28);
  return `${normalized.slice(0, keep)}\n…[compacted ${normalized.length - keep} chars]`;
}

function section(raw: string, heading: string): string {
  const start = raw.indexOf(heading);
  if (start < 0) return "";
  const next = raw.indexOf("\n## ", start + heading.length);
  return raw.slice(start, next < 0 ? raw.length : next).trim();
}

function removeNestedPrior(value: string): string {
  const marker = "## Prior durable context";
  const start = value.indexOf(marker);
  if (start < 0) return value;
  const next = value.indexOf("\n## ", start + marker.length);
  if (next < 0) return value.slice(0, start).trim();
  return `${value.slice(0, start).trim()}\n${value.slice(next).trim()}`.trim();
}

function compactRecord(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const value = record as Record<string, unknown>;
  const turn = typeof value.turn === "number" ? value.turn : "?";
  const action = typeof value.action === "string" ? value.action : "unknown";
  const execution = typeof value.execution === "string" ? value.execution : "unknown";
  const model = typeof value.model === "string" ? value.model : "unknown";
  const lines = [`turn=${turn} action=${action} execution=${execution} model=${model}`];

  if (value.args && typeof value.args === "object") {
    const args = Object.fromEntries(Object.entries(value.args as Record<string, unknown>).filter(([key]) => key !== "thought"));
    lines.push(`args=${clip(JSON.stringify(args), 900)}`);
  }
  if (typeof value.observation === "string" && value.observation.trim()) lines.push(`observation=${clip(value.observation, 2_600)}`);
  if (Array.isArray(value.observedUrls) && value.observedUrls.length) {
    lines.push(`observedUrls=${value.observedUrls.filter((v): v is string => typeof v === "string").slice(-10).join(" | ")}`);
  }
  if (Array.isArray(value.findings) && value.findings.length) lines.push(`findings=${clip(JSON.stringify(value.findings.slice(-8)), 3_200)}`);
  if (Array.isArray(value.providerFallback) && value.providerFallback.length) {
    lines.push(`providerFallback=${value.providerFallback.filter((v): v is string => typeof v === "string").slice(-4).join(" | ")}`);
  }
  return lines.join("\n");
}

function compactRecords(records: readonly unknown[], maxChars: number): string {
  const chunks: string[] = [];
  let used = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const chunk = compactRecord(records[i]);
    if (!chunk) continue;
    if (used + chunk.length + 2 > maxChars) break;
    chunks.unshift(chunk);
    used += chunk.length + 2;
  }
  return chunks.join("\n\n");
}

function compactEvidence(values: readonly string[], maxChars: number): string {
  const chunks: string[] = [];
  let used = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const value = String(values[i] ?? "").trim();
    if (!value) continue;
    const item = clip(value, 1_200);
    if (used + item.length + 1 > maxChars) break;
    chunks.unshift(item);
    used += item.length + 1;
  }
  return chunks.join("\n");
}

export function compactInvestigationContext(input: ContextCompactionInput): string {
  const maxChars = Math.max(MIN_MAX_CHARS, Math.min(MAX_MAX_CHARS, input.maxChars ?? DEFAULT_MAX_CHARS));
  const raw = String(input.raw ?? "").trim();

  const current = section(raw, "# Apex Atlas — Investigation Context");
  const operatingLaw = section(raw, "## Bureau operating law");
  const prior = removeNestedPrior(section(raw, "## Prior durable context"));
  const rightHand = section(raw, "## Right Hand — latest state");
  const boss = section(raw, "## Gemini Boss — latest state");
  const investigator = section(raw, "## Investigator result");
  const findings = section(raw, "## Recent finding summaries");

  // Reserve space for current control state first. Detailed history is carried
  // by structured records and the durable event ledger, not recursive prose.
  const sections: string[] = [];
  if (current) sections.push(clip(current, Math.floor(maxChars * 0.30)));
  if (operatingLaw) sections.push(clip(operatingLaw, 3_000));
  if (prior) sections.push(`## Prior durable context (bounded historical summary)\n${clip(prior, Math.floor(maxChars * 0.12))}`);
  if (rightHand || boss || investigator) sections.push(clip([rightHand, boss, investigator].filter(Boolean).join("\n\n"), Math.floor(maxChars * 0.20)));
  if (findings) sections.push(clip(findings, Math.floor(maxChars * 0.10)));

  const trajectoryRecords = (input.trajectoryRecords ?? []).slice(-24);
  const trajectoryBudget = Math.max(3_000, Math.floor(maxChars * 0.28));
  const structuredTail = compactRecords(trajectoryRecords, trajectoryBudget);
  if (structuredTail) sections.push(`## Recent structured Investigator observations\n${structuredTail}`);

  if (!structuredTail) {
    const trajectory = (input.trajectory ?? []).slice(-24).map(String).map((v) => v.trim()).filter(Boolean);
    if (trajectory.length) sections.push(`## Recent Investigator trajectory\n${clip(trajectory.join("\n"), trajectoryBudget)}`);
  }

  const evidence = compactEvidence((input.evidenceGraphSummaries ?? []).filter(Boolean), Math.floor(maxChars * 0.10));
  if (evidence) sections.push(`## Evidence attribution state\n${evidence}`);

  const result = sections.filter(Boolean).join("\n\n");
  if (result.length <= maxChars) return result;

  // Last-resort deterministic bound. Never let an old narrative tail displace
  // the current control state or newest structured Investigator observations.
  return clip(result, maxChars);
}
