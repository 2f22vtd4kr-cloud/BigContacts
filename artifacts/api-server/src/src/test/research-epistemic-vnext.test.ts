import { describe, expect, it } from "vitest";
import {
  bindExactSourceSpan,
  SourceLineageGraph,
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

  it("does not count multiple pages from one publisher as independent sources", () => {
    const graph = new SourceLineageGraph();
    const first = graph.register({
      canonicalUrl: "https://example.com/team/jane",
      host: "example.com",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "page-one",
    });
    const second = graph.register({
      canonicalUrl: "https://example.com/contact",
      host: "example.com",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "page-two",
    });
    const other = graph.register({
      canonicalUrl: "https://other.example/news/jane",
      host: "other.example",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "page-three",
    });
    expect(graph.independentUnitCount([first.sourceId, second.sourceId])).toBe(1);
    expect(graph.independentUnitCount([first.sourceId, second.sourceId, other.sourceId])).toBe(2);
  });

  it("does not count known aggregator hosts as independent terminal sources", () => {
    const graph = new SourceLineageGraph();
    const aggregator = graph.register({ canonicalUrl: "https://crunchbase.com/profile/example", host: "crunchbase.com", originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: "aggregator" });
    const primary = graph.register({ canonicalUrl: "https://company.example/team/jane", host: "company.example", originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: "primary" });
    expect(graph.independentUnitCount([aggregator.sourceId, primary.sourceId])).toBe(1);
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
