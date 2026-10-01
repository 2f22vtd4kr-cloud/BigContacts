import { describe, expect, it } from "vitest";
import {
  bindExactSourceSpan,
  dependencyAwareBatches,
  evaluateTerminalGate,
  rankActionCandidates,
  updateActionCalibration,
} from "../lib/research-epistemic-vnext";

describe("research epistemic vNext", () => {
  it("binds a finding to an exact observed span and subject", () => {
    const span = bindExactSourceSpan(
      "Jane Doe — Director at Example Ltd. Public email: jane@example.org.",
      "jane@example.org",
      "Jane Doe",
    );
    expect(span?.exact).toBe(true);
    expect(span?.subjectMatched).toBe(true);
    expect(span?.valueMatched).toBe(true);
  });

  it("does not manufacture a span when the value is absent", () => {
    expect(bindExactSourceSpan("Jane Doe works at Example Ltd.", "john@example.org", "Jane Doe")).toBeNull();
  });

  it("ranks actions by information value and cost", () => {
    const ranked = rankActionCandidates([
      { id: "cheap", action: "search", questionId: "q1", expectedInformationGain: 0.7, identityDiscrimination: 0.7, evidenceQuality: 0.7, falsificationValue: 0.4, successProbability: 0.8, estimatedLatencyMs: 1000, estimatedTokenCost: 500, estimatedProviderCost: 0, sourceDiversityGain: 0.8 },
      { id: "expensive", action: "search", questionId: "q1", expectedInformationGain: 0.8, identityDiscrimination: 0.8, evidenceQuality: 0.8, falsificationValue: 0.6, successProbability: 0.8, estimatedLatencyMs: 60000, estimatedTokenCost: 20000, estimatedProviderCost: 1, sourceDiversityGain: 0.8 },
    ]);
    expect(ranked[0]?.id).toBe("cheap");
  });

  it("calibrates predicted versus realized information gain", () => {
    const state = updateActionCalibration(undefined, 0.9, 0.4);
    expect(state.attempts).toBe(1);
    expect(state.meanAbsoluteError).toBeCloseTo(0.5);
  });

  it("batches independent actions and respects dependencies", () => {
    const batches = dependencyAwareBatches([
      { id: "a", dependencies: [], action: async () => 1 },
      { id: "b", dependencies: [], action: async () => 2 },
      { id: "c", dependencies: ["a"], action: async () => 3 },
    ]);
    expect(batches.map((batch) => batch.map((item) => item.id))).toEqual([["a", "b"], ["c"]]);
  });

  it("rejects terminal completion when evidence requirements are not met", () => {
    const result = evaluateTerminalGate(
      { evidenceCount: 2, independentSourceUnits: 1, exactSpanBindings: 1, openQuestions: 1, highSeverityContradictions: 0, falsificationSatisfied: false },
      { minEvidence: 3, minIndependentSourceUnits: 2, requireExactSpanForFindings: true, requireFalsification: true, allowOpenQuestions: 0, allowHighSeverityContradictions: 0 },
    );
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("independent_source_units_below_2");
  });
});
