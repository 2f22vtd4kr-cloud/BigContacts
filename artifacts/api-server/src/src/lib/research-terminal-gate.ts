import { evaluateTerminalGate, type EvidenceSufficiencyContract, type TerminalGateResult } from "./research-epistemic-vnext";
import type { IntelligenceContext } from "./research-intelligence-engine";
export type TerminalContractMode = "target" | "discovery";
export function defaultTerminalContract(mode: TerminalContractMode): EvidenceSufficiencyContract {
  return mode === "discovery"
    ? { minEvidence: 2, minIndependentSourceUnits: 2, minDirectSourceActions: 1, requireExactSpanForFindings: false, requireFalsification: true, allowOpenQuestions: 1, allowHighSeverityContradictions: 0 }
    : { minEvidence: 3, minIndependentSourceUnits: 2, minDirectSourceActions: 1, requireExactSpanForFindings: true, requireFalsification: true, allowOpenQuestions: 0, allowHighSeverityContradictions: 0 };
}
export function evaluateResearchTerminal(context: IntelligenceContext, mode: TerminalContractMode): TerminalGateResult {
  const exactSpanBindings = context.atomicEvidence.filter((item) => (item.kind === "finding" || item.kind === "claim") && Boolean(item.passage && item.passage.trim())).length;
  // IntelligenceContext has already resolved source independence through the source-lineage graph.
  // Preserve that authority rather than collapsing evidence back to raw hostnames.
  const independentSourceUnits = context.independentSourceUnits;\n  const directSourceActions = context.recentActions.filter((action) => action.execution === "success" && ["visit", "browser_fetch", "registry_search", "harvest_domain", "footprint_spiderfoot"].includes(action.action)).length;
  const falsificationSatisfied = !context.falsification.required || context.falsification.priority < 0.35;
  return evaluateTerminalGate({ evidenceCount: context.evidenceCount, independentSourceUnits, directSourceActions, exactSpanBindings, openQuestions: context.openQuestions.length, highSeverityContradictions: context.contradictions.length, falsificationSatisfied }, defaultTerminalContract(mode));
}
