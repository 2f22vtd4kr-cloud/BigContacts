import { evaluateTerminalGate, type EvidenceSufficiencyContract, type TerminalGateResult } from "./research-epistemic-vnext";
import type { IntelligenceContext } from "./research-intelligence-engine";
export type TerminalContractMode = "target" | "discovery";
export function defaultTerminalContract(mode: TerminalContractMode): EvidenceSufficiencyContract {
  return mode === "discovery"
    ? { minEvidence: 2, minIndependentSourceUnits: 2, requireExactSpanForFindings: false, requireFalsification: true, allowOpenQuestions: 1, allowHighSeverityContradictions: 0 }
    : { minEvidence: 3, minIndependentSourceUnits: 2, requireExactSpanForFindings: true, requireFalsification: true, allowOpenQuestions: 0, allowHighSeverityContradictions: 0 };
}
export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) => (item.kind === "finding" || item.kind === "claim") && Boolean(item.passage && item.passage.trim())).length;
  // IntelligenceContext has already resolved source independence through the\n  // source-lineage graph. Do not collapse that evidence back to hostnames here:\n  // multiple independent source units can legitimately share a hostname, while\n  // different hostnames can still belong to one syndicated source lineage.\n  const independentSourceUnits = context.independentSourceUnits;
  const falsificationSatisfied = !context.falsification.required || context.falsification.priority < 0.35;
  return evaluateTerminalGate({ evidenceCount: context.evidenceCount, independentSourceUnits, exactSpanBindings, openQuestions: context.openQuestions.length, highSeverityContradictions: context.contradictions.length, falsificationSatisfied }, defaultTerminalContract(mode));
}
