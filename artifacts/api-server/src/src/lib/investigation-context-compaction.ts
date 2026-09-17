/**
 * Lossless assembly of durable investigation context.
 *
 * The Bureau is model-led: context may be large, but it must not silently
 * discard findings, observations, URLs, or trajectory records. Operational
 * timeouts and provider limits remain separate from data-retention policy.
 */
export interface ContextCompactionInput {
  raw: string;
  maxChars?: number;
  trajectory?: readonly string[];
  trajectoryRecords?: readonly unknown[];
  evidenceGraphSummaries?: readonly string[];
}

function preserveRecursivePrior(value: string): string {
  const marker = "## Prior durable context";
  const start = value.indexOf(marker);
  if (start < 0) return value;
  const bodyStart = start + marker.length;
  const next = value.indexOf("\n## ", bodyStart);
  const priorBody = value.slice(bodyStart, next < 0 ? value.length : next).trim();
  const prefix = value.slice(0, start).trim();
  const suffix = next < 0 ? "" : value.slice(next).trim();
  const preserved = priorBody ? `## Preserved prior durable context\n${priorBody}` : "";
  return [prefix, preserved, suffix].filter(Boolean).join("\n\n").trim();
}

/**
 * Preserve the complete current context and complete structured history.
 * `maxChars` remains a compatibility argument but is deliberately not used
 * as a data-loss boundary.
 */
export function compactInvestigationContext(input: ContextCompactionInput): string {
  const raw = String(input.raw ?? "").trim();
  const sections: string[] = [];
  const base = preserveRecursivePrior(raw);
  if (base) sections.push(base);
  if (input.trajectoryRecords?.length) sections.push(`## Complete Investigator trajectory records\n${JSON.stringify(input.trajectoryRecords)}`);
  if (input.trajectory?.length) sections.push(`## Complete Investigator trajectory\n${input.trajectory.join("\n")}`);
  if (input.evidenceGraphSummaries?.length) sections.push(`## Complete evidence attribution state\n${input.evidenceGraphSummaries.join("\n")}`);
  return sections.join("\n\n");
}
