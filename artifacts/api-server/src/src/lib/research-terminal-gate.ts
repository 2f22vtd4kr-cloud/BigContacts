import { evaluateTerminalGate, type EvidenceSufficiencyContract, type TerminalGateResult } from "./research-epistemic-vnext";
import type { IntelligenceContext } from "./research-intelligence-engine";
export type TerminalContractMode = "target" | "discovery";

/** A model-selected done action is terminal only when the core accepts it. */
export function isAcceptedInvestigatorTerminal(input: { action: unknown; execution: unknown; stopReason: unknown }): boolean {
  return input.action === "done"
    && input.execution === "success"
    && input.stopReason === "MODEL_DECIDED_DONE";
}
export function defaultTerminalContract(mode: TerminalContractMode): EvidenceSufficiencyContract {
  return mode === "discovery"
    ? { minEvidence: 2, minIndependentSourceUnits: 2, requireExactSpanForFindings: false, requireFalsification: true, allowOpenQuestions: 1, allowHighSeverityContradictions: 0 }
    : { minEvidence: 3, minIndependentSourceUnits: 2, requireExactSpanForFindings: true, requireFalsification: true, allowOpenQuestions: 0, allowHighSeverityContradictions: 0 };
}
/**
 * Falsification is an action-level obligation, not a priority score.
 * A high confidence score can make a discriminator mandatory; it can never
 * prove that the discriminator was actually tested.
 */
export function hasExplicitFalsificationAttempt(context: IntelligenceContext): boolean {
  if (!context.falsification.required) return true;
  const intent = /\b(disprov\w*|falsif\w*|refut\w*|counter[- ]?evidence|rule\s+out|challenge\s+the\s+(leading|current)|alternative\s+hypothesis|attempt\s+to\s+refute|test\s+against)\b/i;
  const externalActions = new Set([
    "web_search", "parallel_web_search", "visit", "browser_fetch",
    "registry_search", "domain_lookup", "harvest_domain",
    "footprint_email", "footprint_username_maigret",
    "footprint_username_sherlock", "footprint_spiderfoot",
  ]);
  return context.recentActions.some((action) => {
    if (action.execution !== "success" || !externalActions.has(action.action)) return false;
    const args = action.args ?? {};
    const purpose = typeof args.purpose === "string" ? args.purpose : "";
    const hypothesis = typeof args.hypothesis === "string" ? args.hypothesis : "";
    const query = typeof args.query === "string" ? args.query : "";
    const nestedQueries = Array.isArray(args.searches)
      ? args.searches.flatMap((search: unknown) => {
          if (!search || typeof search !== "object" || !("query" in search)) return [];
          const nestedQuery = (search as { query?: unknown }).query;
          return typeof nestedQuery === "string" ? [nestedQuery] : [];
        })
      : [];
    return intent.test(purpose)
      || intent.test(hypothesis)
      || intent.test(query)
      || nestedQueries.some((nestedQuery) => intent.test(nestedQuery));
  });
}

export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) => (item.kind === "finding" || item.kind === "claim") && item.spanBound === true && item.spanBindingKind === "identity_and_value" && Boolean(item.passage && item.passage.trim())).length;
  // IntelligenceContext has already resolved source independence through the source-lineage graph.
  // Preserve that authority rather than collapsing evidence back to raw hostnames.
  const independentSourceUnits = context.independentSourceUnits;
  const falsificationSatisfied = !context.falsification.required || hasExplicitFalsificationAttempt(context);

  return evaluateTerminalGate({ evidenceCount: context.evidenceCount, independentSourceUnits: context.independentSourceUnits, exactSpanBindings, openQuestions: context.openQuestions.length, highSeverityContradictions: context.contradictions.length, falsificationSatisfied }, defaultTerminalContract(mode));
}
