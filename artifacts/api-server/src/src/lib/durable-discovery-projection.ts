import { sanitizeUrlForEvidence } from "./url-privacy";
import type { AgenticFinding, AgenticTrajectoryRecord } from "./agentic-web-research-core";

const MAX_DURABLE_PROJECTION_URL_CHARS = 500;
const MAX_DURABLE_PROJECTION_ITEMS = 24;
const MAX_DURABLE_PROJECTION_TEXT_CHARS = 800;
const URL_TOKEN_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

export type DurableProjectionOmissions = {
  argumentUrls: number;
  argumentTextsWithUrls: number;
  observedUrls: number;
  leadUrls: number;
  findingSourceUrls: number;
  sourceBindingUrls: number;
  textUrls: number;
  reason: string;
};

export type DurableProjectionRecord = AgenticTrajectoryRecord & {
  /** Only used by the bounded case-file projection; complete payloads remain in the append-only event ledger. */
  durableProjectionOmissions?: DurableProjectionOmissions;
};

function safeProjectionUrl(raw: string): string | null {
  const safe = sanitizeUrlForEvidence(raw);
  if (!safe || safe.startsWith("[") || safe.length > MAX_DURABLE_PROJECTION_URL_CHARS) return null;
  try {
    const parsed = new URL(safe);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? safe : null;
  } catch {
    return null;
  }
}

/** Keep URL tokens atomic when shortening non-authoritative descriptive text. */
function compactText(raw: string | undefined, maxChars: number): { value?: string; omittedUrls: number } {
  if (raw === undefined || raw.length <= maxChars) return { value: raw, omittedUrls: 0 };
  const match = [...raw.matchAll(URL_TOKEN_PATTERN)].find((candidate) => {
    const start = candidate.index ?? -1;
    return start >= 0 && start < maxChars && start + candidate[0].length > maxChars;
  });
  if (match?.index !== undefined) {
    return {
      value: raw.slice(0, match.index) + "[URL omitted from bounded case-file projection; full value remains in immutable research_case_events]",
      omittedUrls: 1,
    };
  }
  return { value: raw.slice(0, maxChars), omittedUrls: 0 };
}

