import { describe, expect, it } from "vitest";
import {
  bindExactSourceSpan,
  canonicalHost,
  SourceLineageGraph,
  dependencyAwareBatches,
  evaluateTerminalGate,
  rankActionCandidates,
  updateActionCalibration,
} from "../lib/research-epistemic-vnext";

describe("research epistemic vNext", () => {
  it("canonicalizes www hosts without retaining the www prefix", () => {
    expect(canonicalHost("https://www.example.com/profile")).toBe("example.com");
  });

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

  it("rejects values and identities that only match a longer token", () => {
    expect(bindExactSourceSpan("Jane Example — jane@example.com.extra", "jane@example.com", "Jane Example")).toBeNull();
    expect(bindExactSourceSpan("Janet Example — Director", "Jane", "Jane")).toBeNull();
    expect(bindExactSourceSpan("Jane Example — https://example.com/profile", "https://example.com", "Jane Example")).toBeNull();
    expect(bindExactSourceSpan("Jane Example — jane@example.com.", "jane@example.com", "Jane Example")?.exact).toBe(true);
  });

  it("does not manufacture a span when the value is absent", () => {
    expect(bindExactSourceSpan("Jane Doe works at Example Ltd.", "john@example.org", "Jane Doe")).toBeNull();
  });

  it("stores the subject and value together in a claim-grade span", () => {
    const span = bindExactSourceSpan(
      "Jane Doe — Director at Example Ltd. Public email: jane@example.org.",
      "jane@example.org",
      "Jane Doe",
    );
    expect(span?.exact).toBe(true);
    expect(span?.text).toContain("Jane Doe");
    expect(span?.text).toContain("jane@example.org");
  });

  it("does not bind a value to an identity mentioned far away in the same observation", () => {
    const distantIdentity = "Jane Doe is listed as a director. " + "unrelated context ".repeat(80) + "Contact: jane@example.org.";
    const span = bindExactSourceSpan(distantIdentity, "jane@example.org", "Jane Doe");
    expect(span?.valueMatched).toBe(true);
    expect(span?.subjectMatched).toBe(false);
    expect(span?.exact).toBe(false);
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

  it("does not count subdomains of one publisher as independent sources", () => {
    const graph = new SourceLineageGraph();
    const root = graph.register({
      canonicalUrl: "https://example.com/about",
      host: "example.com",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "root-page",
    });
    const subdomain = graph.register({
      canonicalUrl: "https://news.example.com/story",
      host: "news.example.com",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "subdomain-page",
    });
    const independent = graph.register({
      canonicalUrl: "https://another-publisher.org/story",
      host: "another-publisher.org",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "independent-page",
    });
    expect(graph.independentUnitCount([root.sourceId, subdomain.sourceId])).toBe(1);
    expect(graph.independentUnitCount([root.sourceId, subdomain.sourceId, independent.sourceId])).toBe(2);
  });

  it("does not count known aggregator hosts as independent terminal sources", () => {
    const graph = new SourceLineageGraph();
    const aggregator = graph.register({ canonicalUrl: "https://crunchbase.com/profile/example", host: "crunchbase.com", originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: "aggregator" });
    const primary = graph.register({ canonicalUrl: "https://company.example/team/jane", host: "company.example", originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: "primary" });
    expect(graph.independentUnitCount([aggregator.sourceId, primary.sourceId])).toBe(1);
  });

  it("keeps an observed primary source when identical content was first registered from an aggregator", () => {
    const aggregator = {
      canonicalUrl: "https://crunchbase.com/profile/example",
      host: "crunchbase.com",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "identical-observed-passage",
    };
    const primary = {
      canonicalUrl: "https://registry.gov/profile/example",
      host: "registry.gov",
      originSourceId: null,
      publisher: null,
      citedSourceIds: [],
      contentFingerprint: "identical-observed-passage",
    };

    for (const orderedSources of [[aggregator, primary], [primary, aggregator]]) {
      const graph = new SourceLineageGraph();
      const nodes = orderedSources.map((source) => graph.register(source));
      expect(graph.independentUnitCount(nodes.map((node) => node.sourceId))).toBe(1);
      expect(graph.snapshot()).toEqual([
        expect.objectContaining({
          canonicalUrl: primary.canonicalUrl,
          host: primary.host,
        }),
      ]);
    }
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
