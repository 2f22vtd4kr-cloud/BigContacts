import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, validateDiscoverySearchQuery } from "./agentic-web-research-core";

describe("Investigator prompt architecture", () => {
  it("keeps the composed model prompt materially below the old 12k-character live request", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Establish a concrete business anchor before identifying a person.",
      history: [],
      trajectoryRecords: Array.from({ length: 24 }, (_, index) => ({
        turn: index + 1,
        model: "openai/gpt-oss-20b",
        action: "parallel_web_search",
        execution: "success",
        args: { query: "generic research " + index },
        observation: "O".repeat(2_000),
        observedUrls: ["https://example" + index + ".com/source"],
        findings: [],
      })),
      lastObservation: "L".repeat(4_000),
      findings: Array.from({ length: 20 }, (_, index) => ({
        vectorType: "other",
        value: "finding-" + index,
        personName: null,
        role: null,
        scope: "unknown",
        sourceUrls: ["https://source" + index + ".example/page"],
        note: "N".repeat(500),
      })),
      priorContext: "P".repeat(4_000),
      intelligenceContext: "I".repeat(8_000),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(8_500);
    expect(prompt).toContain("LATEST TRAJECTORY RECORD");
    expect(prompt).toContain("TURN 24");
    expect(prompt).not.toContain('"action":{"type":"string","enum"');
    expect(prompt).not.toContain("APEX MISSION CONTRACT v");
  });

  it("blocks generic discovery searches until the model supplies a concrete anchor", () => {
    expect(validateDiscoverySearchQuery("2023 venture capital investment biotech company CEO", [])).toEqual({
      allowed: false,
      reason: expect.stringContaining("concrete anchor"),
    });
    expect(validateDiscoverySearchQuery("famous casino owners interview", [])).toEqual({
      allowed: false,
      reason: expect.stringContaining("concrete anchor"),
    });
    expect(validateDiscoverySearchQuery("Acme Holdings CEO official", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Companies House director Kenya", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("casino owners site:example.com", [])).toEqual({ allowed: true });
  });

  it("keeps the structured response contract at the provider boundary", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt: "choose the next research action",
      cognitiveTask: "identity_resolution",
    });
    expect(body.response_format).toBeTruthy();
    expect(body.messages).toHaveLength(2);
    expect((body.messages as Array<{ role: string; content: string }>)[0]?.role).toBe("system");
  });
});
