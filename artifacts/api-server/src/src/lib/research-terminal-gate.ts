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
  "web_search",
  "parallel_web_search",
  "visit",
  "browser_fetch",
  "registry_search",
  "parallel_registry_search",
  "domain_lookup",
  "harvest_domain",
  "footprint_email",
  "footprint_username_maigret",
  "footprint_username_sherlock",
  "footprint_spiderfoot",
]);

/**
 * Discovery needs one source-backed review lead before it can hand control back.
 * Target-research sufficiency is a model judgement: the Investigator may finish
 * with unresolved questions, a single strong source, contradictory observations,
 * or an honest no-result assessment after doing real research.
 *
 * This contract no longer uses fixed evidence counts, source counts, lexical
 * falsification tests, or zero-open-question rules to dictate when research is
 * sufficient. Exact quote/source/job integrity is enforced at admission time.
 */
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
    // There is no deterministic keyword/token-overlap falsification obligation.
    // The Investigator and independent Right-hand review reason about counterevidence.
    falsificationSatisfied: true,
  };

  const result = evaluateTerminalGate(metrics, defaultTerminalContract(mode));
  if (mode === "target" && context.evidenceCount === 0 && !hasSuccessfulExternalResearchAttempt(context)) {
    return {
      ...result,
      allowed: false,
      reasons: ["no_existing_evidence_or_successful_external_research_action"],
    };
  }
  return result;
}
