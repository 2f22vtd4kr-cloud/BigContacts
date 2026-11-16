import { hostnameOf, isAggregatorHost } from "./source-corroboration";

import { evaluateTerminalGate, type EvidenceSufficiencyContract, type TerminalGateResult } from "./research-epistemic-vnext";
import type { IntelligenceContext } from "./research-intelligence-engine";

export type TerminalContractMode = "target" | "discovery";

/** A model-selected terminal action is accepted only after the core gate records it. */
export function isAcceptedInvestigatorTerminal(input: { action: unknown; execution: unknown; stopReason: unknown }): boolean {
  return input.action === "done"
    && input.execution === "success"
    && input.stopReason === "MODEL_DECIDED_DONE";
}

const EXECUTED_RESEARCH_ACTIONS = new Set([
  "web_search", "parallel_web_search", "visit", "browser_fetch",
  "registry_search", "parallel_registry_search", "domain_lookup", "harvest_domain",
  "footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "footprint_spiderfoot",
]);

function actionText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function containsFalsificationIntent(value: string, discriminator: string): boolean {
  if (!/\b(counterevidence|counter-evidence|disprove|falsif(?:y|ication)|contradict(?:ion)?|refute|challenge|evidence against|test against)\b/i.test(value)) return false;
  if (!discriminator) return true;
  const tokens = discriminator.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const relevant = tokens.filter((token) => token.length > 2 && !["the", "and", "for", "with", "from", "that", "this"].includes(token));
  return relevant.length === 0 || relevant.every((token) => value.toLowerCase().includes(token));
}

/** Require a successful, explicit counterevidence attempt; ordinary verification is not falsification. */
export function hasSuccessfulFalsificationAttempt(context: IntelligenceContext): boolean {
  const discriminator = actionText(context.falsification?.discriminator);
  for (const action of context.recentActions) {
    if (action.execution !== "success") continue;
    const args = action.args ?? {};
    if (action.action === "parallel_web_search" || action.action === "parallel_registry_search") {
      const searches = Array.isArray(args.searches) ? args.searches : [];
      const outcomes = Array.isArray(args.searchOutcomes) ? args.searchOutcomes : null;
      // Without per-query outcomes a successful batch cannot prove that this
      // particular falsification query reached and completed at the provider.
      if (!outcomes) continue;
      for (const search of searches) {
        if (!search || typeof search !== "object" || Array.isArray(search)) continue;
        const query = actionText((search as Record<string, unknown>).query);
        if (!query || !containsFalsificationIntent(query, discriminator)) continue;
        if (outcomes) {
          const outcome = outcomes.find((candidate) => candidate && typeof candidate === "object"
            && !Array.isArray(candidate)
            && actionText((candidate as Record<string, unknown>).query) === query);
          if (!outcome || (outcome as Record<string, unknown>).status === "error") continue;
        }
        return true;
      }
      continue;
    }
    const query = actionText(args.query);
    const candidates = action.action === "web_search" || action.action === "registry_search"
      ? [query]
      : [query, actionText(args.purpose), actionText(args.hypothesis)].filter(Boolean);
    if (candidates.some((candidate) => containsFalsificationIntent(candidate, discriminator))) return true;
  }
  return false;
}

export function defaultTerminalContract(mode: TerminalContractMode): EvidenceSufficiencyContract {
  return mode === "discovery"
    ? {
      minEvidence: 1,
      minIndependentSourceUnits: 1,
      requireExactSpanForFindings: false,
      requireFalsification: false,
      allowOpenQuestions: Number.MAX_SAFE_INTEGER,
      allowHighSeverityContradictions: Number.MAX_SAFE_INTEGER,
    }
    : {
      minEvidence: 0,
      minIndependentSourceUnits: 0,
      requireExactSpanForFindings: false,
      // Falsification is a model-owned research judgment, not a keyword gate.
      // Keep observing whether a counterevidence attempt occurred, but do not
      // veto a valid terminal decision because its query used different wording.
      requireFalsification: false,
      allowOpenQuestions: Number.MAX_SAFE_INTEGER,
      allowHighSeverityContradictions: Number.MAX_SAFE_INTEGER,
    };
}

