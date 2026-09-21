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

  it("does not treat multiple attributable emails as contradictory and refreshes evidence timestamps", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "multi-contact", target: "Example Target", objective: "find public contacts" });
    engine.recordAction({ turn: 1, action: "web_search", execution: "success", urls: ["https://example.com/a"], findings: [{ vectorType: "email", value: "one@example.com", personName: "Example Target", sourceUrls: ["https://example.com/a"] }] });
    engine.recordAction({ turn: 2, action: "web_search", execution: "success", urls: ["https://example.org/b"], findings: [{ vectorType: "email", value: "two@example.com", personName: "Example Target", sourceUrls: ["https://example.org/b"] }] });
    const state = engine.buildContext();
    expect(state.contradictions).toHaveLength(0);
    expect(state.facts.some((fact) => fact.claim.includes("email one@example.com"))).toBe(true);
    expect(state.recentActions[0]?.informationGain).toBeGreaterThan(0.5);
  });


  it("rejects findings attached to failed actions", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "failed-finding", target: "Example Target", objective: "preserve failure truth" });
    engine.recordAction({ turn: 1, action: "visit", execution: "http_error", urls: ["https://example.com/contact"], observation: "HTTP 500", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://example.com/contact"] }] });
    const state = engine.buildContext();
    expect(state.contacts).toHaveLength(0);
    expect(state.facts).toHaveLength(0);
    expect(state.negativeFindings).toContain("visit produced no usable evidence (http_error)");
    expect(state.recentActions[0]?.useful).toBe(false);
  });


  it("does not downgrade verified or stale contacts after later corroboration", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "contact-state", target: "Example Target", objective: "preserve contact state" });
    engine.recordAction({ turn: 1, action: "visit", execution: "success", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://one.example/contact"] }] });
    engine.recordFeedback({ outcome: "successful_outreach", value: "person@example.com" });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://two.example/contact"] }] });
    expect(engine.buildContext().contacts[0]?.state).toBe("VERIFIED");
    engine.recordFeedback({ outcome: "bounced", value: "person@example.com" });
    engine.recordAction({ turn: 3, action: "visit", execution: "success", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://three.example/contact"] }] });
    expect(engine.buildContext().contacts[0]?.state).toBe("STALE");
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
