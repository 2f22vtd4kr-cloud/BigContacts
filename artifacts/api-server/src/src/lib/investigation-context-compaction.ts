/**
 * Bounded Investigator working context.
 *
 * Durable trajectory/evidence is never deleted here. This module controls only
 * what is re-presented to the next Investigator model call.
 */
export type CompactionFinding = {
  vectorType?: string;
  value?: string;
  personName?: string | null;
  role?: string | null;
  scope?: string;
  sourceUrls?: string[];
  note?: string;
};

export type CompactionTrajectoryRecord = {
  turn: number;
  model?: string;
  action: string;
  args?: Record<string, unknown>;
  thought?: string;
  execution?: string;
  observation?: string;
  observedUrls?: string[];
  findings?: CompactionFinding[];
  providerFallback?: string[];
  stopReason?: string;
};

export interface InvestigatorContextInput {
  targetName: string;
  companyName?: string | null;
  objective: string;
  history?: readonly string[];
  trajectoryRecords: readonly CompactionTrajectoryRecord[];
  lastObservation: string;
  findings: readonly CompactionFinding[];
  mode?: "target" | "discovery";
}

export interface InvestigatorContextBudget {
  maxChars: number;
  recentFullRecords: number;
  recentObservationChars: number;
  archiveRecordChars: number;
  findingChars: number;
}

const DEFAULT_MAX_CHARS = 18_000;
const MIN_MAX_CHARS = 8_000;
const MAX_MAX_CHARS = 32_000;

function positiveBounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function getInvestigatorContextBudget(): InvestigatorContextBudget {
  return {
    maxChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_MAX_CHARS, DEFAULT_MAX_CHARS, MIN_MAX_CHARS, MAX_MAX_CHARS),
    recentFullRecords: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_RECORDS, 2, 1, 4),
    recentObservationChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_OBSERVATION_CHARS, 3_200, 800, 6_000),
    archiveRecordChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_ARCHIVE_RECORD_CHARS, 650, 240, 1_500),
    findingChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_FINDING_CHARS, 4_000, 1_000, 8_000),
  };
}

