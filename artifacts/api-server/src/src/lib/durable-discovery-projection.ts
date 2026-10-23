import { PRIVACY_WITHHELD_URL_MARKER, retainCompletePublicHttpUrlForPrompt } from "./url-privacy";
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

/** A bounded trajectory can roll an omission-bearing record out of its recent window. */
export function hasDurableUrlProjectionOmissions(
  priorFlag: unknown,
  records: readonly unknown[],
): boolean {
  if (priorFlag === true) return true;
  return records.some((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const omissions = (record as Record<string, unknown>).durableProjectionOmissions;
    if (!omissions || typeof omissions !== "object" || Array.isArray(omissions)) return false;
    return Object.entries(omissions as Record<string, unknown>)
      .some(([key, value]) => key !== "reason" && Number(value) > 0);
  });
}

function searchLeadUrlKey(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname || url.username || url.password) return null;
    // Search lead URLs are recorded without fragments; use the same identity for
    // matching the provider's URL: line while retaining the route stored on the card.
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    const href = url.href;
    return href.endsWith("/") ? href.slice(0, -1) : href;
  } catch {
    return null;
  }
}

/**
 * Extract only the provider's snippet for one exact search-result URL. This is
 * a display hint, never claim-grade evidence; callers must label it unverified.
 */
export function extractSearchResultSnippetForLead(
  observation: unknown,
  sourceUrl: string,
  maxChars = 280,
): string | null {
  if (typeof observation !== "string" || !Number.isFinite(maxChars) || maxChars < 1) return null;
  const targetKey = searchLeadUrlKey(sourceUrl);
  if (!targetKey) return null;
  const lines = observation.split(/\r?\n/);
  const urlLineIndex = lines.findIndex((line) => {
    const match = line.match(/^\s*URL:\s*(https?:\/\/\S+)\s*$/i);
    return Boolean(match && searchLeadUrlKey(match[1]!) === targetKey);
  });
  if (urlLineIndex < 0) return null;

  let end = lines.length;
  for (let index = urlLineIndex + 1; index < lines.length; index++) {
    if (/^\s*(?:INVESTIGATOR QUERY GUIDANCE|PARALLEL_SEARCH \d+ provider=|WEB_SEARCH provider=)/i.test(lines[index]!)) {
      end = index;
      break;
    }
    if (/^\s*URL:\s*https?:\/\//i.test(lines[index]!)) {
      // The line immediately before the next URL is that result's title, not
      // part of this result's snippet. Stop before it.
      end = Math.max(urlLineIndex + 1, index - 1);
      break;
    }
  }

  const raw = lines.slice(urlLineIndex + 1, end).join(" ").trim();
  if (!raw) return null;
  const boundedLimit = Math.min(500, Math.max(1, Math.floor(maxChars)));
  const safe = raw
    .replace(/https?:\/\/\S+/gi, "[URL omitted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[public email omitted]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone omitted]")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, boundedLimit);
  return safe || null;
}

function safeProjectionUrl(raw: string): string | null {
  return retainCompletePublicHttpUrlForPrompt(raw, MAX_DURABLE_PROJECTION_URL_CHARS);
}

/** Keep URL tokens atomic when shortening non-authoritative descriptive text. */
function compactText(raw: string | undefined, maxChars: number): { value?: string; omittedUrls: number } {
  if (raw === undefined || raw.length <= maxChars || raw.includes("[URL omitted from bounded case-file projection")) return { value: raw, omittedUrls: 0 };
  const matches = [...raw.matchAll(URL_TOKEN_PATTERN)];
  const omitted = matches.filter((candidate) => (candidate.index ?? 0) + candidate[0].length > maxChars);
  if (omitted.length > 0) {
    const firstOmittedStart = omitted[0].index ?? maxChars;
    const prefixEnd = Math.min(maxChars, firstOmittedStart);
    return {
      value: raw.slice(0, prefixEnd) + "[URL omitted from bounded case-file projection; full value remains in immutable research_case_events]",
      omittedUrls: omitted.length,
    };
  }
  return { value: raw.slice(0, maxChars), omittedUrls: 0 };
}

