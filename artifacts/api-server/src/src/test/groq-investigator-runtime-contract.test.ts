import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody } from "../lib/agentic-web-research-core";
import { inferResearchCognitiveTask } from "../lib/research-cognitive-routing";

describe("Groq Investigator runtime contract", () => {
  it("uses the GPT-OSS-compatible reasoning contract", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-120b",
      prompt: "choose the next research action",
      cognitiveTask: "identity_resolution",
    });
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "medium",
      include_reasoning: false,
    });
    expect(body).not.toHaveProperty("reasoning_format");
  });

  it("does not send an unsupported reasoning field to GPT-OSS fallback models", () => {
    for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
      const body = buildGroqInvestigatorRequestBody({ model, prompt: "x", cognitiveTask: "discovery" });
      expect(body).not.toHaveProperty("reasoning_format");
      expect(body).toHaveProperty("include_reasoning", false);
    }
  });

  it("keeps every strict action capability representable, including SpiderFoot and locale routing", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "qwen/qwen3.8-27b",
      prompt: "x",
      cognitiveTask: "discovery",
    });
    const schema = (body.response_format as { json_schema?: { schema?: { properties?: Record<string, unknown>; required?: string[] } } }).json_schema?.schema;
    expect(schema?.properties).toHaveProperty("target");
    expect(schema?.properties).toHaveProperty("targetType");
    expect(schema?.properties).toHaveProperty("profile");
    expect(schema?.properties).toHaveProperty("locale");
    expect(schema?.properties).toHaveProperty("market");
    expect(schema?.required).toEqual(expect.arrayContaining(["target", "targetType", "profile", "locale", "market"]));
  });

  it("routes live research state into distinct cognitive modes", () => {
    expect(inferResearchCognitiveTask({ action: "web_search" })).toBe("discovery");
    expect(inferResearchCognitiveTask({ nextMovePriority: "falsify" })).toBe("contradiction_resolution");
    expect(inferResearchCognitiveTask({ nextMovePriority: "contact" })).toBe("contact_extraction");
    expect(inferResearchCognitiveTask({ nextMovePriority: "verify" })).toBe("identity_resolution");
    expect(inferResearchCognitiveTask({ terminal: true })).toBe("final_adjudication");
  });
});
