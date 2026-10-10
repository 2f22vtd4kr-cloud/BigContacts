import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bindModelFindingsToObservedSources, buildGroqInvestigatorRequestBody, buildStepPrompt, describeAgentActionParseFailure, parseAgentAction, describeToolVisitFailure, deriveProviderBoundedActTimeoutMs, discoverySearchLivenessAdvisory, isModelSelectableAgentAction, isPdfPageResponse, validateDiscoverySearchQuery, waitForAbortableDelay } from "./agentic-web-research-core";
import { getAvailableBrowserFetchProviders } from "./browser-fetch-core";
import { buildInvestigatorContext } from "./investigation-context-compaction";
import { isAcceptedInvestigatorTerminal } from "./research-terminal-gate";
import { classifyCanonicalAtlasFailure, classifyInvestigatorProviderError } from "./canonical-atlas-failure-diagnostics";

const agenticCoreSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");

function livenessRecord(action: string, execution: "success" | "error" | "blocked") {
  return {
    turn: 1,
    model: "test-model",
    action,
    args: {},
    execution,
    observation: execution === "success" ? "observed tool response" : "no response",
    observedUrls: [],
    findings: [],
    providerFallback: [],
  } as Parameters<typeof discoverySearchLivenessAdvisory>[0][number];
}

describe("Investigator provider failure classifications", () => {
  it("keeps hard quota, HTTP 429, local gate outcomes, capacity, and generic exceptions distinct", () => {
    expect(classifyInvestigatorProviderError("upstream_quota_exhausted")).toEqual({ domain: "model_provider", kind: "hard_request_quota" });
    expect(classifyInvestigatorProviderError("upstream_rate_limited")).toEqual({ domain: "model_provider", kind: "provider_rate_limited" });
    expect(classifyInvestigatorProviderError("local_provider_cooldown")).toEqual({ domain: "model_provider", kind: "local_provider_cooldown" });
    expect(classifyInvestigatorProviderError("local_provider_budget_exhausted")).toEqual({ domain: "model_provider", kind: "local_provider_budget_exhausted" });
    expect(classifyInvestigatorProviderError("HTTP_400:json_validate_failed")).toEqual({ domain: "model_provider", kind: "invalid_provider_request" });
    expect(classifyInvestigatorProviderError("HTTP_401")).toEqual({ domain: "model_provider", kind: "provider_auth_failure" });
    expect(classifyInvestigatorProviderError("HTTP_503")).toEqual({ domain: "model_provider", kind: "provider_unavailable" });
    expect(classifyInvestigatorProviderError("upstream_token_window_wait_exceeded")).toEqual({ domain: "model_provider", kind: "provider_capacity_exhausted" });
    expect(classifyInvestigatorProviderError("network_error")).toEqual({ domain: "model_provider", kind: "request_failure" });
    expect(classifyInvestigatorProviderError("mystery-error")).toEqual({ domain: "unexpected_programming_error", kind: "unexpected_exception" });
  });
});
describe("canonical failure diagnostics", () => {
  it("classifies canonical errors into finite, safe domain and kind labels", () => {
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("provider temporarily unavailable"), { status: 503 }) })).toEqual({ domain: "model_provider", kind: "provider_unavailable" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("HTTP 429"), { status: 429 }) })).toEqual({ domain: "model_provider", kind: "provider_rate_limited" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("malformed request"), { status: 400 }) })).toEqual({ domain: "model_provider", kind: "invalid_provider_request" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("unauthorized"), { status: 401 }) })).toEqual({ domain: "model_provider", kind: "provider_auth_failure" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("provider path not found"), { status: 404 }) })).toEqual({ domain: "model_provider", kind: "provider_endpoint_not_found" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("daily quota exhausted"), { code: "quota_exceeded" }) })).toEqual({ domain: "model_provider", kind: "hard_request_quota" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("groq cooldown"), { name: "ProviderQuotaError", code: "cooldown" }) })).toEqual({ domain: "model_provider", kind: "local_provider_cooldown" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("local budget exhausted"), { name: "ProviderQuotaError", code: "budget_exhausted" }) })).toEqual({ domain: "model_provider", kind: "local_provider_budget_exhausted" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("groq cooldown"), { name: "ProviderQuotaError", code: "cooldown" }) })).toEqual({ domain: "model_provider", kind: "local_provider_cooldown" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: Object.assign(new Error("local budget exhausted"), { name: "ProviderQuotaError", code: "budget_exhausted" }) })).toEqual({ domain: "model_provider", kind: "local_provider_budget_exhausted" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: new Error("upstream_quota_exhausted") })).toEqual({ domain: "model_provider", kind: "hard_request_quota" });
    expect(classifyCanonicalAtlasFailure({ stage: "boss_opening_request", error: new Error("local programming defect") })).toEqual({ domain: "unexpected_programming_error", kind: "unexpected_exception" });
    expect(classifyCanonicalAtlasFailure({ stage: "model_action_validation", error: new Error("rejected URL") })).toEqual({ domain: "model_action", kind: "invalid_contract" });
    expect(classifyCanonicalAtlasFailure({ stage: "external_page_fetch", error: new Error("Outbound response exceeds 2000000 byte limit") })).toEqual({ domain: "external_page_fetch", kind: "response_size_limit" });
    expect(classifyCanonicalAtlasFailure({ stage: "case_persistence", error: new Error("database write failed") })).toEqual({ domain: "persistence_database", kind: "unexpected_exception" });
    expect(classifyCanonicalAtlasFailure({ stage: "investigator_episode", error: new Error("unexpected") })).toEqual({ domain: "unexpected_programming_error", kind: "unexpected_exception" });
    expect(classifyCanonicalAtlasFailure({ stage: "orchestration", error: new Error("ignored"), leaseLost: true })).toEqual({ domain: "lease_job_state", kind: "lease_lost" });
    expect(classifyCanonicalAtlasFailure({ stage: "orchestration", error: new Error("ignored"), cancelled: true })).toEqual({ domain: "lease_job_state", kind: "cancelled" });
    expect(classifyCanonicalAtlasFailure({ stage: "orchestration", error: new Error("already failed"), jobStateMismatch: true })).toEqual({ domain: "lease_job_state", kind: "job_state_mismatch" });
    expect(classifyCanonicalAtlasFailure({ stage: "orchestration", error: new Error("request timed out") })).toEqual({ domain: "unexpected_programming_error", kind: "timeout" });
  });
});

