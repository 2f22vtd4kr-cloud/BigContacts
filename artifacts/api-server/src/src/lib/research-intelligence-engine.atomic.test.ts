import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "./research-intelligence-engine";

describe("research intelligence atomic evidence", () => {
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
