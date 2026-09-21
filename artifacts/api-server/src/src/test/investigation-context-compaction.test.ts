import { describe, expect, it } from "vitest";
import { buildInvestigatorContext, compactInvestigationContext, getInvestigatorContextBudget, tightenInvestigatorPrompt } from "../lib/investigation-context-compaction";

describe("investigator context compaction", () => {
  it("bounds working context while retaining old source URLs in the archive index", () => {
    const records = Array.from({ length: 30 }, (_, index) => ({
      turn: index + 1, model: "groq:test", action: index % 2 ? "visit" : "web_search", execution: "success",
      observedUrls: ["https://example.com/source/" + (index + 1)], observation: "A".repeat(4_000),
      findings: [{ vectorType: "website", value: "https://example.com/entity/" + (index + 1), sourceUrls: ["https://example.com/source/" + (index + 1)], personName: index === 29 ? "Named Person" : null, role: null, scope: "candidate", note: "observed" }],
    }));
    const context = buildInvestigatorContext({ targetName: "Named Person", objective: "Find a defensible public contact route.", trajectoryRecords: records, lastObservation: "Latest observation " + "B".repeat(8_000), findings: records[29].findings });
    expect(context.length).toBeLessThanOrEqual(getInvestigatorContextBudget().maxChars);
    expect(context).toContain("TURN 30");
    expect(context).toContain("https://example.com/source/1");
    expect(context).toContain("https://example.com/source/30");
    expect(context).toContain("Named Person");
    expect(context).toContain("ARCHIVED TRAJECTORY INDEX");
  });

  it("keeps the objective and latest observation explicit", () => {
    const context = buildInvestigatorContext({ targetName: "Alice Example", objective: "Resolve whether Alice Example is the same person as the executive in source B.", trajectoryRecords: [{ turn: 1, action: "web_search", execution: "success", observedUrls: ["https://source-a.example/profile"], observation: "Long old observation" }], lastObservation: "Current source says the role changed.", findings: [] });
    expect(context).toContain("OBJECTIVE: Resolve whether Alice Example is the same person as the executive in source B.");
    expect(context).toContain("LATEST OBSERVATION");
    expect(context).toContain("source-a.example/profile");
  });

  it("keeps exact observed URLs in archived history", () => {
    const context = buildInvestigatorContext({ targetName: "Example", objective: "Verify the target.", trajectoryRecords: [
      { turn: 1, action: "visit", execution: "success", observedUrls: ["https://example.com/a#fragment", "https://example.com/b"], observation: "content" },
      { turn: 2, action: "visit", execution: "success", observedUrls: ["https://example.com/c"], observation: "content" },
      { turn: 3, action: "visit", execution: "success", observedUrls: ["https://example.com/d"], observation: "content" },
    ], lastObservation: "latest", findings: [] });
    expect(context).toContain("https://example.com/a#fragment");
    expect(context).toContain("https://example.com/b");
  });

  it("emergency request-size compaction preserves prompt contract boundaries", () => {
    const prompt = "INSTITUTIONAL CONTRACT\nOBJECTIVE: preserve this\n" + "M".repeat(20_000) + "\nLATEST ACTION INSTRUCTIONS: choose one action and return JSON.";
    const reduced = tightenInvestigatorPrompt(prompt, 12_000);
    expect(reduced.length).toBeLessThanOrEqual(12_000);
    expect(reduced).toContain("INSTITUTIONAL CONTRACT");
    expect(reduced).toContain("LATEST ACTION INSTRUCTIONS");
    expect(reduced).toContain("EMERGENCY REQUEST-SIZE COMPACTION");
  });


  it("keeps state, evidence, and trajectory sections visible instead of tail-slicing one combined blob", () => {
    const result = compactInvestigationContext({
      raw: "CURRENT CASE STATE " + "X".repeat(10_000),
      evidenceGraphSummaries: ["EVIDENCE SOURCE https://evidence.example/source"],
      trajectoryRecords: [{ turn: 4, action: "visit", execution: "success", observedUrls: ["https://trajectory.example/page"], observation: "latest structured observation" }],
      trajectory: ["step4: visit https://trajectory.example/page execution=success observed=https://trajectory.example/page"],
      maxChars: 10_000,
    });
    expect(result).toContain("CURRENT STATE");
    expect(result).toContain("EVIDENCE GRAPH SUMMARY");
    expect(result).toContain("TRAJECTORY RECORDS");
    expect(result).toContain("trajectory.example/page");
  });

  it("keeps the compatibility helper bounded", () => {
    const result = compactInvestigationContext({ raw: "X".repeat(30_000), maxChars: 10_000, trajectory: ["Y".repeat(10_000)], evidenceGraphSummaries: ["Z".repeat(10_000)] });
    expect(result.length).toBeLessThanOrEqual(10_000);
  });
});