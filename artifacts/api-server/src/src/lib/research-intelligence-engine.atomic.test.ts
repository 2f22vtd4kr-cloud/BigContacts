import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "./research-intelligence-engine";

describe("research intelligence atomic evidence", () => {
  it("does not replay legacy search-derived observations, contacts, or hypothesis support", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "restore-search", target: "Ada Example", objective: "Resolve identity" });
    const baseline = engine.buildContext();
    engine.restoreContext({
      ...baseline,
      executionId: "old",
      facts: [{ claim: "Ada Example email jane@example.com", evidenceIds: ["search-evidence"], sources: ["serper.dev"] }],
      hypotheses: [{ id: "h1", label: "Ada Example is founder", entity: "Ada Example", score: 0.9, supportingEvidenceIds: ["search-evidence"], contradictingEvidenceIds: [], missingDiscriminators: [], status: "alternative" }],
      contacts: [{ personName: "Ada Example", value: "jane@example.com", vector: "email", state: "ATTRIBUTED", sourceUrls: ["https://serper.dev/search"], sourceHosts: ["serper.dev"], firstSeen: "", lastSeen: "", attributionStrength: 0.9 }],
      evidenceCount: 1,
      sourceQualitySummary: [{ sourceClass: "SEARCH_RESULT", count: 1 }],
      atomicEvidence: [{ evidenceId: "search-evidence", kind: "observation", claim: "Observed source https://serper.dev/search", sourceUrl: "https://serper.dev/search", sourceHost: "serper.dev", sourceClass: "SEARCH_RESULT", passage: "Ada Example — founder — jane@example.com", attribution: null }],
    });
    const context = engine.buildContext();
    expect(context.atomicEvidence).toHaveLength(0);
    expect(context.facts).toHaveLength(0);
    expect(context.hypotheses).toHaveLength(0);
    expect(context.contacts).toHaveLength(0);
  });

  it("rejects model findings attached directly to search actions", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "search-finding", target: "Ada Example", objective: "Resolve identity" });
    engine.recordAction({
      turn: 1,
      action: "web_search",
      args: { provider: "serper", query: "Ada Example founder" },
      execution: "success",
      observation: "Ada Example — founder — jane@example.com",
      urls: ["https://example.com/search"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Ada Example", sourceUrls: ["https://example.com/search"] }],
    });
    const context = engine.buildContext();
    expect(context.evidenceCount).toBe(0);
    expect(context.facts).toHaveLength(0);
  });

  it("does not admit positive findings from a failed source visit", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "failed-visit", target: "Ada Example", objective: "Resolve identity" });
    engine.recordAction({
      turn: 1,
      action: "visit",
      args: { url: "https://example.com/profile" },
      execution: "failed",
      observation: "Ada Example email jane@example.com",
      urls: ["https://example.com/profile"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Ada Example", sourceUrls: ["https://example.com/profile"] }],
    });
    const context = engine.buildContext();
    expect(context.contacts).toHaveLength(0);
    expect(context.atomicEvidence.filter((item) => item.kind === "finding")).toHaveLength(0);
  });

  it("keeps pure search-result observations out of atomic evidence context", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "search-only", target: "Ada Example", objective: "Resolve identity" });
    engine.recordAction({
      turn: 1,
      action: "web_search",
      args: { provider: "serper", query: "Ada Example" },
      execution: "success",
      observation: "Ada Example — founder — possible result snippet",
      urls: ["https://example.com/search-result"],
      findings: [],
    });
    const context = engine.buildContext();
    expect(context.atomicEvidence).toHaveLength(0);
  });


  it("binds observed source passages to claim-level evidence and exposes provider disagreement", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "test", target: "Ada Example", objective: "Resolve identity" });
    engine.recordAction({
      turn: 1,
      action: "visit",
      args: { provider: "serper", query: "Ada Example founder" },
      execution: "success",
      observation: "Ada Example founded Example Labs.",
      urls: ["https://one.example/source"],
      findings: [{ vectorType: "website", value: "https://example.com", personName: "Ada Example", sourceUrls: ["https://one.example/source"], note: "Ada Example founded Example Labs." }],
    });
    engine.recordAction({
      turn: 2,
      action: "web_search",
      args: { provider: "tavily", query: "Ada Example founder" },
      execution: "success",
      observation: "A different organization appears in the result set.",
      urls: ["https://two.example/other"],
    });
    engine.recordAction({
      turn: 3,
      action: "web_search",
      args: { provider: "serper", query: "Ada Example founder" },
      execution: "success",
      observation: "Another result family appears.",
      urls: ["https://three.example/other"],
    });
    const context = engine.buildContext();
    expect(context.atomicEvidence.length).toBeGreaterThan(0);
    expect(context.atomicEvidence[0]?.sourceUrl).toContain("example");
    expect(context.providerDisagreements.length).toBe(1);
    expect(context.actionYield.length).toBeGreaterThan(0);
  });
  it("does not raise hypothesis confidence for a copied passage at a second URL", () => {
    const engine = new ResearchIntelligenceEngine({
      executionId: "copied-passage-confidence",
      target: "Alice Example",
      objective: "Resolve a founder identity hypothesis",
    });
    const hypothesis = "Alice Example is founder of Example Labs";
    const recordVisit = (turn: number, url: string) => engine.recordAction({
      turn,
      action: "visit",
      args: { hypothesis, purpose: "test founder attribution" },
      execution: "success",
      observation: hypothesis,
      urls: [url],
      findings: [{
        vectorType: "is",
        value: "founder of Example Labs",
        personName: "Alice Example",
        sourceUrls: [url],
      }],
    });

    recordVisit(1, "https://publisher-one.example/alice");
    const first = engine.buildContext();
    const firstHypothesis = first.hypotheses.find((item) => item.label === hypothesis);
    expect(firstHypothesis).toBeDefined();
    expect(first.independentSourceUnits).toBe(1);

    recordVisit(2, "https://publisher-two.example/alice-copy");
    const second = engine.buildContext();
    const secondHypothesis = second.hypotheses.find((item) => item.label === hypothesis);
    expect(second.independentSourceUnits).toBe(1);
    expect(secondHypothesis?.score).toBeCloseTo(firstHypothesis!.score, 8);
  });

});
