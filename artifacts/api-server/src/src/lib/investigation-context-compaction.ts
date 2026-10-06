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

const DEFAULT_MAX_CHARS = 10_000;
const MIN_MAX_CHARS = 8_000;
const MAX_MAX_CHARS = 24_000;

function positiveBounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function getInvestigatorContextBudget(): InvestigatorContextBudget {
  return {
    maxChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_MAX_CHARS, DEFAULT_MAX_CHARS, MIN_MAX_CHARS, MAX_MAX_CHARS),
    recentFullRecords: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_RECORDS, 2, 1, 4),
    recentObservationChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_OBSERVATION_CHARS, 2_600, 800, 6_000),
    archiveRecordChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_ARCHIVE_RECORD_CHARS, 500, 240, 1_500),
    findingChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_FINDING_CHARS, 3_200, 1_000, 8_000),
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

  const caseState = [
    "CASE STATE",
    "MODE: " + (input.mode || "target"),
    "TARGET: " + trim(input.targetName, 240),
    input.companyName ? "RELATED ORGANIZATION: " + trim(input.companyName, 240) : "",
    "OBJECTIVE: " + trim(input.objective, 1_200),
  ].filter(Boolean).join("\n");

  const findings = input.findings.map((finding) => compactFinding(finding, 700)).filter(Boolean);
  const findingsSection = "CURRENT FINDINGS / LEADS\n" + (findings.length ? findings.join("\n") : "(none yet)");
  const latestSection = "LATEST OBSERVATION\n" + (trim(input.lastObservation, budget.recentObservationChars) || "(none)");

  const actionSummary = records.slice(-8).map((record) => ({
    action: record.action,
    execution: record.execution || "unknown",
    urls: (record.observedUrls ?? []).length,
    findings: (record.findings ?? []).length,
  }));
  const familyHints = new Map<string, number>();
  for (const record of records) {
    for (const url of record.observedUrls ?? []) {
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
        const family = /linkedin|x\.com|twitter|instagram/.test(host)
          ? "social"
          : /gov|registry|companieshouse|sec\.gov|gleif/.test(host)
            ? "official/registry"
            : /reuters|bloomberg|ft\.com|wsj/.test(host)
              ? "reputable-press"
              : host;
        familyHints.set(family, (familyHints.get(family) ?? 0) + 1);
      } catch {}
    }
  }
  const repeatedFamilies = [...familyHints.entries()].filter(([, count]) => count >= 3).map(([family]) => family);
  const unresolvedSignals = input.findings.length === 0
    ? ["No promoted finding is present yet: prioritize identity anchors and independent source families."]
    : repeatedFamilies.length
      ? ["Source-family saturation is visible: prefer a new source family or a falsification move."]
      : ["Use the next action to close the most discriminating unresolved question rather than merely adding another source."];
  const frontierSection = [
    "RESEARCH FRONTIER (derived from durable trajectory; advisory, not a fixed route)",
    "Recent action outcomes: " + JSON.stringify(actionSummary),
    "Repeated source families: " + (repeatedFamilies.join(", ") || "none"),
    ...unresolvedSignals.map((signal) => "Signal: " + signal),
    "A good next move should maximize expected information gain, identity discrimination, source independence, or contact relevance relative to cost.",
  ].join("\n");

  const recentSection = recent.length
    ? [
        "RECENT TRAJECTORY (full bounded observations)",
        ...recent.map((record) =>
          compactRecord(
            record,
            Math.min(budget.recentObservationChars, 1_800),
            1_800,
          ),
        ),
      ].join("\n---\n")
    : "";

  const archiveSection = older.length
    ? [
        "ARCHIVED TRAJECTORY INDEX (older raw observations remain durable and addressable by turn)",
        ...older.map((record) => archiveRecord(record, Math.min(budget.archiveRecordChars, 600))),
        "Use this index to avoid repeating dead ends. Durable run/evidence records retain complete observations; do not infer missing detail from this index.",
      ].join("\n")
    : "";

  const lawSection = "CONTEXT MANAGEMENT LAW\nThe complete trajectory and evidence remain durable outside this prompt. This working context is deliberately selective. Do not treat omitted raw detail as negative evidence. Prefer a new discriminating action when the archived index shows an unresolved gap. Do not repeat a failed avenue solely because its raw observation is not visible here.";

  const sections: Array<[string, number]> = [
    [caseState, 650],
    [findingsSection, Math.min(budget.findingChars, 2_600)],
    [frontierSection, 1_250],
    [latestSection, Math.min(budget.recentObservationChars, 1_800)],
    [recentSection, recentSection ? Math.min(3_600, recent.length * 1_800 + 40) : 0],
    [archiveSection, archiveSection ? Math.min(700, Math.max(0, budget.maxChars - 8_000)) : 0],
    [lawSection, 320],
  ];

  let result = "";
  for (const [section, requested] of sections) {
    if (!section || requested <= 0) continue;
    const separator = result ? "\n\n" : "";
    const remaining = Math.min(requested, budget.maxChars - result.length - separator.length);
    const fitted = fitSection(section, remaining);
    if (!fitted) continue;
    result += separator + fitted;
  }

  if (!records.length && input.history?.length) {
    const separator = result ? "\n\n" : "";
    const remaining = budget.maxChars - result.length - separator.length;
    const legacy = fitSection("LEGACY TRAJECTORY NOTES\n" + input.history.map((item) => trim(item, 420)).filter(Boolean).join("\n"), Math.min(1_000, remaining));
    if (legacy) result += separator + legacy;
  }

  return result.slice(0, budget.maxChars);
}
}

