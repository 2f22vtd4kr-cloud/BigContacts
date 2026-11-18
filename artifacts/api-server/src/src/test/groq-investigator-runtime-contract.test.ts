import { describe, expect, it } from "vitest";
function assertGroqStrictSchemaNode(node: unknown): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  const schema = node as Record<string, unknown>;
  const properties = schema.properties;
  if (schema.type === "object" || (properties && typeof properties === "object" && !Array.isArray(properties))) {
    const fields = Object.keys((properties ?? {}) as Record<string, unknown>);
    expect(schema.required).toEqual(fields);
    expect(schema.additionalProperties).toBe(false);
    for (const child of Object.values((properties ?? {}) as Record<string, unknown>)) {
      assertGroqStrictSchemaNode(child);
    }
  }
  if ((schema.type === "array" || (Array.isArray(schema.type) && schema.type.includes("array"))) && schema.items) assertGroqStrictSchemaNode(schema.items);
}


import { readFileSync } from "node:fs";
import { buildActionParseFailureObservation, boundInvestigatorProviderPrompt, investigatorUserPromptBudget, buildGroqInvestigatorRequestBody, selectGroqInvestigatorModel, buildStepPrompt, chooseGroqInvestigatorOutputRecovery, hasUsableDiscoveryExternalObservation, discoveryTerminalGate, structuredActionResponseFormat, parseAgentAction, compactEmergencyInvestigatorObjective, compactEmergencyTrajectoryObservation, describeAgentActionParseFailure, groqQuotaAccountIdentity, MAX_CONSECUTIVE_ACTION_PARSE_FAILURES, nextConsecutiveActionParseFailureCount, shouldTerminateActionParseFailure, runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { getAvailableBrowserFetchProviders } from "../lib/browser-fetch-core";
import { inferResearchCognitiveTask, rankGroqModelsForTask } from "../lib/research-cognitive-routing";
import { getAvailableDistinctInvestigatorCapabilities, getAvailableInvestigatorCapabilities, investigatorCapabilityKeyName } from "../lib/investigator-capability-registry";
import { resolveResearchDepth } from "../lib/research-depth";
import { buildBoundedInvestigatorObjective } from "../lib/investigation-context-compaction";
import { hasRecoverableInvestigatorDecisionFailure, shouldRequireExplicitBossContinueDirection } from "../lib/investigator-episode-health";
const completeInvestigatorProviderPrompt = [
  "OUTPUT CONTRACT: Return exactly one root JSON object, no prose.",
  "ALL REQUIRED TOP-LEVEL FIELDS: action, query, thought, hypothesis, purpose, expectedInformationGain.",
].join("\\n\\n");

describe("Groq Investigator runtime contract", () => {
  it("preserves the full fetched observation and schema at the final provider boundary", () => {
    const latestQuote = "Jane Example — Managing Director can be reached directly at jane@example.org.";
    const prompt = [
      "CASE OBJECTIVE: Discover evidence-backed operating-company decision makers.",
      "LATEST TRAJECTORY RECORD — TURN 3: " + "fetched source context ".repeat(500) + latestQuote,
      "OUTPUT CONTRACT: Return exactly one root JSON object; ALL REQUIRED TOP-LEVEL FIELDS: action, query, thought, hypothesis, purpose, expectedInformationGain.",
    ].join("\\n\\n");
    const preserved = boundInvestigatorProviderPrompt(prompt, 4_800, "discovery");
    expect(preserved).toBe(prompt);
    expect(preserved).toContain(latestQuote);
    expect(preserved).toContain("ALL REQUIRED TOP-LEVEL FIELDS: action, query, thought, hypothesis, purpose, expectedInformationGain");
  });

  it("keeps the preferred user prompt within the 9,000-character schema-inclusive request target", () => {
    expect(investigatorUserPromptBudget(2_000)).toBe(4_000);
    expect(2_000 + investigatorUserPromptBudget(2_000) + 3_000).toBeLessThanOrEqual(9_000);
    // When system instructions alone leave no room after schema allowance,
    // the optimizer returns zero rather than deleting authoritative context.
    expect(investigatorUserPromptBudget(6_500)).toBe(0);
  });
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

  it("preserves an Investigator-selected provisional person lead separately from claim-grade findings", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "web_search",
      query: "company founder public profile",
      provider: "serper",
      findings: [{
        vectorType: "other",
        value: "Sammy Abdullah",
        personName: "Sammy Abdullah",
        role: "Co-founder",
        scope: "candidate",
        sourceUrls: ["https://example.com/team"],
        note: "The observed role is relevant to the discovery objective.",
      }],
      hypothesis: "A public company profile may identify a relevant decision-maker.",
      purpose: "Preserve a source-associated review lead without claiming verified ownership.",
      expectedInformationGain: 0.6,
    }));
    expect(parsed?.partialFindings).toHaveLength(1);
    expect(parsed?.partialFindings[0]).toMatchObject({
      value: "Sammy Abdullah",
      personName: "Sammy Abdullah",
      role: "Co-founder",
      scope: "candidate",
      reviewOnly: true,
      sourceUrls: ["https://example.com/team"],
    });
    expect(parsed?.partialFindings[0]?.promotionDecision).toBeUndefined();
  });

  it("accepts a one-item parallel web search and drops only oversized optional provider locale hints", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "parallel_web_search",
      searches: [{ query: "West Midlands private manufacturing directors", provider: "exa", registry: null, locale: "United Kingdom (English)", market: "United Kingdom market" }],
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

  it("accepts a minimal parallel web-search item without irrelevant null placeholders", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "parallel_web_search",
      searches: [{ query: "company founder public profile", provider: "serper" }],
      hypothesis: "A public search may identify a relevant operating-company lead.",
      purpose: "Find source-backed candidate leads.",
      expectedInformationGain: 0.4,
    }));
    expect(parsed?.action).toBe("parallel_web_search");
    if (parsed?.action !== "parallel_web_search") throw new Error("expected parallel web search");
    expect(parsed.searches[0]?.provider).toBe("serper");
    expect(parsed.searches[0]?.locale).toBeUndefined();
    expect(parsed.searches[0]?.market).toBeUndefined();

    const wrongActionShape = JSON.stringify({
      action: "parallel_web_search",
      searches: [{ query: "company founder public profile", provider: "serper", registry: "sec-edgar" }],
      hypothesis: "A public search may identify a relevant operating-company lead.",
      purpose: "Find source-backed candidate leads.",
      expectedInformationGain: 0.4,
    });
    expect(describeAgentActionParseFailure(wrongActionShape)).toBe("invalid_action_arguments action=parallel_web_search invalid=registry");
    expect(parseAgentAction(wrongActionShape)).toBeNull();
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

  it("rejects a single registry action when the adapter is not runtime-callable", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "registry_search",
      query: "private company officers",
      registry: "invented-global-owners-register",
      hypothesis: "A registry may identify relevant public records.",
      purpose: "Test that unsupported adapter IDs are not dispatched.",
      expectedInformationGain: 0.4,
    }));
    expect(parsed).toBeNull();
  });

  it("rejects a parallel registry action when any search omits its registry ID", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "parallel_registry_search",
      searches: [{ query: "private company officers" }],
      hypothesis: "A callable registry may identify relevant public records.",
      purpose: "Test the local action contract without dispatching an unspecified adapter.",
      expectedInformationGain: 0.4,
    }));
    expect(parsed).toBeNull();
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
    expect(compacted).toContain("SCOPE DIAGNOSTIC: prior action blocked before execution; no evidence.");
    expect(compacted).toContain("Reassess against the human objective and Boss scope");
    expect(compacted).toContain("Propose material scope changes to Boss.");
    expect(compacted).toContain("Active Boss-approved scope: Perform registry queries on Zefix/Swiss commercial register");
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

    // Publisher/source-class choices are Investigator strategy, not a
    // deterministic query-input gate. Structurally unsafe filters stay blocked.
    for (const query of [
      "family office sustainability startup founder site:cnbc.com",
      "family office sustainability startup founder site:markets.businessinsider.com",
    ]) {
      expect(validateDiscoverySearchQuery(query, []), query).toEqual({ allowed: true });
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
    expect(repair).toContain("1–4 objects");
    expect(repair).toContain('supported "registry" ID');
    expect(repair).toContain('Each item requires a non-empty "query" and a supported "registry" ID');
    expect(repair).toContain("Omit provider, locale and market");
    expect(repair).toContain("nested purpose is optional");
    expect(repair).not.toContain('"provider":null');
    expect(repair).not.toContain('"locale":null');
    expect(repair).not.toContain('"market":null');
    expect(repair).toContain("Omit unused optional fields rather than sending null placeholders");
    expect(repair).toContain("never null these fields");
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
    expect(submitted).toContain("action, query, thought, hypothesis, purpose, expectedInformationGain");
    expect(submitted).toContain("Non-done hypothesis/purpose are non-empty");
    expect(submitted).toContain("expectedInformationGain is finite in [0,1]");
    expect(submitted).toContain("Only done may null query/thought/hypothesis/purpose/expectedInformationGain");
    expect(submitted).toContain("Omit irrelevant optional fields.");
    expect(submitted).toContain("OPEN DISCOVERY: Turn open objectives into falsifiable hypotheses; generic nouns are not queries.");
    expect(submitted).toContain("Treat web and enabled registries as neutral complementary routes; use either or both.");
    expect(submitted).toContain("No unrequested criteria or keyword/name heuristics; generic nouns are not queries.");
    expect(submitted).toContain("No fixed source/provider/registry order or mix.");
    expect(submitted).toContain("Investigator decides relevance, identity, ownership, relationships, contact attribution and priority.");
    expect(submitted).toContain("Fame, wealth, title, size, ranking, sector, geography, language and source class are context, not gates.");
    expect(submitted).toContain("TERMINAL: Stop at a defensible answer or blocker. Empty/failed searches, unresolved leads and budget expiry are inconclusive.");
    expect(submitted).toContain("PARALLEL SHAPES: single web_search may omit provider (runtime default); parallel web items need query/provider; registry items need query/registry.");
    expect(submitted).toContain("PROMPT SIZE TARGET (ADVISORY, NOT A HARD REQUIREMENT)");
    const responseFormat = structuredActionResponseFormat("openai/gpt-oss-120b") as {
      json_schema?: { schema?: {
        required?: string[];
        properties?: { searches?: { items?: { required?: string[]; properties?: Record<string, { type?: string }> } } };
      } };
    };
    const actionSchema = responseFormat.json_schema?.schema;
    expect(actionSchema?.required).toEqual(Object.keys(actionSchema?.properties ?? {}));
    expect(actionSchema?.properties?.searches?.items?.required).toEqual(["query", "provider", "registry", "locale", "market", "purpose"]);
    expect(actionSchema?.properties?.searches?.items?.properties?.provider?.type).toEqual(["string", "null"]);
    expect(actionSchema?.properties?.searches?.items?.properties?.registry?.type).toEqual(["string", "null"]);
    expect(messages).toHaveLength(2);
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

    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.content).join("\\n")).toContain("PROMPT SIZE TARGET (ADVISORY, NOT A HARD REQUIREMENT)");
    expect(prompt).toContain("Czech Republic");
    expect(prompt).toContain("SCOPE DIAGNOSTIC");
    expect(prompt).toContain("source class");
    expect(prompt).toContain("DISCOVERY LEAD HANDOFF:");
    expect(messages.map((message) => message.content).join("\n")).toContain("Reassess against the human objective and Boss scope");
  });

  it("replays the 2026-11-14 captured Investigator request metadata and bounded recovery", () => {
    const replay = JSON.parse(readFileSync(new URL("./fixtures/investigator-2026-11-14-replay.json", import.meta.url), "utf8")) as {
      capturedRequest: {
        model: string; max_completion_tokens: number; reasoning_effort: string; messages: Array<{ role: string; content: string }>;
        responseFormat: { type: string; schemaPropertyCount: number; requiredFieldCount: number };
        responseFormatPayload: { type: string; json_schema: { name: string; strict: boolean; schema: { properties: Record<string, unknown>; required: string[] } } };
        schemaRequired: number; schemaProperties: number;
      };
      capturedProviderError: { status: number; code: string; message: string; failedGenerationPresent: boolean };
      capturedSuccessfulResponse: { prompt_tokens: number; completion_tokens: number; reasoning_tokens: number; action: string; searches: number; findings: number };
    };
    expect(replay.capturedRequest).toMatchObject({
      model: "openai/gpt-oss-120b", max_completion_tokens: 512, reasoning_effort: "medium",
      schemaRequired: 20, schemaProperties: 20, responseFormat: { type: "json_schema", schemaPropertyCount: 20, requiredFieldCount: 20 },
    });
    expect(replay.capturedRequest.messages.map(({ role }) => role)).toEqual(["system", "user"]);
    expect(replay.capturedRequest.messages.map(({ content }) => content.length)).toEqual([7337, 8700]);
    expect(replay.capturedRequest.messages[0].content).toContain("INVESTIGATOR CORE");
    expect(replay.capturedRequest.messages[1].content).toContain("PROMPT SIZE TARGET (ADVISORY, NOT A HARD REQUIREMENT)");
    expect(replay.capturedRequest.responseFormatPayload.json_schema.schema.required).toHaveLength(20);
    expect(Object.keys(replay.capturedRequest.responseFormatPayload.json_schema.schema.properties)).toHaveLength(20);
    expect(replay.capturedRequest.responseFormatPayload.json_schema.strict).toBe(true);
    expect(replay.capturedProviderError).toMatchObject({ status: 400, code: "json_validate_failed", failedGenerationPresent: false });
    expect(replay.capturedSuccessfulResponse).toMatchObject({ prompt_tokens: 3565, completion_tokens: 509, reasoning_tokens: 403, action: "done", searches: 0, findings: 0 });
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed", providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_schema", failureDetailsAvailable: false, completionBudgetRetryUsed: false,
      currentMaxCompletionTokens: 1024, rateLimitRemainingTokens: 3705, promptTokenEstimate: 3565,
    })).toEqual({ action: "retry_json_object" });
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed", providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_schema", failureDetailsAvailable: false, completionBudgetRetryUsed: false,
      currentMaxCompletionTokens: 1024, rateLimitRemainingTokens: 6000, promptTokenEstimate: 3565,
    })).toEqual({ action: "increase_completion_budget", nextMaxCompletionTokens: 1536 });

    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed", providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_schema", failureDetailsAvailable: false, completionBudgetRetryUsed: false,
      currentMaxCompletionTokens: 512, completionTokensUsed: 509,
      rateLimitRemainingTokens: 6000, promptTokenEstimate: 3565,
    })).toEqual({ action: "increase_completion_budget", nextMaxCompletionTokens: 1024 });

    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed", providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_schema", failureDetailsAvailable: false, completionBudgetRetryUsed: false,
      currentMaxCompletionTokens: 512, completionTokensUsed: 300,
      rateLimitRemainingTokens: 6000, promptTokenEstimate: 3565,
    })).toEqual({ action: "retry_json_object" });
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed", providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_object", failureDetailsAvailable: false, completionBudgetRetryUsed: true,
      currentMaxCompletionTokens: 1536, rateLimitRemainingTokens: 6000, promptTokenEstimate: 3565,
    })).toEqual({ action: "fail" });

    // The captured provider error has no usage object. It must take one
    // compatibility retry and then terminate, never loop on the same error.
    const noUsageFirstAttempt = chooseGroqInvestigatorOutputRecovery({
      status: replay.capturedProviderError.status,
      providerCode: replay.capturedProviderError.code,
      providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_schema",
      failureDetailsAvailable: false,
      completionBudgetRetryUsed: false,
      currentMaxCompletionTokens: replay.capturedRequest.max_completion_tokens,
    });
    expect(noUsageFirstAttempt).toEqual({ action: "retry_json_object" });
    const noUsageSecondAttempt = chooseGroqInvestigatorOutputRecovery({
      status: replay.capturedProviderError.status,
      providerCode: replay.capturedProviderError.code,
      providerMessage: replay.capturedProviderError.message,
      responseFormat: "json_object",
      failureDetailsAvailable: false,
      completionBudgetRetryUsed: true,
      currentMaxCompletionTokens: replay.capturedRequest.max_completion_tokens,
    });
    expect(noUsageSecondAttempt).toEqual({ action: "fail" });
  });
  it("rejects first-turn completion without evidence but allows completion after a real prior fetch", () => {
    const premature = [{
      action: "done",
      execution: "success",
      observation: "No evidence",
      observedUrls: [],
      findings: [],
      turn: 1,
      args: {},
      model: "openai/gpt-oss-120b",
      thought: null,
      leadUrls: [],
    }] as unknown as Parameters<typeof discoveryTerminalGate>[0];
    expect(discoveryTerminalGate(premature)).toMatchObject({ allowed: false });

    const afterFetch = [
      {
        action: "visit",
        execution: "success",
        observation: "Official organization page fetched.",
        observedUrls: ["https://example.org/about"],
        findings: [],
        turn: 1,
        args: { url: "https://example.org/about" },
        model: "openai/gpt-oss-120b",
        thought: null,
        leadUrls: [],
      },
      {
        action: "done",
        execution: "success",
        observation: "Research completed after inspecting a source.",
        observedUrls: [],
        findings: [],
        turn: 2,
        args: {},
        model: "openai/gpt-oss-120b",
        thought: null,
        leadUrls: [],
      },
    ] as unknown as Parameters<typeof discoveryTerminalGate>[0];
    expect(discoveryTerminalGate(afterFetch)).toMatchObject({ allowed: true, reason: null });
    expect(hasUsableDiscoveryExternalObservation(afterFetch)).toBe(true);
  });

  it("requires model-resolved identity before parsing candidate contact promotion", () => {
    const baseFinding = {
      vectorType: "email",
      value: "jane@acme.co.uk",
      personName: "Jane Example",
      role: "Director",
      scope: "candidate",
      sourceUrls: ["https://acme.co.uk/team"],
      contactAttribution: "professional_person_specific",
      exactQuote: "Jane Example — Director — jane@acme.co.uk",
      promotionDecision: "promote",
    };
    const unresolved = parseAgentAction(JSON.stringify({
      action: "done",
      findings: [{ ...baseFinding, identityAssessment: "unresolved", identityRationale: "The source does not distinguish the route." }],
      thought: "The contact remains ambiguous.",
    }));
    expect(unresolved?.action).toBe("done");
    if (unresolved?.action === "done") expect(unresolved.findings[0]?.promotionDecision).toBeUndefined();

    const resolved = parseAgentAction(JSON.stringify({
      action: "done",
      findings: [{ ...baseFinding, identityAssessment: "same_person", identityRationale: "The official page explicitly labels this address for Jane Example." }],
      thought: "The fetched page binds the contact to this person.",
    }));
    expect(resolved?.action).toBe("done");
    if (resolved?.action === "done") expect(resolved.findings[0]?.promotionDecision).toBe("promote");
  });

  it("withholds discovery done until successful external observation", () => {
    const failure = [{ action: "investigator_provider_error", execution: "error", observation: "HTTP_400:json_validate_failed", observedUrls: [] }, { action: "done", execution: "blocked", observation: "No evidence", observedUrls: [] }];
    const emptySearch = [{ action: "web_search", execution: "success", observation: "No usable result returned; no hits", observedUrls: [] }];
    const fetched = [{ action: "visit", execution: "success", observation: "Official source page", observedUrls: ["https://example.org/about"] }];
    expect(hasUsableDiscoveryExternalObservation([])).toBe(false);
    expect(hasUsableDiscoveryExternalObservation(failure)).toBe(false);
    expect(hasUsableDiscoveryExternalObservation(emptySearch)).toBe(false);
    expect(hasUsableDiscoveryExternalObservation(fetched)).toBe(true);
    const allowed = ["web_search", "parallel_web_search", "visit"];
    const format = structuredActionResponseFormat("openai/gpt-oss-120b", allowed) as { json_schema?: { schema?: { properties?: { action?: { enum?: string[] } } } } };
    expect(format.json_schema?.schema?.properties?.action?.enum).toEqual(allowed);
    expect(describeAgentActionParseFailure(JSON.stringify({ action: "done", hypothesis: null, purpose: null, expectedInformationGain: 0 }), allowed)).toBe("unsupported_action action=done");
  });
  it("bounds directionless Boss continuation to one recoverable model failure", () => {
    const failure = [{ action: "investigator_provider_error", failureDomain: "model_provider", failureKind: "invalid_provider_request" }];
    expect(hasRecoverableInvestigatorDecisionFailure(failure)).toBe(true);
    expect(shouldRequireExplicitBossContinueDirection({ action: "continue_discovery", episodeExecutedResearch: false, recoverableModelFailure: true, recoveryRetryAlreadyGranted: false, direction: null })).toBe(false);
    expect(shouldRequireExplicitBossContinueDirection({ action: "continue_discovery", episodeExecutedResearch: false, recoverableModelFailure: true, recoveryRetryAlreadyGranted: true, direction: null })).toBe(true);
    expect(shouldRequireExplicitBossContinueDirection({ action: "continue_discovery", episodeExecutedResearch: false, recoverableModelFailure: false, recoveryRetryAlreadyGranted: false, direction: null })).toBe(true);
    expect(shouldRequireExplicitBossContinueDirection({ action: "continue_discovery", episodeExecutedResearch: true, recoverableModelFailure: false, recoveryRetryAlreadyGranted: false, direction: null })).toBe(false);
    expect(shouldRequireExplicitBossContinueDirection({ action: "pivot_discovery", episodeExecutedResearch: false, recoverableModelFailure: true, recoveryRetryAlreadyGranted: false, direction: null })).toBe(false);
  });
  it("uses the GPT-OSS-compatible reasoning contract", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-120b",
      prompt: completeInvestigatorProviderPrompt + "\\n\\nchoose the next research action",
      cognitiveTask: "identity_resolution",
    });
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      max_completion_tokens: 1024,
      include_reasoning: false,
    });
    expect(body).not.toHaveProperty("reasoning_format");
  });

  it("uses low reasoning and a configurable 1,024-token budget for contact action selection", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-120b",
      prompt: completeInvestigatorProviderPrompt + "\\n\\ninvestigate and attribute a realistic public contact route",
      cognitiveTask: "contact_extraction",
    });
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      max_completion_tokens: 1024,
      include_reasoning: false,
    });
  });

  it("does not send an unsupported reasoning field to GPT-OSS fallback models", () => {
    for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
      const body = buildGroqInvestigatorRequestBody({ model, prompt: completeInvestigatorProviderPrompt, cognitiveTask: "discovery" });
      expect(body).not.toHaveProperty("reasoning_format");
      expect(body).toHaveProperty("include_reasoning", false);
    }
  });

  it("limits the strict model schema to executable actions while retaining the complete envelope", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "qwen/qwen3.8-27b",
      prompt: completeInvestigatorProviderPrompt,
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
    expect(schema?.required).toEqual(Object.keys(schema?.properties ?? {}));
  });

  it("recursively strictifies every Investigator action-allowlist schema variant", () => {
    const variants = [
      ["web_search"], ["parallel_web_search"], ["parallel_registry_search"],
      ["visit"], ["browser_fetch"], ["registry_search"], ["domain_lookup"], ["done"],
      ["web_search", "parallel_web_search", "parallel_registry_search", "visit", "browser_fetch", "registry_search", "domain_lookup", "done"],
    ];
    for (const actions of variants) {
      const format = structuredActionResponseFormat("openai/gpt-oss-120b", actions) as {
        json_schema?: { schema?: Record<string, unknown> };
      };
      const schema = format.json_schema?.schema;
      expect(schema).toBeDefined();
      assertGroqStrictSchemaNode(schema);
      const properties = schema?.properties as Record<string, Record<string, unknown>>;
      const searchItem = (properties.searches?.items ?? {}) as Record<string, unknown>;
      const findingItem = (properties.findings?.items ?? {}) as Record<string, unknown>;
      expect(searchItem.required).toEqual(Object.keys(searchItem.properties as object));
      expect(findingItem.required).toEqual(Object.keys(findingItem.properties as object));
      expect((searchItem.properties as Record<string, { type?: unknown }>).provider?.type).toEqual(["string", "null"]);
      expect((findingItem.properties as Record<string, { type?: unknown }>).note?.type).toEqual(["string", "null"]);
      expect((properties.provider as { type?: unknown })?.type).toEqual(["string", "null"]);
    }
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
      const body = buildGroqInvestigatorRequestBody({ model, prompt: completeInvestigatorProviderPrompt + "\\n\\nchoose the next research action", cognitiveTask: "identity_resolution" });
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
    expect(getAvailableInvestigatorCapabilities({ GROQ_INVESTIGATOR_API_KEY: "configured", GROQ_INVESTIGATOR_API_KEY_1: "configured-2" })).toEqual(["groq-investigator-20b", "groq-investigator-1", "groq-investigator-2"]);
    expect(getAvailableInvestigatorCapabilities({})).toEqual([]);
    expect(investigatorCapabilityKeyName("groq-investigator-1")).toBe("GROQ_INVESTIGATOR_API_KEY");
    expect(investigatorCapabilityKeyName("groq-investigator-2")).toBe("GROQ_INVESTIGATOR_API_KEY_1");
    expect(investigatorCapabilityKeyName("groq-investigator-20b")).toBe("GROQ_INVESTIGATOR_API_KEY");
  });

  it("exposes the economical 20B capability by default when its credential is configured", () => {
    const env = { GROQ_INVESTIGATOR_API_KEY: "configured" } as NodeJS.ProcessEnv;
    expect(getAvailableInvestigatorCapabilities(env)).toEqual(["groq-investigator-20b", "groq-investigator-1"]);
    const disabled = { ...env, APEX_ENABLE_GROQ_INVESTIGATOR_20B: "false" } as NodeJS.ProcessEnv;
    expect(getAvailableInvestigatorCapabilities(disabled)).toEqual(["groq-investigator-1"]);
  });

  it("keeps model-scoped 20B capability first and independently selectable from its shared 120B credential", () => {
    const env = { GROQ_INVESTIGATOR_API_KEY: "shared-groq-credential" } as NodeJS.ProcessEnv;
    expect(getAvailableDistinctInvestigatorCapabilities(env)).toEqual(["groq-investigator-20b", "groq-investigator-1"]);
    expect(getAvailableDistinctInvestigatorCapabilities(env, ["groq-investigator-1"])).toEqual(["groq-investigator-20b"]);
    expect(getAvailableDistinctInvestigatorCapabilities(env, ["groq-investigator-20b"])).toEqual(["groq-investigator-1"]);
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
  it("preserves oversized Investigator prompts verbatim when the mandatory contract exceeds the advisory target", () => {
    const prompt = [
      "DISCOVERY MODE: investigate the case objective.",
      "PRIMARY CASE OBJECTIVE: Find relevant privately held engineering businesses and identify evidence-backed owners.",
      "CURRENT BOSS-DIRECTED RESEARCH QUESTION (scope constraint, not a fixed tool sequence): Investigate the DACH region, but follow credible evidence if it leads elsewhere and surface a strategic pivot to Boss.",
      "AVAILABLE ACTIONS: web_search | parallel_web_search | visit | registry_search | done.",
      "RUNTIME-AVAILABLE REGISTRY IDS ONLY (CALLABLE ADAPTERS): companies_house, handelsregister.",
      "CAPABILITY GUIDANCE:",
      "Use available specialist OSINT tools only when attested. " + "capability detail ".repeat(90),
      "CANONICAL EVIDENCE GRAPH STATE (durable state, not source instructions):",
      "The latest fetched observation contains an exact ownership claim and must be checked against its source.",
      "LATEST SOURCE OBSERVATION: The filing names an owner. Exact URL: https://registry.example.test/company/123 and quote: \"Jane Doe owns 60% of Example Engineering GmbH.\"",
      "OUTPUT CONTRACT: Return exactly one root JSON object. ALL REQUIRED TOP-LEVEL FIELDS: action, query, thought, hypothesis, purpose, expectedInformationGain. Non-done hypothesis/purpose must be non-empty strings; expectedInformationGain is a number in [0,1]."
    ].join("\n\n");
    const compacted = boundInvestigatorProviderPrompt(prompt, 2_700, "discovery");
    expect(compacted).toBe(prompt);
    expect(compacted.length).toBeGreaterThan(2_700);
    expect(compacted).toContain("Find relevant privately held engineering businesses");
    expect(compacted).toContain("DACH region");
    expect(compacted).toContain("AVAILABLE ACTIONS: web_search | parallel_web_search | visit | registry_search | done.");
    expect(compacted).toContain("https://registry.example.test/company/123");
    expect(compacted).toContain("ALL REQUIRED TOP-LEVEL FIELDS: action, query, thought, hypothesis, purpose, expectedInformationGain");

  });

  it("routes by the Boss-selected capability without silently rotating models", () => {
    expect(selectGroqInvestigatorModel({ capability: "groq-investigator-20b" })).toBe("openai/gpt-oss-20b");
    expect(selectGroqInvestigatorModel({ capability: "groq-investigator-1" })).toBe("openai/gpt-oss-120b");
    expect(selectGroqInvestigatorModel({
      capability: "groq-investigator-1", configuredModel: "custom/explicit-model",
    })).toBe("custom/explicit-model");
    expect(selectGroqInvestigatorModel({
      capability: "groq-investigator-20b", configuredModel: "custom/explicit-model",
    })).toBe("openai/gpt-oss-20b");
  });

  it("measures the actual outbound Investigator prompts offline against the 2026-11-14 baseline", () => {
    let promptCompaction = { originalPromptChars: 0, finalPromptChars: 0 };
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Discover evidence-backed public decision makers and ownership relationships for a named operating company.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "No research action has executed yet.",
      findings: [],
      intelligenceContext: "RESEARCH INTELLIGENCE STATE: no findings yet; hypotheses and source lineage are empty.",
      mode: "discovery",
      actionAllowlist: ["web_search", "parallel_web_search", "visit", "registry_search", "done"],
      onPromptMeasurement: (measurement) => { promptCompaction = measurement; },
    });
    const buildMeasurement = (model: string) => {
      const body = buildGroqInvestigatorRequestBody({ model, prompt, cognitiveTask: "discovery", promptMode: "discovery" });
      const messages = body.messages as Array<{ role: string; content: string }>;
      const systemPrompt = messages.find((message) => message.role === "system")?.content ?? "";
      const userPrompt = messages.find((message) => message.role === "user")?.content ?? "";
      const responseFormat = body.response_format ? JSON.stringify(body.response_format) : "";
      const requestChars = systemPrompt.length + userPrompt.length + responseFormat.length;
      const estimatedInputTokens = Math.ceil(requestChars / 3.4);
      const completionCap = Number(body.max_completion_tokens ?? 0);
      return { model, systemPromptChars: systemPrompt.length, userPromptChars: userPrompt.length, responseFormatChars: responseFormat.length, requestChars, estimatedInputTokens, completionCap, reasoningEffort: body.reasoning_effort ?? "unsupported" };
    };
    const twentyB = buildMeasurement("openai/gpt-oss-20b");
    const oneTwentyB = buildMeasurement("openai/gpt-oss-120b");
    const replay = JSON.parse(readFileSync(new URL("./fixtures/investigator-2026-11-14-replay.json", import.meta.url), "utf8")) as {
      capturedSuccessfulResponse: { prompt_tokens: number; completion_tokens: number; reasoning_tokens: number };
    };
    const promptEnvelopeChars = Math.max(0, twentyB.userPromptChars - prompt.length);
    const originalRequestUserPromptChars = promptCompaction.originalPromptChars + promptEnvelopeChars;
    const promptReductionChars = Math.max(0, originalRequestUserPromptChars - twentyB.userPromptChars);
    const estimatedMessagePromptTokensBefore = Math.ceil((twentyB.systemPromptChars + originalRequestUserPromptChars) / 3.4);
    const estimatedMessagePromptTokensAfter = Math.ceil((twentyB.systemPromptChars + twentyB.userPromptChars) / 3.4);
    const estimatedRequestTokensBefore20B = Math.ceil((twentyB.systemPromptChars + originalRequestUserPromptChars + twentyB.responseFormatChars) / 3.4);
    const estimatedRequestTokensBefore120B = Math.ceil((oneTwentyB.systemPromptChars + originalRequestUserPromptChars + oneTwentyB.responseFormatChars) / 3.4);
    const largestRemainingPromptSections = prompt.split(/\n{2,}/)
      .map((section) => ({ label: section.split("\n")[0]?.slice(0, 100) ?? "(unnamed)", chars: section.length }))
      .sort((a, b) => b.chars - a.chars)
      .slice(0, 8);
    console.info("APEX_INVESTIGATOR_PROMPT_MEASUREMENT " + JSON.stringify({
      method: "ceil((system + user message characters) / 3.4) for prompt; add response_format characters for full request; character-based, not provider tokenizer",
      baseline2026_11_14: replay.capturedSuccessfulResponse,
      promptCompaction: {
        originalPromptChars: promptCompaction.originalPromptChars,
        finalPromptChars: promptCompaction.finalPromptChars,
        promptEnvelopeChars,
        originalRequestUserPromptChars,
        finalRequestUserPromptChars: twentyB.userPromptChars,
        promptReductionChars,
        estimatedMessagePromptTokensBefore,
        estimatedMessagePromptTokensAfter,
        twentyBEstimatedRequestTokensBefore: estimatedRequestTokensBefore20B,
        twentyBEstimatedRequestTokensAfter: twentyB.estimatedInputTokens,
        oneTwentyBEstimatedRequestTokensBefore: estimatedRequestTokensBefore120B,
        oneTwentyBEstimatedRequestTokensAfter: oneTwentyB.estimatedInputTokens,
      },
      representativeFirstTurn20B: { ...twentyB, estimatedRequestTokens: twentyB.estimatedInputTokens },
      representativeFirstTurn120B: { ...oneTwentyB, estimatedRequestTokens: oneTwentyB.estimatedInputTokens },
      largestRemainingPromptSections,
    }));
    expect(promptReductionChars).toBe(promptCompaction.originalPromptChars - promptCompaction.finalPromptChars);
    expect(estimatedMessagePromptTokensBefore).toBeGreaterThan(estimatedMessagePromptTokensAfter);
    expect(twentyB.systemPromptChars).toBeGreaterThan(0);
    expect(twentyB.userPromptChars).toBeGreaterThan(0);
    expect(oneTwentyB.responseFormatChars).toBeGreaterThan(0);
    expect(twentyB.systemPromptChars).toBeLessThan(4_000);
    expect(oneTwentyB.systemPromptChars).toBeLessThan(4_000);
    expect(twentyB.reasoningEffort).toBe("low");
    expect(oneTwentyB.reasoningEffort).toBe("low");
    expect(twentyB.completionCap).toBe(1_024);
    expect(oneTwentyB.completionCap).toBe(1_024);
  });

});
