import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, describeAgentActionParseFailure, validateDiscoverySearchQuery } from "./agentic-web-research-core";
import { buildInvestigatorContext } from "./investigation-context-compaction";

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
    expect(validateDiscoverySearchQuery("famous casino owners interview", [])).toEqual({ allowed: false, reason: expect.any(String) });
    expect(validateDiscoverySearchQuery("Acme Holdings CEO official", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Companies House director Kenya", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("casino owners site:example.com", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("2026 acquisition of AI startup by large corporation CEO statement", [])).toEqual({
      allowed: false,
      reason: expect.stringContaining("concrete anchor"),
    });
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

  it("reserves the latest trajectory exactly once during context compaction", () => {
    const latest = {
      turn: 2,
      model: "openai/gpt-oss-20b",
      action: "visit",
      execution: "success" as const,
      args: { url: "https://example.com/anchor" },
      observation: "LATEST_OBSERVATION_SENTINEL",
      observedUrls: ["https://example.com/anchor"],
      findings: [],
    };
    const context = buildInvestigatorContext({
      targetName: "",
      objective: "Preserve the latest observation while compacting older state.",
      trajectoryRecords: [
        {
          turn: 1,
          model: "openai/gpt-oss-20b",
          action: "web_search",
          execution: "success",
          args: { query: "older context" },
          observation: "O".repeat(2500),
          observedUrls: ["https://example.com/old"],
          findings: [],
        },
        latest,
      ],
      lastObservation: "",
      findings: [],
      mode: "discovery",
      priorContext: "P".repeat(2500),
      maxChars: 3900,
    });

    expect(context.length).toBeLessThanOrEqual(3900);
    expect(context).toContain("LATEST_OBSERVATION_SENTINEL");
    expect(context.match(/LATEST TRAJECTORY RECORD/g)?.length).toBe(1);
    expect(context.match(/https:\/\/example\.com\/anchor/g)?.length).toBe(1);
  });


  it("classifies malformed Investigator responses without persisting response text", () => {
    expect(describeAgentActionParseFailure("")).toBe("empty_response");
    expect(describeAgentActionParseFailure("not json")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure("{")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure('{"foo":"bar"}')).toBe("missing_action");
    expect(describeAgentActionParseFailure('{"action":"invented"}')).toBe("unsupported_action action=invented");
    expect(describeAgentActionParseFailure('{"action":"visit"}')).toBe("invalid_action_arguments action=visit invalid=url");
    expect(describeAgentActionParseFailure('{"action":"web_search","query":"anchor","provider":"serper"} trailing text {"noise":true}')).toBe("invalid_action_arguments action=web_search");
    expect(describeAgentActionParseFailure('{"action":"parallel_web_search","searches":[{"query":"anchor","provider":"serper"}]}')).toBe("invalid_action_arguments action=parallel_web_search searches_min=2");
  });

});
