import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "../lib/research-intelligence-engine";

describe("Apex research intelligence", () => {
  it("keeps evidence, contradictions, negative findings, contacts, and provenance together", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "audit", target: "Alex Example", objective: "resolve identity and contact" });
    engine.recordAction({ turn: 1, action: "registry_search", execution: "success", urls: ["https://registry.example.gov/a"], observation: "Alex is director of Alpha", findings: [{ vectorType: "is", value: "director of Alpha", personName: "Alex Example", sourceUrls: ["https://registry.example.gov/a"] }] });
    engine.recordAction({ turn: 2, action: "web_search", execution: "success", urls: ["https://news.example.com/b"], observation: "Alex is director of Beta", findings: [{ vectorType: "is", value: "director of Beta", personName: "Alex Example", sourceUrls: ["https://news.example.com/b"] }] });
    engine.recordAction({ turn: 3, action: "visit", execution: "http_error", urls: ["https://example.com/contact"], observation: "HTTP 404", findings: [] });
    const state = engine.buildContext();
    expect(state.evidenceCount).toBeGreaterThan(0);
    expect(state.sourceDiversity).toBeGreaterThanOrEqual(2);
    expect(state.contradictions.length).toBeGreaterThan(0);
    expect(state.negativeFindings.length).toBeGreaterThan(0);
    expect(state.provenanceDigest).toHaveLength(64);
    expect(state.missionBriefs.map((brief) => brief.mission)).toEqual(["identity", "organization", "contact", "disproof"]);
  });
});