function trim(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function compactFinding(finding: CompactionFinding, max: number): string {
  const sources = unique(finding.sourceUrls ?? []);
  const person = finding.personName ? " person=" + trim(finding.personName, 120) : "";
  const role = finding.role ? " role=" + trim(finding.role, 100) : "";
  const scope = finding.scope ? " scope=" + trim(finding.scope, 40) : "";
  const note = finding.note ? " note=" + trim(finding.note, 180) : "";
  const source = sources.length ? " sources=" + sources.join(" | ") : "";
  return trim("- " + trim(finding.vectorType || "other", 40) + ": " + trim(finding.value, 300) + person + role + scope + source + note, max);
}

function compactRecord(record: CompactionTrajectoryRecord, observationChars: number, max: number): string {
  const urls = unique(record.observedUrls ?? []);
  const findings = (record.findings ?? []).map((finding) => compactFinding(finding, 700)).filter(Boolean);
  const observation = trim(record.observation, observationChars);
  return trim([
    "TURN " + record.turn + " | action=" + trim(record.action, 80) + " | execution=" + trim(record.execution || "unknown", 40),
    urls.length ? "OBSERVED_URLS: " + urls.join(" | ") : "",
    findings.length ? "FINDINGS:\n" + findings.join("\n") : "",
    observation ? "OBSERVATION_EXCERPT: " + observation : "",
  ].filter(Boolean).join("\n"), max);
}

function archiveRecord(record: CompactionTrajectoryRecord, max: number): string {
  const urls = unique(record.observedUrls ?? []);
  const findings = (record.findings ?? []).map((finding) => compactFinding(finding, 500)).filter(Boolean);
  return trim([
    "turn=" + record.turn,
    "action=" + trim(record.action, 70),
    "execution=" + trim(record.execution || "unknown", 30),
    urls.length ? "urls=" + urls.join(" | ") : "",
    findings.length ? "findings=" + findings.join(" ; ") : "",
  ].filter(Boolean).join(" | "), max);
}

function fitSection(section: string, remaining: number): string {
  if (remaining <= 0) return "";
  if (section.length <= remaining) return section;
  if (remaining < 80) return "";
  return section.slice(0, remaining - 40).trimEnd() + "\n[CONTEXT BUDGET: OLDER DETAIL OMITTED; DURABLE RECORDS RETAINED]";
}

export function buildInvestigatorContext(input: InvestigatorContextInput): string {
  const budget = getInvestigatorContextBudget();
  const records = [...input.trajectoryRecords].sort((a, b) => a.turn - b.turn);
  const recent = records.slice(Math.max(0, records.length - budget.recentFullRecords));
  const older = records.slice(0, Math.max(0, records.length - budget.recentFullRecords));
  const sections: string[] = [];

  sections.push([
    "CASE STATE",
    "MODE: " + (input.mode || "target"),
    "TARGET: " + trim(input.targetName, 240),
    input.companyName ? "RELATED ORGANIZATION: " + trim(input.companyName, 240) : "",
    "OBJECTIVE: " + trim(input.objective, 2_000),
  ].filter(Boolean).join("\n"));

  const findings = input.findings.map((finding) => compactFinding(finding, 700)).filter(Boolean);
  sections.push(fitSection("CURRENT FINDINGS / LEADS\n" + (findings.length ? findings.join("\n") : "(none yet)"), budget.findingChars));

  sections.push("LATEST OBSERVATION\n" + (trim(input.lastObservation, budget.recentObservationChars) || "(none)"));

  if (recent.length) {
    sections.push(["RECENT TRAJECTORY (full bounded observations)", ...recent.map((record) => compactRecord(record, budget.recentObservationChars, Math.max(1_200, Math.floor(budget.maxChars / Math.max(2, recent.length + 1))))].join("\n---\n"));
  }

  if (older.length) {
    sections.push([
      "ARCHIVED TRAJECTORY INDEX (older raw observations remain durable and addressable by turn)",
      ...older.map((record) => archiveRecord(record, budget.archiveRecordChars)),
      "Use this index to avoid repeating dead ends. Durable run/evidence records retain complete observations; do not infer missing detail from this index.",
    ].join("\n"));
  }

  if (!records.length && input.history?.length) {
    sections.push(fitSection("LEGACY TRAJECTORY NOTES\n" + input.history.map((item) => trim(item, 420)).filter(Boolean).join("\n"), 2_000));
  }

  sections.push("CONTEXT MANAGEMENT LAW\nThe complete trajectory and evidence remain durable outside this prompt. This working context is deliberately selective. Do not treat omitted raw detail as negative evidence. Prefer a new discriminating action when the archived index shows an unresolved gap. Do not repeat a failed avenue solely because its raw observation is not visible here.");

  let result = "";
  for (const section of sections) {
    if (!section) continue;
    const separator = result ? "\n\n" : "";
    const remaining = budget.maxChars - result.length - separator.length;
    const fitted = fitSection(section, remaining);
    if (!fitted) continue;
    result += separator + fitted;
  }
  return result.slice(0, budget.maxChars);
}

/** Backward-compatible bounded helper for non-ReAct callers. */
export function compactInvestigationContext(input: {
  raw: string;
  maxChars?: number;
  trajectory?: readonly string[];
  trajectoryRecords?: readonly CompactionTrajectoryRecord[];
  evidenceGraphSummaries?: readonly string[];
}): string {
  const maxChars = Math.min(MAX_MAX_CHARS, Math.max(MIN_MAX_CHARS, input.maxChars ?? DEFAULT_MAX_CHARS));
  const pieces = [
    trim(input.raw, Math.floor(maxChars * 0.35)),
    ...(input.evidenceGraphSummaries ?? []).map((value) => trim(value, 900)),
    ...(input.trajectoryRecords ?? []).map((record) => archiveRecord(record, 650)),
    ...(input.trajectory ?? []).map((value) => trim(value, 420)),
  ].filter(Boolean);
  return pieces.join("\n\n").slice(0, maxChars);
}
/**
 * Emergency provider-rejection reducer. Used only after a request-size rejection.
 * It preserves the beginning (institutional/task contract) and end (latest state/action
 * instructions) while shrinking the middle. Durable records are unaffected.
 */
export function tightenInvestigatorPrompt(prompt: string, maxChars = 12_000): string {
  if (prompt.length <= maxChars) return prompt;
  const headChars = Math.floor(maxChars * 0.58);
  const tailChars = maxChars - headChars;
  return prompt.slice(0, headChars).trimEnd()
    + "\n\n[EMERGENCY REQUEST-SIZE COMPACTION: middle working-context detail omitted; durable records retained]\n\n"
    + prompt.slice(-tailChars).trimStart();
}