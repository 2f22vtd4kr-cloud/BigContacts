import { createHash } from "node:crypto";
import { isAggregatorHost } from "./source-corroboration";

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";
export type SourceSpan = { text: string; start: number; end: number; subjectMatched: boolean; valueMatched: boolean; exact: boolean };
export type SourceLineageNode = { sourceId: string; canonicalUrl: string; host: string; originSourceId: string | null; publisher: string | null; citedSourceIds: string[]; contentFingerprint: string | null };
export type EvidenceBinding = { claimId: string; sourceUrl: string; subject: string | null; value: string; span: SourceSpan | null; attributionBound: boolean; sourceLineageId: string };
export type ResearchQuestion = { id: string; question: string; importance: number; uncertainty: number; discriminators: string[]; status: "open" | "answered" | "blocked" };
export type ResearchActionCandidate = { id: string; action: string; questionId: string; expectedInformationGain: number; identityDiscrimination: number; evidenceQuality: number; falsificationValue: number; successProbability: number; estimatedLatencyMs: number; estimatedTokenCost: number; estimatedProviderCost: number; sourceDiversityGain: number };
export type ActionUtility = ResearchActionCandidate & { utility: number };
export type ActionCalibration = { attempts: number; predictedInformationGain: number; realizedInformationGain: number; absoluteError: number; meanAbsoluteError: number };
export type EvidenceSufficiencyContract = { minEvidence: number; minIndependentSourceUnits: number; requireExactSpanForFindings: boolean; requireFalsification: boolean; allowOpenQuestions: number; allowHighSeverityContradictions: number };
export type TerminalGateResult = { allowed: boolean; reasons: string[]; metrics: { evidenceCount: number; independentSourceUnits: number; exactSpanBindings: number; openQuestions: number; highSeverityContradictions: number; falsificationSatisfied: boolean } };
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function canonicalHost(url: string): string | null { try { return new URL(url).hostname.toLowerCase().replace(/^www\\./, ""); } catch { return null; } }

export function bindExactSourceSpan(observation: string, value: string, subject?: string | null, maxChars = 900): SourceSpan | null {
  const text = observation.trim(); const needle = value.trim(); if (!text || !needle) return null;
  const lower = text.toLowerCase(); const valueIndex = lower.indexOf(needle.toLowerCase()); if (valueIndex < 0) return null;
  const subjectNeedle = subject?.trim().toLowerCase() || "";
  const subjectIndex = subjectNeedle ? lower.indexOf(subjectNeedle, Math.max(0, valueIndex - 900)) : -1;
  const starts = [text.lastIndexOf("\\n", valueIndex), text.lastIndexOf(".", valueIndex), text.lastIndexOf("!", valueIndex), text.lastIndexOf("?", valueIndex)];
  const start = Math.max(0, Math.max(...starts) + 1);
  const ends = [text.indexOf("\\n", valueIndex + needle.length), text.indexOf(".", valueIndex + needle.length), text.indexOf("!", valueIndex + needle.length), text.indexOf("?", valueIndex + needle.length)].filter((n) => n >= 0);
  const end = Math.min(text.length, ends.length ? Math.min(...ends) + 1 : valueIndex + needle.length + maxChars);
  const boundedEnd = Math.min(end, start + maxChars); const spanText = text.slice(start, boundedEnd).trim();
  const localSubjectIndex = subjectNeedle ? spanText.toLowerCase().indexOf(subjectNeedle) : -1;
  const exact = spanText.toLowerCase().includes(needle.toLowerCase());
  return { text: spanText, start, end: boundedEnd, subjectMatched: subjectIndex >= 0 || localSubjectIndex >= 0, valueMatched: exact, exact: exact && (!subjectNeedle || subjectIndex >= 0 || localSubjectIndex >= 0) };
}
export function sourceLineageId(url: string, contentFingerprint?: string | null): string { return contentFingerprint ? "content:" + digest(contentFingerprint).slice(0, 24) : "source:" + digest(canonicalHost(url) ?? url).slice(0, 24); }

