import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, MAX_CONSECUTIVE_ACTION_PARSE_FAILURES, nextConsecutiveActionParseFailureCount, runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "../lib/research-cognitive-routing";
import { getAvailableInvestigatorCapabilities, investigatorCapabilityKeyName } from "../lib/investigator-capability-registry";
import { resolveResearchDepth } from "../lib/research-depth";

describe("Groq Investigator runtime contract", () => {
  it("enforces concrete, non-duplicate discovery search quality before provider calls", async () => {
    const { validateDiscoverySearchQuery } = await import("../lib/agentic-web-research-core");
    expect(validateDiscoverySearchQuery("billionaires richest people Forbes", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Elon Musk", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Brazil mining", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("famous casino owners", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino", ["Slovenia casino"])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino owners", ["Slovenia casino"])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Example Corp founder", [])).toEqual({ allowed: true });
  });

  it("allows one corrective parse retry, then stops repeated invalid action contracts", () => {
    expect(MAX_CONSECUTIVE_ACTION_PARSE_FAILURES).toBe(2);

    let consecutiveFailures = 0;
    consecutiveFailures = nextConsecutiveActionParseFailureCount(consecutiveFailures, false);
    expect(consecutiveFailures).toBe(1);
    expect(consecutiveFailures < MAX_CONSECUTIVE_ACTION_PARSE_FAILURES).toBe(true);

    consecutiveFailures = nextConsecutiveActionParseFailureCount(consecutiveFailures, false);
    expect(consecutiveFailures).toBe(2);
    expect(consecutiveFailures >= MAX_CONSECUTIVE_ACTION_PARSE_FAILURES).toBe(true);

    // A valid model action naturally restores the retry budget.
    expect(nextConsecutiveActionParseFailureCount(consecutiveFailures, true)).toBe(0);
  });

  it("aligns the prompt with every required property in the strict structured-action schema", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Discover evidence-backed public research leads.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "No research action selected yet.",
      findings: [],
      mode: "discovery",
    });
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt,
      cognitiveTask: "discovery",
    });
    const messages = body.messages as Array<{ content: string }>;
    const submitted = messages.map((message) => message.content).join("\\n");

    expect(submitted).toContain("all top-level schema properties are required");
    expect(submitted).toContain('"url":null');
    expect(submitted).toContain("Each parallel search item must include query, provider, locale, market, purpose");
    expect(submitted).toContain("Each finding must include vectorType, value, personName, role, scope, sourceUrls, note, promotionDecision, promotionReason");
    expect(submitted).toContain('"searches":[],"findings":[]');
    expect(messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(9_000);
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
    expect(schema?.properties?.provider).toMatchObject({
      type: ["string", "null"],
      enum: ["serper", "tavily", "exa", "rdap", "whoisjson", "scrapfly", "zenrows", "browserless", "playwright", null],
    });
    expect(schema?.required).toEqual(expect.arrayContaining(["target", "targetType", "profile", "locale", "market", "provider"]));
  });

  it("does not down-route Investigator work by cognitive-task heuristics", () => {
    const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    expect(rankGroqModelsForTask(models, "discovery")).toEqual(models);
    expect(rankGroqModelsForTask(models, "identity_resolution")).toEqual(models);
    expect(rankGroqModelsForTask(models, "contact_extraction")).toEqual(models);
    expect(rankGroqModelsForTask(models, "contradiction_resolution")).toEqual(models);
    expect(rankGroqModelsForTask(models, "final_adjudication")).toEqual(models);
  });

  it("keeps the canonical Investigator model singular so provider failure cannot silently change cognition", async () => {
    const { GROQ_CHAT_MODELS, GROQ_DEFAULT_MODEL } = await import("../lib/groq-models");
    expect(GROQ_CHAT_MODELS).toEqual([GROQ_DEFAULT_MODEL]);
    expect(GROQ_CHAT_MODELS).toHaveLength(1);
  });

  it("keeps the active Groq Investigator models on the same structured action contract", () => {
    for (const model of ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
      const body = buildGroqInvestigatorRequestBody({ model, prompt: "choose the next research action", cognitiveTask: "identity_resolution" });
      expect(body.model).toBe(model);
      expect(body.response_format).toBeDefined();
      expect(body).not.toHaveProperty("reasoning_format");
    }
  });

  it("exposes Investigator capability availability without embedding a selection strategy", () => {
    expect(getAvailableInvestigatorCapabilities({ GROQ_INVESTIGATOR_API_KEY: "configured", GROQ_INVESTIGATOR_API_KEY_1: "configured-2" })).toEqual(["groq-investigator-1", "groq-investigator-2"]);
    expect(getAvailableInvestigatorCapabilities({})).toEqual([]);
    expect(investigatorCapabilityKeyName("groq-investigator-1")).toBe("GROQ_INVESTIGATOR_API_KEY");
    expect(investigatorCapabilityKeyName("groq-investigator-2")).toBe("GROQ_INVESTIGATOR_API_KEY_1");
  });

  it("uses bounded multi-step Investigator episodes while retaining the absolute 64-turn ceiling", () => {
    const fast = resolveResearchDepth({ explicit: "fast" });
    const standard = resolveResearchDepth({ explicit: "standard" });
    const deep = resolveResearchDepth({ explicit: "deep" });
    expect(fast.agenticMaxIterations).toBeLessThanOrEqual(64);
    expect(standard.agenticMaxIterations).toBeLessThanOrEqual(64);
    expect(deep.agenticMaxIterations).toBeLessThanOrEqual(64);
    expect(fast.investigatorIterationsPerAct).toBeGreaterThan(1);
    expect(standard.investigatorIterationsPerAct).toBeGreaterThan(fast.investigatorIterationsPerAct);
    expect(deep.investigatorIterationsPerAct).toBeGreaterThan(standard.investigatorIterationsPerAct);
  });

  it("honors an explicit zero Investigator iteration budget instead of expanding it to the default ceiling", async () => {
    const result = await runAgenticWebResearch({ targetName: "Example", investigatorLlm: "groq-investigator-1", maxIterations: 0 });
    expect(result.iterations).toBe(0);
    expect(result.stopReason).toBe("ITERATION_BUDGET");
    expect(result.trajectoryRecords).toHaveLength(0);
  });

  it("routes live research state into distinct cognitive modes", () => {
    expect(inferResearchCognitiveTask({ action: "web_search" })).toBe("discovery");
    expect(inferResearchCognitiveTask({ nextMovePriority: "falsify" })).toBe("contradiction_resolution");
    expect(inferResearchCognitiveTask({ nextMovePriority: "contact" })).toBe("contact_extraction");
    expect(inferResearchCognitiveTask({ nextMovePriority: "verify" })).toBe("identity_resolution");
    expect(inferResearchCognitiveTask({ terminal: true })).toBe("final_adjudication");
  });
});
