import { describe, expect, it } from "vitest";
import { buildActionParseFailureObservation, buildGroqInvestigatorRequestBody, buildStepPrompt, parseAgentAction, compactEmergencyInvestigatorObjective, compactEmergencyTrajectoryObservation, describeAgentActionParseFailure, groqQuotaAccountIdentity, MAX_CONSECUTIVE_ACTION_PARSE_FAILURES, nextConsecutiveActionParseFailureCount, shouldTerminateActionParseFailure, runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { getAvailableBrowserFetchProviders } from "../lib/browser-fetch-core";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "../lib/research-cognitive-routing";
import { getAvailableInvestigatorCapabilities, investigatorCapabilityKeyName } from "../lib/investigator-capability-registry";
import { resolveResearchDepth } from "../lib/research-depth";
import { buildBoundedInvestigatorObjective } from "../lib/investigation-context-compaction";

describe("Groq Investigator runtime contract", () => {
  it("downgrades a safe browser fetch with a stale provider label to visit", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "browser_fetch",
      url: "https://example.com/about",
      provider: "browser",
      hypothesis: "The official page may identify the organization.",
      purpose: "Verify a public source.",
      expectedInformationGain: 0.7,
    }));
    expect(parsed?.action).toBe("visit");
    expect(parsed && "url" in parsed ? parsed.url : undefined).toBe("https://example.com/about");
  });

  it("accepts a one-item parallel web search and drops only oversized optional provider locale hints", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "parallel_web_search",
      searches: [{ query: "West Midlands private manufacturing directors", provider: "exa", locale: "United Kingdom (English)", market: "United Kingdom market" }],
      hypothesis: "A focused search may surface public company and director sources.",
      purpose: "Find public source leads for person-level verification.",
      expectedInformationGain: 0.5,
    }));
    expect(parsed?.action).toBe("parallel_web_search");
    if (parsed?.action !== "parallel_web_search") throw new Error("expected parallel web search");
    expect(parsed.searches).toHaveLength(1);
    expect(parsed.searches[0]?.query).toContain("manufacturing directors");
    expect(parsed.searches[0]?.locale).toBeUndefined();
    expect(parsed.searches[0]?.market).toBeUndefined();
  });

  it("accepts a one-item parallel registry search while retaining registry validation", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "parallel_registry_search",
      searches: [{ query: "West Midlands manufacturing directors", registry: "sec-edgar" }],
      hypothesis: "Registry filings can identify named company officers.",
      purpose: "Find named people to verify against independent sources.",
      expectedInformationGain: 0.5,
    }));
    expect(parsed?.action).toBe("parallel_registry_search");
    if (parsed?.action !== "parallel_registry_search") throw new Error("expected parallel registry search");
    expect(parsed.searches).toHaveLength(1);
    expect(parsed.searches[0]?.registry).toBe("sec-edgar");
  });

  it("preserves the active Boss question when emergency compaction receives a bounded objective", () => {
    const direction = "Perform registry queries on Zefix/Swiss commercial register for family-owned mid-market firms in the target sectors to extract named owners with publicly documented wealth indicators.";
    const boundedObjective = buildBoundedInvestigatorObjective({
      base: "Discover under-the-radar people with credible wealth potential and realistic public contact routes. People—not companies or executive prestige—are the target. Prefer private, mid-market, regional and family businesses.",
      direction,
      maxChars: 1_800,
    });

    const compacted = compactEmergencyInvestigatorObjective(boundedObjective);
    expect(compacted).toContain("CASE OBJECTIVE: Discover under-the-radar people");
    expect(compacted).toContain("BOSS ADVISORY DIRECTION (not a fixed action sequence): ACTIVE SCOPE CONSTRAINT:");
    expect(compacted).toContain(direction);
    expect(compacted).not.toContain("PRIMARY CASE OBJECTIVE:");
    expect(compacted).not.toContain("Pursue this question unless observed evidence");

    const withHistoricalPivot = compactEmergencyInvestigatorObjective(
      boundedObjective + "\n\nPRIOR HISTORY: BOSS-DIRECTED RESEARCH QUESTION / PIVOT: old Oregon company-search direction.",
    );
    expect(withHistoricalPivot).toContain(direction);
    expect(withHistoricalPivot).not.toContain("old Oregon company-search direction");
  });

  it("preserves the actionable reason when a pivot guard observation is compacted", () => {
    const compacted = compactEmergencyTrajectoryObservation(
      "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Perform registry queries on Zefix/Swiss commercial register. The action's actual query/resource is outside that scope. No outbound request was made.",
    );
    expect(compacted).toContain("SCOPE GUARD BLOCKED ACTION (no request)");
    expect(compacted).toContain("web discovery may search in-scope topic terms and company terms without repeating source-class wording");
    expect(compacted).toContain("choose a registry adapter matching the active geography");
    expect(compacted).toContain("fetch only an observed aligned URL");
    expect(compacted).toContain("do not retry unchanged without new evidence");
    expect(compacted).toContain("request new scope from Boss/Right-hand when needed");
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
  it("keeps discovery query semantics model-led while rejecting structurally unsafe publisher searches", async () => {
    const { validateDiscoverySearchQuery } = await import("../lib/agentic-web-research-core");

    // Target quality (fame, wealth, sector, ownership, and intermediary routes)
    // belongs to the Investigator's evidence-led reasoning and target-stage gate,
    // not English-only lexical blocking in the query-input boundary.
    for (const query of [
      "billionaires richest people Forbes",
      "Elon Musk",
      "Coca-Cola Slovenia independent bottler owner contact",
      "Slovenia casino",
      "Brazil mining",
      "famous casino owners",
      "Slovenia casino owners",
      "Example Corp founder",
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
    ]) {
      expect(validateDiscoverySearchQuery(query, []), query).toEqual({ allowed: true });
    }

    const deliberateRepeat = validateDiscoverySearchQuery("Slovenia casino", ["Slovenia casino"]);
    expect(deliberateRepeat).toMatchObject({
      allowed: true,
      warning: expect.stringMatching(/attempted before.*repeat remains a valid research choice/i),
    });

    for (const query of [
      "family office sustainability startup founder site:cnbc.com",
      "family office sustainability startup founder site:markets.businessinsider.com",
    ]) {
      expect(validateDiscoverySearchQuery(query, []), query).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("broad press-publisher-only search"),
      });
    }

    expect(validateDiscoverySearchQuery('site:investing.cnbc.com "SolarEdge" founder acquisition', [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery('site:ft.com "Žiga Debeljak" owner', [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("family offices site:cnbc.com.attacker.example", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery('site:cnbc.com "SolarEdge" founder acquisition', [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("company owners site:.org", [])).toMatchObject({ allowed: false });
    expect(validateDiscoverySearchQuery("search [CompanyName] owner", [])).toMatchObject({ allowed: false });
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

    expect(shouldTerminateActionParseFailure(1, 3, 12)).toBe(false);
    expect(shouldTerminateActionParseFailure(2, 4, 12)).toBe(true);
    expect(shouldTerminateActionParseFailure(1, 12, 12)).toBe(true);

    const repair = buildActionParseFailureObservation(
      "invalid_action_arguments action=parallel_registry_search missing=searches",
    );
    expect(repair).toContain("searches");
    expect(repair).toContain("2–4 objects");
    expect(repair).toContain('supported "registry" ID');
    expect(repair).toContain('"provider":null');
    expect(repair).toContain('"locale":null');
    expect(repair).toContain('"market":null');
    expect(repair).toContain('"purpose"');
    expect(repair).toContain("null only action-irrelevant scalar fields");
    expect(repair).toContain("never null these fields");
    expect(repair).toContain("nested registry-search item");
  });

  it("explains the configured browser provider when browser_fetch action arguments are invalid", () => {
    const repair = buildActionParseFailureObservation("invalid_action_arguments action=browser_fetch invalid=provider");
    expect(repair).toContain("browser_fetch");
    expect(repair).toContain("currently configured values");
    expect(repair).toContain("choose another action");
    expect(repair).toContain("never null these fields");
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
    expect(submitted).toContain("top-level hypothesis/purpose must be non-empty strings");
    expect(submitted).toContain("expectedInformationGain a number in [0,1] (never null)");
    expect(submitted).toContain("only done may null them");
    expect(submitted).toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    expect(submitted).toContain("Avoid generic wealth/net-worth/private-equity-profile searches alone");
    expect(submitted).toContain("Investigator models own research decisions: invent queries, choose pages/tools, pivot, and stop.");
    expect(submitted).toContain("RESEARCH TERMINAL GATE (authoritative)");
    expect(submitted).toMatch(/target-scoped research owns independent corroboration, falsification/i);
    expect(submitted).toContain('"url":null');
    expect(submitted).toContain("Parallel web searches need 2–4 objects, each with query/provider/locale/market/purpose");
    expect(submitted).toContain("Each finding needs vectorType/value/personName/role/scope/sourceUrls/note/promotionDecision/promotionReason");
    expect(submitted).toContain('"searches":[],"findings":[]');
    expect(messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(7_200);
  });

  it("rejects nullable top-level rationale fields on non-terminal research actions", () => {
    const invalidResearchAction = JSON.stringify({
      action: "web_search",
      query: "regional manufacturing company ownership filing",
      provider: "serper",
      hypothesis: null,
      purpose: "test whether an official filing names an owner",
      expectedInformationGain: 0.6,
    });
    expect(describeAgentActionParseFailure(invalidResearchAction, ["web_search"]))
      .toBe("missing_action_rationale action=web_search missing=hypothesis");
  });

  it("keeps a discovery turn usable after the active-scope guard blocks its prior action", () => {
    const objective = [
      "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary routes.",
      "BOSS ADVISORY DIRECTION (not a fixed action sequence): ACTIVE SCOPE CONSTRAINT: Shift focus to mid-market family-owned manufacturers or service firms in neighboring Central-European countries (e.g., Czech Republic, Slovakia) and seek publicly listed ownership filings or local business registries for named principals.",
    ].join("\n\n");
    const blockedObservation = "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Shift focus to mid-market family-owned manufacturers or service firms in Czechia and Slovakia and seek public ownership filings or local business registries. A new search query must name the pivot subject, geography, and source class; follow-up resources must be grounded in aligned source evidence already observed. Rationale, hypothesis, provider, or registry metadata alone does not satisfy scope. Revise the query/resource or seek new scope. No outbound request was made.";
    const records: Parameters<typeof buildStepPrompt>[0]["trajectoryRecords"] = [
      { turn: 1, model: "openai/gpt-oss-120b", action: "web_search", execution: "success", args: { query: "private equity founder mid-market manufacturing Poland", provider: "serper", purpose: "Identify candidate individuals" }, observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland"], observation: "Search snippets listed firms but no admitted person.", findings: [] },
      { turn: 2, model: "openai/gpt-oss-120b", action: "visit", execution: "success", args: { url: "https://revenuebase.ai/companies/mid-market-private-equity-investors/poland" }, observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland"], observation: "Third-party directory with company rows; no verified owner evidence.", findings: [] },
      { turn: 3, model: "openai/gpt-oss-120b", action: "web_search", execution: "success", args: { query: "Poland mid-market private equity firms founders list", provider: "serper", purpose: "Identify founder names" }, observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"], observation: "Results were broad lists, not named Polish owners.", findings: [] },
      { turn: 4, model: "openai/gpt-oss-120b", action: "visit", execution: "success", args: { url: "https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/" }, observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"], observation: "Global PE-firm list; no candidate.", findings: [] },
      { turn: 5, model: "openai/gpt-oss-120b", action: "web_search", execution: "blocked", args: { query: "Czech Republic family-owned manufacturing company owner", provider: "serper", hypothesis: "A public filing could name a principal.", purpose: "Find a source-backed owner", expectedInformationGain: 0.6 }, observedUrls: [], observation: blockedObservation, findings: [] },
    ];
    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: [],
      trajectoryRecords: records,
      lastObservation: blockedObservation,
      findings: [],
      intelligenceContext: "RESEARCH INTELLIGENCE STATE: current scope is Czechia/Slovakia.",
      mode: "discovery",
    });
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-120b",
      prompt,
      cognitiveTask: "discovery",
    });
    const messages = body.messages as Array<{ content: string }>;

    expect(messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(7_200);
    expect(prompt).toContain("Czech Republic");
    expect(prompt).toContain("SCOPE GUARD BLOCKED ACTION");
    expect(prompt).toContain("source class");
    expect(prompt).toMatch(/DISCOVERY (?:ADMISSION|LEAD HANDOFF CONTRACT)/);
    expect(prompt).toContain("one successfully fetched claim-grade source");
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

  it("keeps the local action contract while applying model-specific provider-format compatibility", () => {
    for (const model of ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
      const body = buildGroqInvestigatorRequestBody({ model, prompt: "choose the next research action", cognitiveTask: "identity_resolution" });
      expect(body.model).toBe(model);
      if (model === "openai/gpt-oss-20b") {
        expect(body).not.toHaveProperty("response_format");
      } else {
        expect(body.response_format).toBeDefined();
      }
      expect(body).not.toHaveProperty("reasoning_format");
    }
  });

  it("exposes Investigator capability availability without embedding a selection strategy", () => {
    expect(getAvailableInvestigatorCapabilities({ GROQ_INVESTIGATOR_API_KEY: "configured", GROQ_INVESTIGATOR_API_KEY_1: "configured-2" })).toEqual(["groq-investigator-1", "groq-investigator-2", "groq-investigator-20b"]);
    expect(getAvailableInvestigatorCapabilities({})).toEqual([]);
    expect(investigatorCapabilityKeyName("groq-investigator-1")).toBe("GROQ_INVESTIGATOR_API_KEY");
    expect(investigatorCapabilityKeyName("groq-investigator-2")).toBe("GROQ_INVESTIGATOR_API_KEY_1");
    expect(investigatorCapabilityKeyName("groq-investigator-20b")).toBe("GROQ_INVESTIGATOR_API_KEY");
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