function compactUrlList(values: readonly string[] | undefined): { values: string[]; omitted: number } {
  const unique = [...new Set((values ?? []).filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
  const kept: string[] = [];
  let omitted = Math.max(0, unique.length - MAX_DURABLE_PROJECTION_ITEMS);
  for (const raw of unique.slice(0, MAX_DURABLE_PROJECTION_ITEMS)) {
    const safe = safeProjectionUrl(raw);
    if (!safe) {
      omitted += 1;
      continue;
    }
    if (!kept.includes(safe)) kept.push(safe);
  }
  return { values: kept, omitted };
}

function priorOmissions(record: AgenticTrajectoryRecord): DurableProjectionOmissions {
  const prior = (record as DurableProjectionRecord).durableProjectionOmissions;
  return {
    argumentUrls: Math.max(0, Number(prior?.argumentUrls) || 0),
    argumentTextsWithUrls: Math.max(0, Number(prior?.argumentTextsWithUrls) || 0),
    observedUrls: Math.max(0, Number(prior?.observedUrls) || 0),
    leadUrls: Math.max(0, Number(prior?.leadUrls) || 0),
    findingSourceUrls: Math.max(0, Number(prior?.findingSourceUrls) || 0),
    sourceBindingUrls: Math.max(0, Number(prior?.sourceBindingUrls) || 0),
    textUrls: Math.max(0, Number(prior?.textUrls) || 0),
    reason: "A value did not fit the bounded case-file projection and was omitted as a whole; the immutable research_case_events payload is authoritative.",
  };
}

/**
 * Bounded working projection for caseFile. Never truncates an URL into a different URL.
 * The append-only research_case_events ledger remains authoritative for full arguments,
 * observations, findings and URL values.
 */
export function compactDurableDiscoveryRecords(records: AgenticTrajectoryRecord[]): DurableProjectionRecord[] {
  return records.slice(Math.max(0, records.length - 64)).map((record) => {
    const omissions = priorOmissions(record);
    const args: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(record.args ?? {}).slice(0, MAX_DURABLE_PROJECTION_ITEMS)) {
      if (typeof rawValue !== "string") {
        args[key] = rawValue;
        continue;
      }
      const isUrlField = /(?:url|uri)$/i.test(key);
      if (isUrlField) {
        const safe = safeProjectionUrl(rawValue);
        if (safe) args[key] = safe;
        else {
          args[key] = "[URL omitted from bounded case-file projection; full value remains in immutable research_case_events]";
          omissions.argumentUrls += 1;
        }
        continue;
      }
      if (/https?:\/\//i.test(rawValue) && rawValue.length > MAX_DURABLE_PROJECTION_TEXT_CHARS) {
        const compacted = compactText(rawValue, MAX_DURABLE_PROJECTION_TEXT_CHARS);
        args[key] = compacted.value ?? "";
        omissions.argumentTextsWithUrls += 1;
        omissions.textUrls += compacted.omittedUrls;
        continue;
      }
      args[key] = rawValue.slice(0, MAX_DURABLE_PROJECTION_TEXT_CHARS);
    }

    const observed = compactUrlList(record.observedUrls);
    const leads = compactUrlList(record.leadUrls);
    omissions.observedUrls += observed.omitted;
    omissions.leadUrls += leads.omitted;

    let omittedFindingSourceUrls = 0;
    let omittedFindingTextUrls = 0;
    const findings: AgenticFinding[] = (record.findings ?? []).slice(0, MAX_DURABLE_PROJECTION_ITEMS).map((finding) => {
      const sources = compactUrlList(finding.sourceUrls);
      omittedFindingSourceUrls += sources.omitted;
      const note = compactText(finding.note, 500);
      const promotionReason = compactText(finding.promotionReason, 500);
      omittedFindingTextUrls += note.omittedUrls + promotionReason.omittedUrls;
      return {
        ...finding,
        value: finding.value?.slice(0, 500),
        personName: finding.personName?.slice(0, 160) ?? null,
        role: finding.role?.slice(0, 160) ?? null,
        sourceUrls: sources.values,
        note: note.value ?? "",
        promotionReason: promotionReason.value?.slice(0, 500),
      };
    });
    omissions.findingSourceUrls += omittedFindingSourceUrls;
    omissions.textUrls += omittedFindingTextUrls;

    const sourceBindings = (record.sourceBindings ?? []).slice(0, MAX_DURABLE_PROJECTION_ITEMS).flatMap((binding) => {
      const safe = safeProjectionUrl(binding.sourceUrl);
      if (!safe) {
        omissions.sourceBindingUrls += 1;
        return [];
      }
      return [{ ...binding, sourceUrl: safe, findingValue: binding.findingValue.slice(0, 500) }];
    });
    omissions.sourceBindingUrls += Math.max(0, (record.sourceBindings?.length ?? 0) - MAX_DURABLE_PROJECTION_ITEMS);

    const thought = compactText(record.thought, 600);
    const observation = compactText(record.observation, 2_000);
    omissions.textUrls += thought.omittedUrls + observation.omittedUrls;
    const totalOmissions = omissions.argumentUrls + omissions.argumentTextsWithUrls + omissions.observedUrls
      + omissions.leadUrls + omissions.findingSourceUrls + omissions.sourceBindingUrls + omissions.textUrls;
    const projected: DurableProjectionRecord = {
      ...record,
      args,
      thought: thought.value,
      observation: observation.value,
      observedUrls: observed.values,
      leadUrls: leads.values,
      findings,
      sourceBindings,
    };
    if (totalOmissions > 0) projected.durableProjectionOmissions = omissions;
    else delete projected.durableProjectionOmissions;
    return projected;
  });
}