/** Backward-compatible bounded helper for non-ReAct callers. */
export function compactInvestigationContext(input: {
  raw: string;
  maxChars?: number;
  trajectory?: readonly string[];
  trajectoryRecords?: readonly CompactionTrajectoryRecord[];
  evidenceGraphSummaries?: readonly string[];
  rawSectionShare?: number;
}): string {
  const requestedMaxChars = input.maxChars;
  const minimum = requestedMaxChars !== undefined ? 1_000 : MIN_MAX_CHARS;
  const maxChars = Math.min(MAX_MAX_CHARS, Math.max(minimum, requestedMaxChars ?? DEFAULT_MAX_CHARS));
  const rawSectionShare = Number.isFinite(input.rawSectionShare)
    ? Math.min(0.65, Math.max(0.2, input.rawSectionShare!))
    : 0.35;
  const sections = [
    "CURRENT STATE\n" + trim(input.raw, Math.floor(maxChars * rawSectionShare)),
    "EVIDENCE GRAPH SUMMARY\n" + (input.evidenceGraphSummaries ?? []).map((value) => trim(value, 900)).filter(Boolean).join("\n"),
    "TRAJECTORY RECORDS\n" + (input.trajectoryRecords ?? []).map((record) => archiveRecord(record, 650)).filter(Boolean).join("\n"),
    "TRAJECTORY NOTES\n" + (input.trajectory ?? []).map((value) => trim(value, 420)).filter(Boolean).join("\n"),
  ].filter((section) => section.split("\n").slice(1).join("\n").trim().length > 0);
  let result = "";
  for (const section of sections) {
    const separator = result ? "\n\n" : "";
    const remaining = maxChars - result.length - separator.length;
    if (remaining <= 0) break;
    result += separator + fitSection(section, remaining);
  }
  return result.slice(0, maxChars);
}
/**
 * Emergency provider-rejection reducer. Used only after a request-size rejection.
 * It preserves the beginning (institutional/task contract) and end (latest state/action
 * instructions) while shrinking the middle. Durable records are unaffected.
 */
/** Bound an auxiliary model-state section without deleting the durable state behind it. */
export function boundInvestigatorPromptSection(value: string, maxChars = 6_000): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  const bounded = Math.max(1_000, Math.min(20_000, Math.floor(maxChars)));
  if (normalized.length <= bounded) return normalized;
  const marker = "[AUXILIARY CONTEXT BOUND: omitted middle detail remains durable outside this prompt]";
  const available = Math.max(0, bounded - marker.length - 2);
  const headChars = Math.floor(available * 0.55);
  const tailChars = available - headChars;
  return normalized.slice(0, headChars).trimEnd() + "\n" + marker + "\n" + normalized.slice(-tailChars).trimStart();
}

export function tightenInvestigatorPrompt(prompt: string, maxChars = 12_000): string {
  if (prompt.length <= maxChars) return prompt;
  const marker = "[EMERGENCY REQUEST-SIZE COMPACTION: middle working-context detail omitted; durable records retained]";
  const separator = "\n\n";
  const available = Math.max(0, maxChars - marker.length - separator.length * 2);
  const headChars = Math.floor(available * 0.58);
  const tailChars = available - headChars;
  return (prompt.slice(0, headChars).trimEnd()
    + separator + marker + separator
    + prompt.slice(-tailChars).trimStart()).slice(0, maxChars);
}