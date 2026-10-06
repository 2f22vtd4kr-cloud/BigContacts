import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "./research-intelligence-engine";

describe("research intelligence atomic evidence", () => {\n  it("rejects model findings attached directly to search actions", () => {
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
      action: "web_search",
      args: { provider: "serper", query: "Ada Example company" },
      execution: "success",
      observation: "Ada Example founded Example Labs.",
      urls: ["https://one.example/source"],
      findings: [{ vectorType: "website", value: "https://example.com", personName: "Ada Example", sourceUrls: ["https://one.example/source"], note: "Ada Example founded Example Labs." }],
    });
    engine.recordAction({
      turn: 2,
      action: "web_search",
      args: { provider: "tavily", query: "Ada Example company" },
      execution: "success",
      observation: "A different organization appears in the result set.",
      urls: ["https://two.example/other"],
    });
    const context = engine.buildContext();
    expect(context.atomicEvidence.length).toBeGreaterThan(0);
    expect(context.atomicEvidence[0]?.sourceUrl).toContain("example");
    expect(context.providerDisagreements.length).toBe(1);
    expect(context.actionYield.length).toBeGreaterThan(0);
  });
});
