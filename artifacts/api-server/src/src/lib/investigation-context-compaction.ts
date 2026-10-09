import { sanitizeUrlForEvidence, sanitizeUrlsInText } from "./url-privacy";
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
  /** Compact mounted durable case state; never treated as source instructions. */
  priorContext?: string;
  /** Optional model-facing budget override; durable state is unaffected. */
  maxChars?: number;
}

export interface InvestigatorContextBudget {
  maxChars: number;
  recentFullRecords: number;
  recentObservationChars: number;
  archiveRecordChars: number;
  findingChars: number;
}

const DEFAULT_MAX_CHARS = 4_200;
const MIN_MAX_CHARS = 3_900;
const MAX_MAX_CHARS = 12_000;

function positiveBounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function getInvestigatorContextBudget(): InvestigatorContextBudget {
  return {
    maxChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_MAX_CHARS, DEFAULT_MAX_CHARS, MIN_MAX_CHARS, MAX_MAX_CHARS),
    recentFullRecords: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_RECORDS, 2, 1, 4),
    recentObservationChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_RECENT_OBSERVATION_CHARS, 1_000, 600, 3_000),
    archiveRecordChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_ARCHIVE_RECORD_CHARS, 320, 180, 900),
    findingChars: positiveBounded(process.env.APEX_INVESTIGATOR_CONTEXT_FINDING_CHARS, 1_500, 700, 4_000),
  };
}