export function hasSuccessfulExternalResearchAttempt(context: IntelligenceContext): boolean {
  return context.recentActions.some((action) =>
    EXECUTED_RESEARCH_ACTIONS.has(action.action) && action.execution === "success",
  );
}

export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) =>
    (item.kind === "finding" || item.kind === "claim")
      && item.spanBound === true
      && item.spanBindingKind === "identity_and_value"
      && Boolean(item.passage && item.passage.trim()),
  ).length;

  const metrics = {
    evidenceCount: context.evidenceCount,
    independentSourceUnits: context.independentSourceUnits,
    exactSpanBindings,
    openQuestions: context.openQuestions.length,
    highSeverityContradictions: context.contradictions.length,
    falsificationSatisfied: mode === "discovery" || hasSuccessfulFalsificationAttempt(context),
  };

  const result = evaluateTerminalGate(metrics, defaultTerminalContract(mode));
  const claimEvidence = context.atomicEvidence.filter((item) => item.kind === "finding" || item.kind === "claim");
  const claimGroups = new Map<string, typeof claimEvidence>();
  for (const item of claimEvidence) {
    const key = item.claimId?.trim() || item.claim.trim().toLowerCase();
    const group = claimGroups.get(key) ?? [];
    group.push(item);
    claimGroups.set(key, group);
  }
  const nonClaimGradeSourceClasses = new Set(["AGGREGATOR", "SCRAPED_DIRECTORY", "SEARCH_RESULT", "COMMUNITY_OBSERVATION", "UNKNOWN"]);
  const lineageByUrl = new Map((context.sourceLineage ?? []).map((item) => {
    try {
      const url = new URL(item.canonicalUrl);
      url.hash = "";
      url.hostname = url.hostname.toLowerCase();
      return [url.href.replace(/\/$/, ""), item] as const;
    } catch {
      return ["", item] as const;
    }
  }));
  const isIndependentClaimSource = (item: (typeof claimEvidence)[number]): boolean => {
    if (nonClaimGradeSourceClasses.has(item.sourceClass) || !item.sourceUrl || isAggregatorHost(hostnameOf(item.sourceUrl))) return false;
    try {
      const url = new URL(item.sourceUrl);
      url.hash = "";
      url.hostname = url.hostname.toLowerCase();
      const lineage = lineageByUrl.get(url.href.replace(/\/$/, ""));
      // When lineage is available, copied/syndicated derivatives do not count
      // as an independent origin. A primary source may stand alone for a fact.
      return !lineage?.originSourceId;
    } catch {
      return false;
    }
  };
  const claimsWithoutIndependentSource = [...claimGroups.values()].filter((group) =>
    group.length > 0 && group.every((item) => !isIndependentClaimSource(item)),
  );
  const reasons = [...result.reasons];
  // No global source-count quota: a single authoritative origin can substantiate
  // a directly supported fact. Aggregator-only and copied/syndicated material
  // cannot independently establish a claim; assess provenance per claim.
  if (mode === "target" && claimsWithoutIndependentSource.length > 0) {
    reasons.push("claim_evidence_only_from_non_independent_sources");
  }
  if (mode === "target" && claimEvidence.length > exactSpanBindings && !reasons.includes("exact_source_span_binding_incomplete")) {
    reasons.push("exact_source_span_binding_incomplete");
  }
  if (mode === "target" && context.evidenceCount === 0 && !hasSuccessfulExternalResearchAttempt(context)) {
    reasons.push("no_existing_evidence_or_successful_external_research_action");
  }
  // A successful falsification/search attempt with no claim-grade evidence may be an honest stopping point, but it is never a substantiated target result. The canonical target-completion gate separately requires persisted evidence graphs.
  const outcome = context.evidenceCount > 0 ? "evidence_backed" as const : "inconclusive" as const;
  return { ...result, allowed: reasons.length === 0, reasons, outcome };
}
