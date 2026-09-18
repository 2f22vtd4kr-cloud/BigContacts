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

  it("keeps competing identity hypotheses explicit", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypotheses", target: "Jordan Example", objective: "resolve identity" });
    engine.addHypothesis({ label: "H1", entity: "Jordan Example A", score: 0.9 });
    engine.addHypothesis({ label: "H2", entity: "Jordan Example B", score: 0.1 });
    const state = engine.buildContext();
    expect(state.hypotheses.find((h) => h.label === "H1")?.status).toBe("leading");
    expect(state.hypotheses.find((h) => h.label === "H2")?.status).toBe("rejected");
  });

  it("moves contact evidence through outcome feedback without inventing proof", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "feedback", target: "Example Target", objective: "find a public contact" });
    engine.recordAction({ turn: 1, action: "done", execution: "success", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://example.com/contact"] }] });
    engine.recordFeedback({ outcome: "bounced", value: "person@example.com" });
    expect(engine.buildContext().contacts[0]?.state).toBe("STALE");
    expect(engine.getFeedbackStats().bounced).toBe(1);
  });
});