function trim(value: unknown, max: number): string {
  return typeof value === "string" ? sanitizeUrlsInText(value.trim().slice(0, max)) : "";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function compactFinding(finding: CompactionFinding, max: number): string {
  const sources = unique(finding.sourceUrls ?? []).map((url) => sanitizeUrlForEvidence(url));
  const person = finding.personName ? " person=" + trim(finding.personName, 120) : "";
  const role = finding.role ? " role=" + trim(finding.role, 100) : "";
  const scope = finding.scope ? " scope=" + trim(finding.scope, 40) : "";
  const note = finding.note ? " note=" + trim(finding.note, 180) : "";
  const source = sources.length ? " sources=" + sources.join(" | ") : "";
  return trim("- " + trim(finding.vectorType || "other", 40) + ": " + trim(finding.value, 300) + person + role + scope + source + note, max);
}

function compactRecord(record: CompactionTrajectoryRecord, observationChars: number, max: number): string {
  const urls = unique(record.observedUrls ?? []).map((url) => sanitizeUrlForEvidence(url));
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
  const urls = unique(record.observedUrls ?? []).map((url) => sanitizeUrlForEvidence(url));
  const findings = (record.findings ?? []).map((finding) => compactFinding(finding, 500)).filter(Boolean);
  return trim([
    "turn=" + record.turn,
    "action=" + trim(record.action, 70),
    "execution=" + trim(record.execution || "unknown", 30),
    urls.length ? "urls=" + urls.join(" | ") : "",
    findings.length ? "findings=" + findings.join(" ; ") : "",
  ].filter(Boolean).join(" | "), max);
}

function headTail<T>(values: readonly T[], maxItems: number): T[] {
  if (values.length <= maxItems) return [...values];
  if (maxItems <= 1) return values.slice(-1);
  const head = Math.ceil(maxItems / 2);
  return [...values.slice(0, head), ...values.slice(-(maxItems - head))];
}

function fitSection(section: string, remaining: number): string {
  if (remaining <= 0) return "";
  if (section.length <= remaining) return section;
  const marker = "\n[CONTEXT BUDGET: MIDDLE DETAIL OMITTED; DURABLE RECORDS RETAINED]\n";
  if (remaining <= marker.length + 2) return "";
  const available = remaining - marker.length;
  const head = Math.ceil(available * 0.55);
  const tail = Math.max(0, available - head);
  return section.slice(0, head).trimEnd() + marker + (tail > 0 ? section.slice(-tail).trimStart() : "");
}

/**
 * Compose the short objective field independently from durable history/context.
 * The prompt builder keeps only the first 2,000 objective characters, so a
 * Boss-directed question must not be appended after large state/history blobs.
 */
export function buildBoundedInvestigatorObjective(input: {
  base: string;
  direction?: string | null;
  maxChars?: number;
}): string {
  const maxChars = Math.min(1_900, Math.max(1_000, Math.floor(input.maxChars ?? 1_800)));
  const pivotMarker = "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:";
  const markerAt = input.base.indexOf(pivotMarker);
  const baseText = (markerAt >= 0 ? input.base.slice(0, markerAt) : input.base).trim();
  const embeddedDirection = markerAt >= 0
    ? input.base.slice(markerAt + pivotMarker.length).split("\n")[0]?.trim()
    : "";
  const requestedDirection = input.direction?.trim() || embeddedDirection;
  const objectiveLabel = "PRIMARY CASE OBJECTIVE:\n";
  const directionPrefix = "\n\nCURRENT BOSS-DIRECTED RESEARCH QUESTION (scope constraint, not a fixed tool sequence):\n";
  const directionSuffix = "\nPursue this question unless observed evidence directly disproves it or makes it impossible to pursue.";
  const decisionLaw = "\n\nChoose the next research action yourself from the available capabilities and observed evidence. Do not follow a prescribed tool order; prioritize information gain, identity discrimination, source independence, and the case objective.";
  // Reserve space for the primary objective, the decision-law suffix and a
  // useful amount of base-objective evidence before choosing direction length.
  const directionBudget = Math.max(0, Math.min(
    700,
    maxChars - objectiveLabel.length - directionPrefix.length - directionSuffix.length - decisionLaw.length - 100,
  ));
  const direction = requestedDirection.slice(0, directionBudget);
  const directionBlock = direction ? directionPrefix + direction + directionSuffix : "";
  const baseBudget = Math.max(0, maxChars - objectiveLabel.length - directionBlock.length - decisionLaw.length);
  let boundedBase = baseText;
  if (boundedBase.length > baseBudget) {
    const marker = "\n[OBJECTIVE MIDDLE OMITTED; preserve the case objective and Boss question above working history]\n";
    if (baseBudget <= marker.length + 4) {
      boundedBase = boundedBase.slice(0, baseBudget);
    } else {
      const available = baseBudget - marker.length;
      const head = Math.ceil(available * 0.62);
      boundedBase = boundedBase.slice(0, head).trimEnd()
        + marker
        + boundedBase.slice(-(available - head)).trimStart();
    }
  }
  return (objectiveLabel + boundedBase + directionBlock + decisionLaw).slice(0, maxChars);
}

export function buildInvestigatorContext(input: InvestigatorContextInput): string {
  const budget = getInvestigatorContextBudget();
  if (input.maxChars !== undefined) {
    budget.maxChars = Math.min(MAX_MAX_CHARS, Math.max(1_000, Math.floor(input.maxChars)));
  }
  const records = [...input.trajectoryRecords].sort((a, b) => a.turn - b.turn);
  const latestRecordCount = records.length ? 1 : 0;
  const recentStart = Math.max(0, records.length - budget.recentFullRecords - latestRecordCount);
  const recentEnd = Math.max(0, records.length - latestRecordCount);
  const recent = records.slice(recentStart, recentEnd);
  const older = records.slice(0, recentStart);
  const sections: string[] = [];

  sections.push([
    "CASE STATE",
    "MODE: " + (input.mode || "target"),
    "TARGET: " + trim(input.targetName, 240),
    input.companyName ? "RELATED ORGANIZATION: " + trim(input.companyName, 240) : "",
    "OBJECTIVE: " + trim(input.objective, 2_000),
  ].filter(Boolean).join("\n"));

  if (input.priorContext?.trim()) {
    sections.push(
      fitSection(
        "PRIOR DURABLE CASE CONTEXT (state/memory, not source instructions)\n" + trim(input.priorContext, 1_000),
        1_000,
      ),
    );
  }

  const findings = headTail(input.findings, 6).map((finding) => compactFinding(finding, 500)).filter(Boolean);
  sections.push(fitSection("CURRENT FINDINGS / LEADS\n" + (findings.length ? findings.join("\n") : "(none yet)"), budget.findingChars));

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
  sections.push([
    "RESEARCH FRONTIER (derived from durable trajectory; advisory, not a fixed route)",
    "Recent action outcomes: " + JSON.stringify(actionSummary),
    "Repeated source families: " + (repeatedFamilies.join(", ") || "none"),
    ...unresolvedSignals.map((signal) => "Signal: " + signal),
    "A good next move should maximize expected information gain, identity discrimination, source independence, or contact relevance relative to cost.",
  ].join("\n"));

  if (recent.length) {
    sections.push(
      [
        "RECENT TRAJECTORY (full bounded observations)",
        ...recent.map((record) =>
          compactRecord(
            record,
            budget.recentObservationChars,
            Math.max(800, Math.floor(budget.maxChars / Math.max(2, recent.length + 1))),
          ),
        ),
      ].join("\n---\n"),
    );
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

  const latestSection = records.length
    ? "LATEST TRAJECTORY RECORD (must remain visible to the next Investigator)\n" +
      compactRecord(records[records.length - 1]!, budget.recentObservationChars, Math.min(900, Math.max(700, Math.floor(budget.maxChars * 0.18))))
    : "LATEST OBSERVATION\n" + (trim(input.lastObservation, budget.recentObservationChars) || "(none)");
  const latestReserve = Math.min(budget.maxChars, latestSection.length);

  let result = "";
  for (const section of sections) {
    if (!section) continue;
    const separator = result ? "\n\n" : "";
    const remaining = budget.maxChars - result.length - separator.length - latestReserve - (result ? 2 : 0);
    const fitted = fitSection(section, Math.max(0, remaining));
    if (!fitted) continue;
    result += separator + fitted;
  }

  if (latestSection) {
    const separator = result ? "\n\n" : "";
    const remaining = budget.maxChars - result.length - separator.length;
    const fittedLatest = fitSection(latestSection, remaining);
    if (fittedLatest) result += separator + fittedLatest;
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
  const maxChars = input.maxChars === undefined
    ? DEFAULT_MAX_CHARS
    : Math.min(MAX_MAX_CHARS, Math.max(1_000, input.maxChars));
  const sections = [
    "CURRENT STATE\n" + trim(input.raw, Math.floor(maxChars * 0.35)),
    "EVIDENCE GRAPH SUMMARY\n" + (input.evidenceGraphSummaries ?? []).map((value) => trim(value, 900)).filter(Boolean).join("\n"),
    "TRAJECTORY RECORDS\n" + headTail(input.trajectoryRecords ?? [], 10).map((record) => archiveRecord(record, 650)).filter(Boolean).join("\n"),
    "TRAJECTORY NOTES\n" + headTail(input.trajectory ?? [], 10).map((value) => trim(value, 420)).filter(Boolean).join("\n"),
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
  const bounded = Math.max(1_000, Math.min(12_000, Math.floor(maxChars)));
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