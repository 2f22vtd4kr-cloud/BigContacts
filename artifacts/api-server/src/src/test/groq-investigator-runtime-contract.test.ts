import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, compactEmergencyInvestigatorObjective, compactEmergencyTrajectoryObservation, describeAgentActionParseFailure, groqQuotaAccountIdentity, MAX_CONSECUTIVE_ACTION_PARSE_FAILURES, nextConsecutiveActionParseFailureCount, runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { getAvailableBrowserFetchProviders } from "../lib/browser-fetch-core";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "../lib/research-cognitive-routing";
import { getAvailableInvestigatorCapabilities, investigatorCapabilityKeyName } from "../lib/investigator-capability-registry";
import { resolveResearchDepth } from "../lib/research-depth";
import { buildBoundedInvestigatorObjective } from "../lib/investigation-context-compaction";

describe("Groq Investigator runtime contract", () => {
  it("preserves the active Boss question when emergency compaction receives a bounded objective", () => {
    const direction = "Perform registry queries on Zefix/Swiss commercial register for family-owned mid-market firms in the target sectors to extract named owners with publicly documented wealth indicators.";
    const boundedObjective = buildBoundedInvestigatorObjective({
      base: "Discover under-the-radar people with credible wealth potential and realistic public contact routes. People—not companies or executive prestige—are the target. Prefer private, mid-market, regional and family businesses.",
      direction,
      maxChars: 1_800,
    });

    const compacted = compactEmergencyInvestigatorObjective(boundedObjective);
    expect(compacted).toContain("CASE OBJECTIVE: Discover under-the-radar people");
    expect(compacted).toContain("ACTIVE BOSS-DIRECTED QUESTION (scope constraint, not a tool sequence):");
    expect(compacted).toContain(direction);
    expect(compacted).not.toContain("PRIMARY CASE OBJECTIVE:");
    expect(compacted).not.toContain("Pursue this question unless observed evidence");
  });

  it("preserves the actionable reason when a pivot guard observation is compacted", () => {
    const compacted = compactEmergencyTrajectoryObservation(
      "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Perform registry queries on Zefix/Swiss commercial register. The action's actual query/resource is outside that scope. No outbound request was made.",
    );
    expect(compacted).toContain("BLOCKED BY SCOPE GUARD (no provider request)");
    expect(compacted).toContain("active Boss-approved question");
    expect(compacted).toContain("do not repeat this off-scope action");
    expect(compacted).not.toContain("AUXILIARY CONTEXT BOUND");
  });

  it("preserves legacy raw pivot and opening-control directions in emergency compaction", () => {
    const legacyPivot = compactEmergencyInvestigatorObjective(
      "Find realistic public routes for under-the-radar owners.\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT: Verify named Swiss mid-market manufacturer owners through official sources.",
    );
    expect(legacyPivot).toContain("CASE OBJECTIVE: Find realistic public routes");
    expect(legacyPivot).toContain("Verify named Swiss mid-market manufacturer owners through official sources.");

    const opening = compactEmergencyInvestigatorObjective(
      'Find credible private-business owners.\n\nBOSS OPENING CONTROL DIRECTION\nNext directions: ["Search Swiss registry entries for named owners"]',
    );
    expect(opening).toContain("Search Swiss registry entries for named owners");
  });

  it("shares quota identity across environment slots carrying the same credential", () => {
    const sharedCredential = "test-groq-api-key-that-is-not-real";
    const identity = groqQuotaAccountIdentity(sharedCredential);
    expect(identity).toBe(groqQuotaAccountIdentity(`  ${sharedCredential}  `));
    expect(groqQuotaAccountIdentity("a-different-test-groq-key")).not.toBe(identity);
    expect(identity).not.toContain(sharedCredential);
    expect(identity).toMatch(/^groq-credential:[a-f0-9]{16}$/);
  });
  it("enforces concrete, non-duplicate discovery search quality before provider calls", async () => {
    const { validateDiscoverySearchQuery } = await import("../lib/agentic-web-research-core");
    expect(validateDiscoverySearchQuery("billionaires richest people Forbes", [])).toMatchObject({ allowed: false });
    const untargetableIdentity = validateDiscoverySearchQuery("Elon Musk", []);
    expect(untargetableIdentity.allowed).toBe(false);
    expect(untargetableIdentity.allowed ? "" : untargetableIdentity.reason).toMatch(/globally prominent person/i);
    expect(validateDiscoverySearchQuery("Coca-Cola Slovenia independent bottler owner contact", []).allowed).toBe(true);
    expect(validateDiscoverySearchQuery("Slovenia casino", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Brazil mining", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("famous casino owners", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("Slovenia casino", ["Slovenia casino"])).toMatchObject({ allowed: true, warning: expect.stringContaining("attempted before") });
    expect(validateDiscoverySearchQuery("Slovenia casino owners", ["Slovenia casino"])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Example Corp founder", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("family office sustainability startup founder site:cnbc.com", [])).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("broad press-publisher-only search"),
    });
    expect(validateDiscoverySearchQuery("family office sustainability startup founder site:markets.businessinsider.com", [])).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("broad press-publisher-only search"),
    });
    expect(validateDiscoverySearchQuery('site:investing.cnbc.com "SolarEdge" founder acquisition', [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery('site:ft.com "Žiga Debeljak" owner', [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("family offices site:cnbc.com.attacker.example", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery('site:cnbc.com "SolarEdge" founder acquisition', [])).toEqual({ allowed: true });
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

    expect(submitted).toContain("ALL REQUIRED TOP-LEVEL FIELDS");
    expect(submitted).toContain("DISCOVERY ADMISSION CONTRACT");
    expect(submitted).toContain("RESEARCH TERMINAL GATE (authoritative)");
    expect(submitted).toContain("Falsification requirement:");
    expect(submitted).toContain('"url":null');
    expect(submitted).toContain("Parallel web searches need 2–4 objects, each with query/provider/locale/market/purpose");
    expect(submitted).toContain("Each finding needs vectorType/value/personName/role/scope/sourceUrls/note/promotionDecision/promotionReason");
    expect(submitted).toContain('"searches":[],"findings":[]');
    expect(messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(7_200);
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

  it("preserves medium reasoning and a full action budget for contact research", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-120b",
      prompt: "investigate and attribute a realistic public contact route",
      cognitiveTask: "contact_extraction",
    });
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "medium",
      max_completion_tokens: 1024,
      include_reasoning: false,
    });
  });

  it("does not send an unsupported reasoning field to GPT-OSS fallback models", () => {
    for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
      const body = buildGroqInvestigatorRequestBody({ model, prompt: "x", cognitiveTask: "discovery" });
      expect(body).not.toHaveProperty("reasoning_format");
      expect(body).toHaveProperty("include_reasoning", false);
    }
  });

  it("limits the strict model schema to executable actions while retaining the complete envelope", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "qwen/qwen3.8-27b",
      prompt: "x",
      cognitiveTask: "discovery",
    });
    const schema = (body.response_format as { json_schema?: { schema?: { properties?: Record<string, unknown>; required?: string[] } } }).json_schema?.schema;
    const actionSchema = schema?.properties?.action as { enum?: string[] } | undefined;
    const availableBrowserProviders = getAvailableBrowserFetchProviders();
    const expectedActions = [
      "web_search", "parallel_web_search", "parallel_registry_search", "visit",
      ...(availableBrowserProviders.length ? ["browser_fetch"] : []),
      "registry_search", "domain_lookup", "done",
    ];
    expect(actionSchema?.enum).toEqual(expectedActions);
    for (const unavailable of ["harvest_domain", "footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "footprint_spiderfoot"]) {
      expect(actionSchema?.enum).not.toContain(unavailable);
    }
    expect(schema?.properties).toHaveProperty("target");
    expect(schema?.properties).toHaveProperty("targetType");
    expect(schema?.properties).toHaveProperty("profile");
    expect(schema?.properties).toHaveProperty("locale");
    expect(schema?.properties).toHaveProperty("market");
    expect(schema?.properties?.expectedInformationGain).toEqual({ type: ["number", "null"] });
    expect(schema?.properties?.provider).toMatchObject({
      type: ["string", "null"],
      enum: ["serper", "tavily", "exa", "rdap", "whoisjson", ...availableBrowserProviders, null],
    });
    expect(schema?.required).toEqual(expect.arrayContaining(["action", "target", "targetType", "profile", "locale", "market", "provider"]));
  });

  it("reports unavailable research executors as unsupported instead of advertising stale actions", () => {
    const actions = [
      { action: "footprint_email", email: "person@example.org" },
      { action: "footprint_username_maigret", username: "person" },
      { action: "footprint_username_sherlock", username: "person" },
      { action: "harvest_domain", domain: "example.org" },
      { action: "footprint_spiderfoot", target: "example.org", targetType: "domain", profile: "organization-footprint" },
    ];
    for (const action of actions) {
      expect(describeAgentActionParseFailure(JSON.stringify({
        ...action,
        hypothesis: "An independent check may add evidence",
        purpose: "Test an available source without assuming the result",
        expectedInformationGain: 0.5,
      }))).toBe("unsupported_action action=" + action.action);
    }
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
