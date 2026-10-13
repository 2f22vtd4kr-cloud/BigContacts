import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine, renderIntelligenceContext } from "./research-intelligence-engine";
describe("ResearchIntelligenceEngine", () => {
  it("deduplicates evidence, tracks source diversity, and preserves a hash-chain digest", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "exec-1", target: "Jane Example", objective: "Find an attributable public contact route" });
    engine.recordAction({ turn: 1, action: "web_search", execution: "success", urls: ["https://example.gov/people/jane"], observation: "Jane Example director", findings: [{ vectorType: "email", value: "jane@example.org", personName: "Jane Example", sourceUrls: ["https://example.gov/people/jane"], note: "official directory" }] });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://example.gov/people/jane"], observation: "Jane Example director email jane@example.org", findings: [{ vectorType: "email", value: "jane@example.org", personName: "Jane Example", sourceUrls: ["https://example.gov/people/jane"] }] });
    const state = engine.buildContext();
    expect(state.evidenceCount).toBeGreaterThan(0); expect(state.sourceDiversity).toBe(1); expect(state.provenanceDigest).toHaveLength(64); expect(state.contacts[0]?.state).toBe("ATTRIBUTED");
  });
  it("surfaces contradictions instead of collapsing them into one fact", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "exec-2", target: "Alex Example", objective: "Resolve identity" });
    engine.recordAction({ turn: 1, action: "visit", execution: "success", urls: ["https://registry.example.gov/a"], observation: "Alex Example is director of Alpha", findings: [{ vectorType: "is", value: "director of Alpha", personName: "Alex Example", sourceUrls: ["https://registry.example.gov/a"] }] });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://news.example.com/b"], observation: "Alex Example is director of Beta", findings: [{ vectorType: "is", value: "director of Beta", personName: "Alex Example", sourceUrls: ["https://news.example.com/b"] }] });
    const state = engine.buildContext(); expect(state.contradictions.length).toBeGreaterThan(0); expect(state.openQuestions.some((question) => question.startsWith("Resolve contradiction:"))).toBe(true);
  });
  it("records negative findings and feedback without fabricating success", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "exec-3", target: "No Contact", objective: "Find a public contact" });
    engine.recordAction({ turn: 1, action: "visit", execution: "http_error", urls: ["https://example.com/contact"], observation: "HTTP 404", findings: [] }); engine.recordFeedback({ outcome: "bounced", value: "old@example.com" });
    const state = engine.buildContext(); expect(state.negativeFindings.length).toBeGreaterThan(0); expect(state.stoppingAssessment.recommendation).toBe("continue");
  });
  it("bounds rendered intelligence state before it can become provider prompt input", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "exec-bound", target: "Bounded Target", objective: "Find public evidence" });
    for (let turn = 1; turn <= 80; turn++) {
      engine.recordAction({ turn, action: "visit", execution: "success", urls: ["https://source" + turn + ".example/page"], observation: "O".repeat(1800), findings: [{ vectorType: "website", value: "https://source" + turn + ".example/page", sourceUrls: ["https://source" + turn + ".example/page"], note: "F".repeat(700) }] });
    }
    const rendered = renderIntelligenceContext(engine.buildContext(), 6_000);
    expect(rendered.length).toBeLessThanOrEqual(6_000);
    expect(rendered).toContain("RESEARCH INTELLIGENCE STATE");
    expect(rendered).toContain("omitted middle detail remains durable");
  });
  it("does not convert a completed action purpose into a permanent terminal question", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "purpose-is-not-a-gap", target: "Jane Example", objective: "Verify the person's role" });
    engine.recordAction({
      turn: 1,
      action: "visit",
      args: { hypothesis: "Jane Example is CFO", purpose: "verify Jane's current CFO role" },
      execution: "success",
      urls: ["https://company.example/team"],
      observation: "Jane Example — Chief Financial Officer",
      findings: [],
    });

    const state = engine.buildContext();
    const hypothesis = state.hypotheses.find((item) => item.label === "Jane Example is CFO");
    expect(hypothesis?.missingDiscriminators).not.toContain("verify Jane's current CFO role");
    expect(state.openQuestions).not.toContain("verify Jane's current CFO role");
    expect(state.recentActions[0]?.args.purpose).toBe("verify Jane's current CFO role");
  });

  it("cleans the legacy action-purpose blocker when restoring durable context", () => {
    const original = new ResearchIntelligenceEngine({ executionId: "legacy-purpose", target: "Jane Example", objective: "Verify the person's role" });
    original.recordAction({
      turn: 1,
      action: "visit",
      args: { hypothesis: "Jane Example is CFO", purpose: "verify Jane's current CFO role" },
      execution: "success",
      urls: ["https://company.example/team"],
      observation: "Jane Example — Chief Financial Officer",
      findings: [],
    });
    const legacy = original.buildContext();
    const hypothesis = legacy.hypotheses.find((item) => item.label === "Jane Example is CFO");
    expect(hypothesis).toBeDefined();
    hypothesis!.missingDiscriminators = ["verify Jane's current CFO role"];

    const resumed = new ResearchIntelligenceEngine({ executionId: "legacy-purpose-resumed", target: "Jane Example", objective: "Verify the person's role" });
    resumed.restoreContext(legacy);
    const state = resumed.buildContext();
    expect(state.openQuestions).not.toContain("verify Jane's current CFO role");
    expect(state.hypotheses.find((item) => item.label === "Jane Example is CFO")?.missingDiscriminators).not.toContain("verify Jane's current CFO role");
    expect(state.recentActions[0]?.args.purpose).toBe("verify Jane's current CFO role");
  });

});