describe("provider-aware act timeout budget", () => {

  it("does not put the provider capacity window under a shorter act timeout", () => {
    expect(deriveProviderBoundedActTimeoutMs(90_000, 125_000)).toBe(90_000);
    expect(deriveProviderBoundedActTimeoutMs(125_000, 125_000)).toBe(125_000);
  });

  it("keeps normal acts bounded while respecting longer configured provider windows", () => {
    expect(deriveProviderBoundedActTimeoutMs(600_000, 125_000)).toBe(180_000);
    expect(deriveProviderBoundedActTimeoutMs(500_000, 300_000)).toBe(300_000);
  });

  it("never exceeds the remaining job deadline, even when it is shorter than the provider window", () => {
    expect(deriveProviderBoundedActTimeoutMs(45_000, 125_000)).toBe(45_000);
    expect(deriveProviderBoundedActTimeoutMs(0, 125_000)).toBe(0);
  });
});

describe("page visit response classification", () => {
  it("makes the 2 MB outbound response cap actionable without treating the page as evidence", () => {
    const failure = describeToolVisitFailure(new Error("Outbound response exceeds 2000000 byte limit"));
    expect(failure.status).toBe("error");
    expect(failure.failureKind).toBe("response_size_limit");
    expect(failure.observation).toContain("failureDomain=external_page_fetch");
    expect(failure.observation).toContain("response_size_limit_exceeded max_bytes=2000000");
    expect(failure.observation).toContain("page content was not observed and must not be cited");
    expect(failure.observation).toContain("search snippets remain unverified leads");
    const pageReaderLimit = describeToolVisitFailure(new Error("browser response exceeds 1500000 byte limit"));
    expect(pageReaderLimit.failureKind).toBe("response_size_limit");
    expect(pageReaderLimit.observation).toContain("response_size_limit_exceeded max_bytes=1500000");
    expect(pageReaderLimit.observation).toContain("page content was not observed and must not be cited");
  });

  it("blocks obvious PDF URLs before either HTML-only page fetcher can issue a request", () => {
    const visitStart = agenticCoreSource.indexOf('if (action.action === "visit") {');
    const domainLookupStart = agenticCoreSource.indexOf('if (action.action === "domain_lookup") {', visitStart);
    const visitDispatch = agenticCoreSource.slice(visitStart, domainLookupStart);
    const browserStart = agenticCoreSource.indexOf('if (action.action === "browser_fetch") {', visitStart);
    const registryStart = agenticCoreSource.indexOf('if (action.action === "registry_search") {', browserStart);
    const browserDispatch = agenticCoreSource.slice(browserStart, registryStart);
    expect(visitStart).toBeGreaterThan(-1);
    expect(domainLookupStart).toBeGreaterThan(visitStart);
    expect(browserStart).toBeGreaterThan(visitStart);
    expect(registryStart).toBeGreaterThan(browserStart);
    expect(visitDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeGreaterThan(-1);
    expect(visitDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeLessThan(visitDispatch.indexOf("toolVisit(canonical"));
    expect(browserDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeGreaterThan(-1);
    expect(browserDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeLessThan(browserDispatch.indexOf('import("./browser-fetch")'));
    expect(browserDispatch).toContain("no browser provider request was made");
  });

  it("does not treat PDF bytes as an observed HTML/text page", () => {
    expect(isPdfPageResponse("https://example.test/report.pdf", "application/octet-stream")).toBe(true);
    expect(isPdfPageResponse("https://example.test/report", "application/pdf; charset=binary")).toBe(true);
    expect(isPdfPageResponse("https://example.test/officers", "text/html; charset=utf-8")).toBe(false);
  });

  it("classifies an outbound request deadline as timeout rather than a generic network error", () => {
    const failure = describeToolVisitFailure(new Error("Outbound request deadline exceeded"));
    expect(failure.status).toBe("timeout");
    expect(failure.failureKind).toBe("timeout");
    expect(failure.observation).toContain("failureDomain=external_page_fetch");
    expect(failure.observation).toContain("request timed out");
    expect(failure.observation).not.toContain("digest=");
  });
});

describe("model-selectable Investigator capabilities", () => {
  it("keeps runtime parsing and prompt/schema exposure limited to executable model capabilities", () => {
    for (const action of ["web_search", "parallel_web_search", "visit", "browser_fetch", "registry_search", "domain_lookup", "done"]) {
      expect(isModelSelectableAgentAction(action)).toBe(true);
    }
    for (const action of ["harvest_domain", "footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "footprint_spiderfoot", "made_up_tool", "", null]) {
      expect(isModelSelectableAgentAction(action)).toBe(false);
    }
  });
});

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
    const availableBrowserProviders = getAvailableBrowserFetchProviders();
    const expectedActions = ["web_search", "parallel_web_search", "visit", ...(availableBrowserProviders.length ? ["browser_fetch"] : []), "registry_search", "domain_lookup", "done"];
    expect(prompt).toContain("AVAILABLE ACTIONS: " + expectedActions.join(" | ") + ".");
    expect(prompt).not.toContain("footprint_email");
    expect(prompt).not.toContain("footprint_username_maigret");
    expect(prompt).not.toContain("harvest_domain");
    expect(prompt).toContain("VALID PROVIDERS: web_search/parallel_web_search = serper | tavily | exa.");
    expect(prompt).toContain("PAGE FORMAT / RETRIEVAL LIMITS: visit and browser_fetch do not extract text from PDF binaries.");
    expect(prompt).toContain("Search snippets remain leads, not evidence.");
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

  it("offers non-binding guidance after three successful search-only actions", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("parallel_web_search", "success"),
      livenessRecord("web_search", "success"),
    ];
    const advisory = discoverySearchLivenessAdvisory(records);
    expect(advisory).toContain("Advisory only");
    expect(advisory).toContain("further searches remain available");
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "discover an attributable person",
      history: [],
      trajectoryRecords: records,
      lastObservation: "Search results returned potentially useful leads.",
      findings: [],
      mode: "discovery",
    });
    expect(prompt).toContain("OPTIONAL DISCOVERY TRAJECTORY GUIDANCE");
    expect(prompt).toContain("this suggestion does not mandate visiting, browsing, or any particular provider");
  });

  it("surfaces duplicate searches, repeat visits, and low-yield observations as advisory context", () => {
    const duplicateSearches = [
      {
        ...livenessRecord("web_search", "success"),
        args: { query: "Vention leadership", provider: "serper", locale: "en", market: "us" },
      },
      {
        ...livenessRecord("web_search", "success"),
        args: { query: "  VENTION   LEADERSHIP ", provider: "serper", locale: "en", market: "us" },
      },
    ];
    const repeatedSearchAdvice = discoverySearchLivenessAdvisory(duplicateSearches);
    expect(repeatedSearchAdvice).toContain("Repeated normalized search request(s)");
    expect(repeatedSearchAdvice).toContain('"vention leadership"');
    expect(repeatedSearchAdvice).toContain("Advisory only");

    const repeatedVisits = [
      {
        ...livenessRecord("visit", "success"),
        args: { url: "https://example.com/team#leadership" },
        observedUrls: ["https://example.com/team"],
      },
      {
        ...livenessRecord("visit", "success"),
        args: { url: "https://EXAMPLE.com/team#contact" },
        observedUrls: ["https://example.com/team"],
      },
    ];
    expect(discoverySearchLivenessAdvisory(repeatedVisits)).toContain("Previously requested URL(s) appeared again");

    const lowYield = [
      { ...livenessRecord("web_search", "success"), observation: "Search returned no usable results.", observedUrls: [] },
      { ...livenessRecord("registry_search", "success"), observation: "No registry hits.", observedUrls: [] },
    ];
    expect(discoverySearchLivenessAdvisory(lowYield)).toContain("low-yield results");
    expect(discoverySearchLivenessAdvisory(lowYield)).toContain("not as a reason to fabricate a candidate");

    const sameSourceFamily = [
      { ...livenessRecord("visit", "success"), args: { url: "https://example.com/team" }, observedUrls: ["https://example.com/team"] },
      { ...livenessRecord("visit", "success"), args: { url: "https://example.com/about" }, observedUrls: ["https://example.com/about"] },
      { ...livenessRecord("browser_fetch", "success"), args: { url: "https://www.example.com/leadership" }, observedUrls: ["https://www.example.com/leadership"] },
    ];
    const sourceAdvice = discoverySearchLivenessAdvisory(sameSourceFamily);
    expect(sourceAdvice).toContain("Source-family concentration");
    expect(sourceAdvice).toContain("do not prescribe a tool");
  });

  it("resets only after a successful non-search capability observation", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("parallel_web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("visit", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
    ];
    expect(discoverySearchLivenessAdvisory(records)).toBeNull();

    const failedVisit = [
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("visit", "error"),
    ];
    expect(discoverySearchLivenessAdvisory(failedVisit)).toContain("Advisory only");
  });

  it("does not count failed or blocked searches as successful liveness progress", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "error"),
      livenessRecord("web_search", "blocked"),
      livenessRecord("web_search", "success"),
    ];
    expect(discoverySearchLivenessAdvisory(records)).toBeNull();
  });

  it("enforces the requested maximum when parsing model action text", () => {
    expect(describeAgentActionParseFailure(JSON.stringify({ action: "x".repeat(80) })))
      .toBe(`unsupported_action action=${"x".repeat(40)}`);
  });

  it("makes action-specific field examples subordinate to the full required JSON envelope", () => {
    const prompt = buildStepPrompt({ targetName: "", objective: "discover an attributable person", history: [], trajectoryRecords: [], lastObservation: "", findings: [], mode: "discovery" });
    expect(prompt).toContain("OUTPUT CONTRACT:");
    expect(prompt).toMatch(/The action shapes below name action-specific values only; they never replace the full required envelope\.|ALL REQUIRED TOP-LEVEL FIELDS: action,/);
    expect(prompt).toMatch(/Return exactly ONE root JSON object|Return one root JSON object/);
    expect(prompt).toMatch(/ALL REQUIRED TOP-LEVEL FIELDS|Required fields: action,query,provider/);
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
    const responseFormat = body.response_format as { type?: string; json_schema?: { schema?: Record<string, any> } };
    const schema = responseFormat.json_schema?.schema;
    expect(responseFormat.type).toBe("json_schema");
    expect(schema?.additionalProperties).toBe(false);
    expect(schema?.properties?.searches?.minItems).toBeUndefined();
    expect(schema?.properties?.searches?.maxItems).toBeUndefined();
    const availableBrowserProviders = getAvailableBrowserFetchProviders();
    expect(schema?.properties?.provider).toEqual({ type: ["string", "null"], enum: ["serper", "tavily", "exa", "rdap", "whoisjson", ...availableBrowserProviders, null] });
    expect(schema?.properties?.action?.enum).toEqual(["web_search", "parallel_web_search", "visit", ...(availableBrowserProviders.length ? ["browser_fetch"] : []), "registry_search", "domain_lookup", "done"]);
    expect(schema?.properties?.targetType).toEqual({ type: ["string", "null"] });
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


  it("rejects invalid parallel search cardinality and entries instead of silently rewriting the model action", () => {
    const searches = (count: number) => Array.from({ length: count }, (_, index) => ({
      query: `model-query-${index + 1}`,
      provider: "serper",
      locale: null,
      market: null,
      purpose: `model-purpose-${index + 1}`,
    }));
    const action = (items: unknown[]) => JSON.stringify({
      action: "parallel_web_search",
      searches: items,
      hypothesis: "compare independent public-source routes",
      purpose: "test the parallel action contract",
      expectedInformationGain: 0.5,
    });

    const tooMany = action(searches(5));
    expect(describeAgentActionParseFailure(tooMany)).toBe("invalid_action_arguments action=parallel_web_search searches_max=4");
    expect(parseAgentAction(tooMany)).toBeNull();

    const mixed = action([...searches(2), null]);
    expect(describeAgentActionParseFailure(mixed)).toBe("invalid_action_arguments action=parallel_web_search invalid=searches");
    expect(parseAgentAction(mixed)).toBeNull();

    const valid = parseAgentAction(action(searches(2)));
    expect(describeAgentActionParseFailure(action(searches(2)))).toBe("");
    expect(valid).toMatchObject({
      action: "parallel_web_search",
      searches: [
        { query: "model-query-1", provider: "serper" },
        { query: "model-query-2", provider: "serper" },
      ],
    });
  });

  it("classifies malformed and ambiguous Investigator envelopes without persisting response text", () => {
    expect(describeAgentActionParseFailure("")).toBe("empty_response");
    expect(describeAgentActionParseFailure("not json")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure("{")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure('{"foo":"bar"}')).toBe("missing_action");
    expect(describeAgentActionParseFailure('{"action":"invented"}')).toBe("unsupported_action action=invented");
    expect(describeAgentActionParseFailure('{"action":"footprint_email","email":"person@example.com"}')).toBe("unsupported_action action=footprint_email");
    expect(describeAgentActionParseFailure('{"action":"harvest_domain","domain":"example.com"}')).toBe("unsupported_action action=harvest_domain");
    expect(describeAgentActionParseFailure('{"action":"visit","url":"not-a-url","hypothesis":"validate URL handling","purpose":"check parser rejection","expectedInformationGain":0.5}')).toBe("invalid_action_arguments action=visit invalid=url");
    expect(describeAgentActionParseFailure('{"action":"web_search","query":"anchor","provider":"serper"} trailing text {"noise":true}')).toContain("non_json_envelope chars=");
    expect(describeAgentActionParseFailure('{"action":"visit","url":"https://example.com"} {"action":"done"}')).toContain("multiple_json_objects chars=");
    expect(describeAgentActionParseFailure('{"action":"parallel_web_search","searches":[{"query":"anchor","provider":"serper"}],"hypothesis":"test batch validation","purpose":"verify minimum parallel search count","expectedInformationGain":0.5}')).toBe("invalid_action_arguments action=parallel_web_search searches_min=2");
  });

  it("cancels provider-capacity waits promptly and cleans up the pending timer", async () => {
    const controller = new AbortController();
    const pending = waitForAbortableDelay(60_000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("cancelled");
  });



  it("grounds terminal claims against earlier successful page observations passed into a later act", () => {
    const priorVisit = {
      turn: 4,
      model: "test-model",
      action: "visit",
      args: { url: "https://example.org/team" },
      execution: "success",
      observation: "Jane Doe is Head of Operations. Public email: jane.doe@example.org.",
      observedUrls: ["https://example.org/team"],
      findings: [],
      providerFallback: [],
    } as const;
    const finding = {
      vectorType: "email" as const,
      value: "jane.doe@example.org",
      personName: "Jane Doe",
      role: "Head of Operations",
      scope: "candidate" as const,
      sourceUrls: ["https://example.org/team"],
      note: "Public business contact",
    };
    const bound = bindModelFindingsToObservedSources([finding], [priorVisit as unknown as Parameters<typeof bindModelFindingsToObservedSources>[1][number]]);
    expect(bound).toHaveLength(1);
    expect(bound[0]?.sourceRecord.turn).toBe(4);
    expect(bound[0]?.finding.sourceUrls).toEqual(["https://example.org/team"]);
  });

  it("never treats a search-result listing as a claim-grade prior page observation", () => {
    const searchOnly = {
      turn: 3,
      model: "test-model",
      action: "web_search",
      args: { query: "Jane Doe contact" },
      execution: "success",
      observation: "Jane Doe jane.doe@example.org",
      observedUrls: ["https://example.org/team"],
      findings: [],
      providerFallback: [],
    } as const;
    const finding = {
      vectorType: "email" as const,
      value: "jane.doe@example.org",
      personName: "Jane Doe",
      role: "Head of Operations",
      scope: "candidate" as const,
      sourceUrls: ["https://example.org/team"],
      note: "Public business contact",
    };
    expect(bindModelFindingsToObservedSources([finding], [searchOnly as unknown as Parameters<typeof bindModelFindingsToObservedSources>[1][number]])).toHaveLength(0);
  });

  it("does not treat a blocked or budget-exhausted model-selected done action as terminal", () => {
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "blocked", stopReason: "ITERATION_BUDGET" })).toBe(false);
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "success", stopReason: "ITERATION_BUDGET" })).toBe(false);
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "blocked", stopReason: "MODEL_DECIDED_DONE" })).toBe(false);
  });

  it("accepts done only after the core succeeds and returns an evidence-gated terminal reason", () => {
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(true);
    expect(isAcceptedInvestigatorTerminal({ action: "visit", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(false);
  });

});