function countUrlReferences(value: unknown, key = "", depth = 0): { urlFields: number; textFields: number; textUrls: number } {
  if (depth > 8 || value == null) return { urlFields: 0, textFields: 0, textUrls: 0 };
  if (typeof value === "string") {
    if (/(?:urls?|uris?)$/i.test(key)) {
      return /^https?:\/\//i.test(value) ? { urlFields: 1, textFields: 0, textUrls: 0 } : { urlFields: 0, textFields: 0, textUrls: 0 };
    }
    const matches = [...value.matchAll(URL_TOKEN_PATTERN)];
    return { urlFields: 0, textFields: matches.length > 0 ? 1 : 0, textUrls: matches.length };
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => {
      const next = countUrlReferences(item, key, depth + 1);
      return { urlFields: sum.urlFields + next.urlFields, textFields: sum.textFields + next.textFields, textUrls: sum.textUrls + next.textUrls };
    }, { urlFields: 0, textFields: 0, textUrls: 0 });
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce((sum, [childKey, child]) => {
      const next = countUrlReferences(child, childKey, depth + 1);
      return { urlFields: sum.urlFields + next.urlFields, textFields: sum.textFields + next.textFields, textUrls: sum.textUrls + next.textUrls };
    }, { urlFields: 0, textFields: 0, textUrls: 0 });
  }
  return { urlFields: 0, textFields: 0, textUrls: 0 };
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
    reason: "Routes may be omitted whole by the size bound or withheld by URL privacy policy; only safe public URL values remain in the immutable event ledger.",
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
    const argumentEntries = Object.entries(record.args ?? {});
    const countDroppedArgument = (key: string, value: unknown) => {
      const counted = countUrlReferences(value, key);
      omissions.argumentUrls += counted.urlFields;
      omissions.argumentTextsWithUrls += counted.textFields;
      omissions.textUrls += counted.textUrls;
    };
    const isUrlArgument = (key: string) => /(?:url|uri)$/i.test(key);
    // URL-bearing fields take priority so a long optional prompt argument cannot
    // crowd an authoritative resource route out of the bounded working state.
    const prioritizedEntries = [
      ...argumentEntries.filter(([key]) => isUrlArgument(key)),
      ...argumentEntries.filter(([key]) => !isUrlArgument(key)),
    ];
    const projectedEntries = prioritizedEntries.slice(0, MAX_DURABLE_PROJECTION_ITEMS);
    for (const [key, rawValue] of projectedEntries) {
      if (typeof rawValue !== "string") {
        args[key] = rawValue;
        continue;
      }
      if (isUrlArgument(key)) {
        if (rawValue.startsWith("[URL omitted from bounded case-file projection;")
          || rawValue === PRIVACY_WITHHELD_URL_MARKER) {
          args[key] = rawValue;
          continue;
        }
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
    // The argument object is bounded, but omissions must remain observable even
    // when a URL-bearing field appears after the first N source fields.
    for (const [key, rawValue] of prioritizedEntries.slice(MAX_DURABLE_PROJECTION_ITEMS)) {
      if (typeof rawValue === "string" && rawValue.startsWith("[URL omitted from bounded case-file projection;")) continue;
      countDroppedArgument(key, rawValue);
    }

    const observed = compactUrlList(record.observedUrls);
    const leads = compactUrlList(record.leadUrls);
    omissions.observedUrls += observed.omitted;
    omissions.leadUrls += leads.omitted;

    let omittedFindingSourceUrls = 0;
    let omittedFindingTextUrls = 0;
    for (const omittedFinding of (record.findings ?? []).slice(MAX_DURABLE_PROJECTION_ITEMS)) {
      omissions.findingSourceUrls += countUrlReferences(omittedFinding.sourceUrls, "sourceUrls").urlFields;
      omissions.textUrls += countUrlReferences([omittedFinding.note, omittedFinding.promotionReason], "note").textUrls;
    }
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


/**
 * Prefer immutable trajectory events over the bounded projection for identical
 * turn/action pairs. A legacy projection may contain a URL prefix cut mid-token;
 * keeping that copy alongside the full event would render a plausible but false link.
 */
export function mergeSourceCardTrajectoryRecords<T extends Record<string, unknown>>(
  projectionRecords: T[],
  durableRecords: T[],
): T[] {
  const actionKey = (record: Record<string, unknown>) =>
    `${Number(record.turn ?? 0)}:${String(record.action ?? "")}`;
  const durableActionKeys = new Set(durableRecords.map(actionKey));
  return [
    ...projectionRecords.filter((record) => !durableActionKeys.has(actionKey(record))),
    ...durableRecords,
  ].sort((a, b) => Number(a.turn ?? 0) - Number(b.turn ?? 0));
}


export type DurableUrlInventory = {
  text: string;
  urls: string[];
  omittedWhole: number;
};

const MAX_REHYDRATED_URLS = 32;
const MAX_REHYDRATED_URL_CHARS = 12_000;
const MAX_VERBATIM_URL_CHARS = 32_768;

function isVerbatimPublicHttpUrl(value: unknown): value is string {
  // Share the same exact-URL and secret-bearing-parameter policy as prompts.
  // A durable event is not permission to surface credentials or a rewritten URL.
  return typeof value === "string"
    && retainCompletePublicHttpUrlForPrompt(value, MAX_VERBATIM_URL_CHARS) === value;
}
/**
 * Rehydrates exact public URL values from append-only case events when the
 * bounded caseFile projection omits a route whole. It never canonicalizes,
 * redacts, or slices the URL here; privacy-redacted routes remain non-actionable.
 */
export function buildDurableUrlInventoryFromEventPayloads(
  payloadsNewestFirst: readonly (string | null | undefined)[],
  options: { maxUrls?: number; maxChars?: number; activeScopeKey?: string | null; requireExactScope?: boolean } = {},
): DurableUrlInventory {
  const maxUrls = Number.isFinite(options.maxUrls) ? Math.max(0, Math.floor(options.maxUrls!)) : MAX_REHYDRATED_URLS;
  const maxChars = Number.isFinite(options.maxChars) ? Math.max(0, Math.floor(options.maxChars!)) : MAX_REHYDRATED_URL_CHARS;
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (!isVerbatimPublicHttpUrl(value) || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };
  const addMany = (value: unknown) => {
    if (Array.isArray(value)) for (const item of value) add(item);
  };

  for (const rawPayload of payloadsNewestFirst) {
    if (typeof rawPayload !== "string" || !rawPayload) continue;
    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawPayload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      payload = parsed as Record<string, unknown>;
    } catch {
      continue;
    }

    // Once Boss has accepted a new pivot, only events explicitly tagged with
    // that exact scope may repopulate the Investigator URL inventory. Legacy
    // unscoped events and records from an earlier pivot remain durable but are
    // not silently adopted into the new mission.
    if (options.requireExactScope === true) {
      if (typeof options.activeScopeKey !== "string" || !options.activeScopeKey
        || typeof payload.pivotScopeKey !== "string"
        || payload.pivotScopeKey !== options.activeScopeKey) {
        continue;
      }
    }

    addMany(payload.leadUrls);
    addMany(payload.observedUrls);

    const args = payload.args;
    if (args && typeof args === "object" && !Array.isArray(args)) {
      for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
        if (/(?:url|uri)$/i.test(key)) add(value);
      }
    }
    if (Array.isArray(payload.findings)) {
      for (const finding of payload.findings) {
        if (finding && typeof finding === "object" && !Array.isArray(finding)) {
          addMany((finding as Record<string, unknown>).sourceUrls);
        }
      }
    }
    const claim = payload.claim;
    if (claim && typeof claim === "object" && !Array.isArray(claim)) {
      addMany((claim as Record<string, unknown>).sourceUrls);
    }
    if (Array.isArray(payload.sourceBindings)) {
      for (const binding of payload.sourceBindings) {
        if (binding && typeof binding === "object" && !Array.isArray(binding)) {
          add((binding as Record<string, unknown>).sourceUrl);
        }
      }
    }
  }

  const urls: string[] = [];
  let usedChars = 0;
  let omittedWhole = 0;
  for (const url of candidates) {
    if (urls.length >= maxUrls || url.length > maxChars - usedChars) {
      omittedWhole += 1;
      continue;
    }
    urls.push(url);
    usedChars += url.length;
  }

  const text = [
    "DURABLE EXACT URL INVENTORY (verbatim values from immutable research_case_events; URLs are leads, not evidence; never reconstruct or shorten):",
    ...urls.map((url) => "- " + url),
    omittedWhole > 0
      ? String(omittedWhole) + " additional URL(s) were omitted whole from this bounded inventory; the case-event ledger remains authoritative. Do not invent or rebuild them."
      : "No safe public URL in this inventory sample was truncated; credential-bearing or otherwise sensitive routes are withheld by policy and cannot be reconstructed.",
  ].join("\n");
  return { text, urls, omittedWhole };
}
