import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody } from "../lib/agentic-web-research-core";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "../lib/research-cognitive-routing";
import { validateDiscoverySearchQuery } from "../lib/agentic-web-research-core";
import { sourceBackedFindings } from "../lib/target-contact-agent";
import { sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";

describe("Groq Investigator runtime contract", () => {

  it("rejects generic fame/wealth discovery queries but allows concrete anchors", () => {
    expect(validateDiscoverySearchQuery("billionaires richest people Forbes", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Elon Musk", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("wealthiest people investment firms", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Ljubljana hotel owner", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("private equity founder site:a16z.com", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Slovenia casino", ["Slovenia casino"])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino owners", ["Slovenia casino"])).toEqual({ allowed: true });
  });

  it("does not treat search-result snippets as card-grade source evidence", () => {
    const finding = {
      vectorType: "email" as const,
      value: "alice@example.com",
      scope: "candidate" as const,
      personName: "Alice Example",
      role: "Founder",
      sourceUrls: ["https://example.com/profile"],
      note: "observed",
      promotionDecision: "promote" as const,
    };
    const searchRecord = {
      turn: 1, model: "qwen/qwen3.8-27b", action: "web_search" as const, args: { query: "Alice Example founder email" }, execution: "success" as const,
      observation: "Alice Example — alice@example.com — https://example.com/profile", observedUrls: ["https://example.com/profile"], findings: [finding], providerFallback: [],
    };
    const visitRecord = { ...searchRecord, turn: 2, action: "visit" as const, args: { url: "https://example.com/profile" }, observation: "Alice Example, Founder. Public email: alice@example.com." };
    expect(sourceBackedFindings([finding], [], [searchRecord])).toEqual([]);
    expect(sourceBackedFindings([finding], [], [searchRecord, visitRecord])).toHaveLength(1);
    expect(sourceBackedAgenticFindings([finding], [], [searchRecord])).toEqual([]);
    expect(sourceBackedAgenticFindings([finding], [], [searchRecord, visitRecord])).toHaveLength(1);
  });

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

  it("routes routine Investigator work to the low-cost model and reserves 120B for hard reasoning", () => {
    const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    expect(rankGroqModelsForTask(models, "discovery")[0]).toBe("openai/gpt-oss-20b");
    expect(rankGroqModelsForTask(models, "identity_resolution")[0]).toBe("openai/gpt-oss-20b");
    expect(rankGroqModelsForTask(models, "contact_extraction")[0]).toBe("openai/gpt-oss-20b");
    expect(rankGroqModelsForTask(models, "contradiction_resolution")[0]).toBe("openai/gpt-oss-120b");
    expect(rankGroqModelsForTask(models, "final_adjudication")[0]).toBe("openai/gpt-oss-120b");
  });

  it("uses low reasoning effort for routine discovery and contact turns", () => {
    for (const task of ["discovery", "contact_extraction"] as const) {
      const body = buildGroqInvestigatorRequestBody({ model: "openai/gpt-oss-20b", prompt: "x", cognitiveTask: task });
      expect(body.reasoning_effort).toBe("low");
      expect(body.max_completion_tokens).toBe(task === "discovery" ? 768 : 640);
    }
  });

  it("routes live research state into distinct cognitive modes", () => {
    expect(inferResearchCognitiveTask({ action: "web_search" })).toBe("discovery");
    expect(inferResearchCognitiveTask({ nextMovePriority: "falsify" })).toBe("contradiction_resolution");
    expect(inferResearchCognitiveTask({ nextMovePriority: "contact" })).toBe("contact_extraction");
    expect(inferResearchCognitiveTask({ nextMovePriority: "verify" })).toBe("identity_resolution");
    expect(inferResearchCognitiveTask({ terminal: true })).toBe("final_adjudication");
  });
});