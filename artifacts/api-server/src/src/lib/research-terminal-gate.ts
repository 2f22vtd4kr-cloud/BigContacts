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
    ? { minEvidence: 1, minIndependentSourceUnits: 1, requireExactSpanForFindings: false, requireFalsification: false, allowOpenQuestions: 8, allowHighSeverityContradictions: 0 }
    : { minEvidence: 3, minIndependentSourceUnits: 2, requireExactSpanForFindings: true, requireFalsification: true, allowOpenQuestions: 0, allowHighSeverityContradictions: 0 };
}
/**
 * Falsification is an action-level obligation, not a priority score.
 * A high confidence score can make a discriminator mandatory; it can never
 * prove that the discriminator was actually tested.
 */
export function hasExplicitFalsificationAttempt(context: IntelligenceContext): boolean {
  // Mentioning an alternative hypothesis is not enough: the completed action
  // must target the currently active discriminator and have a real outcome.
  const intent = /\b(disprov\w*|falsif\w*|refut\w*|counter[- ]?evidence|rule\s+out|challenge\s+the\s+(leading|current)|attempt\s+to\s+(refute|disprove)|test\s+against|test\s+(the\s+)?alternative\s+hypothesis)\b/i;
  const discriminatorText = context.falsification?.discriminator?.trim()
    || [...context.hypotheses].sort((x, y) => y.score - x.score)[0]?.label
    || "";
  const normalizeText = (value: string) => value.toLowerCase()
    .replace(/\bchief\s+executive\s+officer\b|\bceo\b/g, " executive ")
    .replace(/\bchief\s+financial\s+officer\b|\bcfo\b/g, " finance ")
    .replace(/\bchief\s+technology\s+officer\b|\bcto\b/g, " technology ")
    .replace(/\bchief\s+operating\s+officer\b|\bcoo\b/g, " operations ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const generic = new Set(["the","and","for","with","from","that","this","current","leading","test","alternative","hypothesis","identity","person","profile","company","role","position","about","verify","disprove","falsify","refute","evidence","counter","against","attempt","challenge","seek","rule","out"]);
  const activeTerms = normalizeText(discriminatorText).split(" ").filter((token) => token.length > 2 && !generic.has(token));
  if (!activeTerms.length) return false;
  const targetsActiveDiscriminator = (value: string) => {
    const tokens = new Set(normalizeText(value).split(" ").filter(Boolean));
    return activeTerms.some((token) => tokens.has(token));
  };
  const externalActions = new Set(["web_search","parallel_web_search","visit","browser_fetch","registry_search","domain_lookup","harvest_domain","footprint_email","footprint_username_maigret","footprint_username_sherlock","footprint_spiderfoot"]);
  return context.recentActions.some((action) => {
    if (action.execution !== "success" || !externalActions.has(action.action)) return false;
    const args = action.args ?? {};
    const purpose = typeof args.purpose === "string" ? args.purpose : "";
    const hypothesis = typeof args.hypothesis === "string" ? args.hypothesis : "";
    if (action.action === "parallel_web_search") {
      const outcomes = Array.isArray(args.searchOutcomes) ? args.searchOutcomes : [];
      return outcomes.some((entry: unknown) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
        const result = entry as { query?: unknown; status?: unknown };
        return typeof result.query === "string"
          && ["success","empty"].includes(String(result.status).toLowerCase())
          && intent.test(result.query)
          && targetsActiveDiscriminator(result.query);
      });
    }
    if (action.action === "web_search") {
      const query = typeof args.query === "string" ? args.query : "";
      return intent.test(query) && targetsActiveDiscriminator(query);
    }
    return intent.test(purpose) && targetsActiveDiscriminator(purpose + " " + hypothesis);
  });
}

export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) => (item.kind === "finding" || item.kind === "claim") && item.spanBound === true && item.spanBindingKind === "identity_and_value" && Boolean(item.passage && item.passage.trim())).length;
  // IntelligenceContext has already resolved source independence through the source-lineage graph.
  // Preserve that authority rather than collapsing evidence back to raw hostnames.
  const contract = defaultTerminalContract(mode);
  const falsificationSatisfied = !contract.requireFalsification || hasExplicitFalsificationAttempt(context);

  return evaluateTerminalGate({ evidenceCount: context.evidenceCount, independentSourceUnits: context.independentSourceUnits, exactSpanBindings, openQuestions: context.openQuestions.length, highSeverityContradictions: context.contradictions.length, falsificationSatisfied }, contract);
}
