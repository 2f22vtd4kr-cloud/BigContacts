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
export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) => (item.kind === "finding" || item.kind === "claim") && Boolean(item.passage && item.passage.trim())).length;
  // IntelligenceContext has already resolved source independence through the source-lineage graph.
  // Preserve that authority rather than collapsing evidence back to raw hostnames.
  const independentSourceUnits = context.independentSourceUnits;
  const falsificationSatisfied = !context.falsification.required || context.falsification.priority < 0.35;
  return evaluateTerminalGate({ evidenceCount: context.evidenceCount, independentSourceUnits: context.independentSourceUnits, exactSpanBindings, openQuestions: context.openQuestions.length, highSeverityContradictions: context.contradictions.length, falsificationSatisfied }, defaultTerminalContract(mode));
}