export class SourceLineageGraph {
  private readonly nodes = new Map<string, SourceLineageNode>();
  register(input: Omit<SourceLineageNode, "sourceId"> & { sourceId?: string }): SourceLineageNode {
    const canonicalUrl = input.canonicalUrl.trim(); const sourceId = input.sourceId ?? sourceLineageId(canonicalUrl, input.contentFingerprint);
    const existing = this.nodes.get(sourceId);
    if (existing) { existing.citedSourceIds = [...new Set([...existing.citedSourceIds, ...input.citedSourceIds])]; existing.originSourceId = existing.originSourceId ?? input.originSourceId; existing.publisher = existing.publisher ?? input.publisher; existing.contentFingerprint = existing.contentFingerprint ?? input.contentFingerprint; return existing; }
    const node: SourceLineageNode = { ...input, sourceId, canonicalUrl }; this.nodes.set(sourceId, node); return node;
  }
  linkDerivative(derivedUrl: string, originUrl: string): void {
    const derived = this.register({ canonicalUrl: derivedUrl, host: canonicalHost(derivedUrl) ?? derivedUrl, originSourceId: sourceLineageId(originUrl), publisher: null, citedSourceIds: [sourceLineageId(originUrl)], contentFingerprint: null });
    this.register({ canonicalUrl: originUrl, host: canonicalHost(originUrl) ?? originUrl, originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: null });
    derived.originSourceId = sourceLineageId(originUrl);
  }
  independentUnitCount(sourceIds: readonly string[]): number {
    const roots = new Set<string>();
    for (const id of sourceIds) { let current = this.nodes.get(id); const seen = new Set<string>(); while (current?.originSourceId && !seen.has(current.sourceId)) { seen.add(current.sourceId); current = this.nodes.get(current.originSourceId); } roots.add(current?.sourceId ?? id); }
    const independentPublishers = new Set<string>();
    for (const rootId of roots) {
      const root = this.nodes.get(rootId);
      if (!root) continue;
      if (isAggregatorHost(root.host)) continue;
      independentPublishers.add(root.publisher?.trim().toLowerCase() || root.host.trim().toLowerCase());
    }
    return independentPublishers.size;
  }
  snapshot(): SourceLineageNode[] { return [...this.nodes.values()].map((node) => ({ ...node, citedSourceIds: [...node.citedSourceIds] })); }
}

export function scoreActionUtility(input: ResearchActionCandidate): number {
  const benefit = clamp(input.expectedInformationGain) * 0.30 + clamp(input.identityDiscrimination) * 0.18 + clamp(input.evidenceQuality) * 0.18 + clamp(input.falsificationValue) * 0.14 + clamp(input.successProbability) * 0.10 + clamp(input.sourceDiversityGain) * 0.10;
  const cost = clamp((Math.max(0, input.estimatedLatencyMs) / 60000) * 0.18 + Math.min(1, Math.max(0, input.estimatedTokenCost) / 20000) * 0.45 + Math.min(1, Math.max(0, input.estimatedProviderCost)) * 0.37);
  return Math.max(0, benefit * (1 - 0.65 * cost));
}
export function rankActionCandidates(candidates: readonly ResearchActionCandidate[]): ActionUtility[] { return candidates.map((candidate) => ({ ...candidate, utility: scoreActionUtility(candidate) })).sort((a, b) => b.utility - a.utility); }
export function updateActionCalibration(previous: ActionCalibration | undefined, predicted: number, realized: number): ActionCalibration {
  const p = clamp(predicted); const r = clamp(realized); const current = previous ?? { attempts: 0, predictedInformationGain: 0, realizedInformationGain: 0, absoluteError: 0, meanAbsoluteError: 0 }; const attempts = current.attempts + 1; const error = Math.abs(p - r);
  return { attempts, predictedInformationGain: current.predictedInformationGain + p, realizedInformationGain: current.realizedInformationGain + r, absoluteError: current.absoluteError + error, meanAbsoluteError: (current.absoluteError + error) / attempts };
}
export function buildResearchQuestion(question: string, importance = 0.7, uncertainty = 0.7, discriminators: readonly string[] = []): ResearchQuestion {
  return { id: "rq_" + digest(question).slice(0, 16), question: question.trim(), importance: clamp(importance), uncertainty: clamp(uncertainty), discriminators: [...new Set(discriminators.map((d) => d.trim()).filter(Boolean))], status: "open" };
}
export function evaluateTerminalGate(context: TerminalGateResult["metrics"], contract: EvidenceSufficiencyContract): TerminalGateResult {
  const reasons: string[] = [];
  if (context.evidenceCount < contract.minEvidence) reasons.push("evidence_count_below_" + contract.minEvidence);
  if (context.independentSourceUnits < contract.minIndependentSourceUnits) reasons.push("independent_source_units_below_" + contract.minIndependentSourceUnits);
  if (contract.requireExactSpanForFindings && context.exactSpanBindings < contract.minEvidence) reasons.push("exact_source_span_binding_incomplete");
  if (context.openQuestions > contract.allowOpenQuestions) reasons.push("high_value_research_questions_remain_open");
  if (context.highSeverityContradictions > contract.allowHighSeverityContradictions) reasons.push("high_severity_contradictions_remain");
  if (contract.requireFalsification && !context.falsificationSatisfied) reasons.push("required_falsification_not_satisfied");
  return { allowed: reasons.length === 0, reasons, metrics: { ...context } };
}
export type ParallelAction = { id: string; dependencies: string[]; action: () => Promise<unknown> };
export function dependencyAwareBatches(actions: readonly ParallelAction[]): ParallelAction[][] {
  const remaining = new Map(actions.map((action) => [action.id, action])); const completed = new Set<string>(); const batches: ParallelAction[][] = [];
  while (remaining.size) { const ready = [...remaining.values()].filter((action) => action.dependencies.every((dependency) => completed.has(dependency))); if (!ready.length) throw new Error("Research action dependency graph contains a cycle or missing dependency."); batches.push(ready); for (const action of ready) { remaining.delete(action.id); completed.add(action.id); } }
  return batches;
}
