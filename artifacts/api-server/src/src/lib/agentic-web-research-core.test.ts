import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { bindModelFindingsToObservedSources, normalizeDiscoverySearchQuery, buildActionParseFailureObservation, buildAgenticActionParseFailureRecord, buildGroqInvestigatorRequestBody, buildStepPrompt, chooseGroqInvestigatorOutputRecovery, isGroqCompletionTruncationMessage, nextGroqInvestigatorCompletionBudget, compactEmergencyInvestigatorObjective, compactEmergencyTrajectoryObservation, discoveryPivotAlignmentReason, partitionParallelWebSearchesByPivotScope, partitionParallelRegistrySearchesByPivotScope, pivotScopeAnchors, discoveryPivotScopeKey, extractBossPivotDirectionForCompactPrompt, createCancellationSupervisor, describeAgentActionParseFailure, buildDiscoveryLeadUtilizationState, parseAgentAction, describeToolVisitFailure, deriveProviderBoundedActTimeoutMs, discoverySearchLivenessAdvisory, discoveryTerminalGate, INVESTIGATOR_CANCELLATION_POLL_INTERVAL_MS, isModelSelectableAgentAction, isPdfPageResponse, redundantResearchActionReason, repeatedDiscoverySearchReason, repeatedPivotBlockedActionReason, registryAdapterRetryBlockedReason, summarizeRegistryAdapterFailure, classifyRegistryBatchExecution, validateDiscoveryDomainLookup, validateDiscoverySearchQuery, validateDiscoverySourceUrl, waitForAbortableDelay, structuredActionResponseFormat, type AgenticTrajectoryRecord } from "./agentic-web-research-core";
import { apexOrientationFor } from "./apex-bureau-orientation";
import { getAvailableBrowserFetchProviders } from "./browser-fetch-core";
import { buildBoundedInvestigatorObjective, buildInvestigatorContext } from "./investigation-context-compaction";
import { isAcceptedInvestigatorTerminal } from "./research-terminal-gate";
import { classifyCanonicalAtlasFailure, classifyInvestigatorProviderError, classifyRegistryAdapterFailure } from "./canonical-atlas-failure-diagnostics";
import { classifyThrownProviderError } from "./provider-error-diagnostics";

const agenticCoreSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");
const canonicalAtlasDiscoverySource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const bureauAgenticPassSource = readFileSync(resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");

describe("thrown provider error classification", () => {
  it("does not misclassify local prompt-budget failures as network failures", () => {
    expect(classifyThrownProviderError(
      new Error("Investigator mandatory schema and evidence contract exceed the provider prompt budget."),
    )).toBe("unexpected_error");
    expect(classifyThrownProviderError(
      Object.assign(new Error("request failed: fetch failed"), { code: "ECONNRESET" }),
    )).toBe("network_error");
    expect(classifyThrownProviderError(
      Object.assign(new Error("monthly quota exhausted"), { name: "ProviderQuotaError" }),
    )).toBe("rate_limited");
  });
});

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

describe("registry adapter circuit breaker", () => {
  it("blocks retry of a failed adapter but leaves other adapters available", () => {
    const failedAdapters = new Set(["bolagsverket-sweden"]);

    expect(registryAdapterRetryBlockedReason("bolagsverket-sweden", failedAdapters)).toMatch(
      /REGISTRY_ADAPTER_CIRCUIT_OPEN.*Do not retry.*web_search.*not evidence/i,
    );
    expect(registryAdapterRetryBlockedReason("BRREG", failedAdapters)).toBeNull();
    expect(registryAdapterRetryBlockedReason("BRREG", new Set(["brreg"]))).toMatch(/already failed/i);
  });

  it("surfaces safe registry failure classes instead of opaque exception digests", () => {
    const unavailable = Object.assign(new Error("sensitive provider detail must not be forwarded"), {
      code: "REGISTRY_ADAPTER_UNAVAILABLE",
    });
    const httpFailure = new Error("Offeneregister Germany HTTP 502");
    const dnsFailure = Object.assign(new Error("fetch failed"), { code: "ENOTFOUND" });

    expect(summarizeRegistryAdapterFailure("kvk-netherlands", unavailable)).toMatch(
      /REGISTRY_ADAPTER_UNAVAILABLE.*kvk-netherlands.*not a no-hit/i,
    );
    expect(summarizeRegistryAdapterFailure("offeneregister-germany", httpFailure)).toMatch(
      /REGISTRY_ADAPTER_HTTP_ERROR.*offeneregister-germany.*HTTP 502.*not a no-hit/i,
    );
    expect(summarizeRegistryAdapterFailure("offeneregister-germany", dnsFailure)).toMatch(
      /REGISTRY_ADAPTER_TRANSPORT_ERROR.*ENOTFOUND.*not a no-hit/i,
    );
    const numericErrnoFailure = Object.assign(new Error("fetch failed"), { errno: -111 });
    expect(summarizeRegistryAdapterFailure("offeneregister-germany", numericErrnoFailure)).toMatch(
      /REGISTRY_ADAPTER_TRANSPORT_ERROR.*-111.*not a no-hit/i,
    );
    const authFailure = Object.assign(new Error("API token is not configured"), { code: "REGISTRY_AUTH_REQUIRED" });
    const malformedFailure = new Error("Offeneregister Germany malformed response: expected company columns are missing");
    const timeoutFailure = new Error("request timed out");
    expect(summarizeRegistryAdapterFailure("opencorporates", authFailure)).toMatch(/REGISTRY_ADAPTER_AUTH_REQUIRED.*not a no-hit/i);
    expect(summarizeRegistryAdapterFailure("offeneregister-germany", malformedFailure)).toMatch(/REGISTRY_ADAPTER_MALFORMED_RESPONSE.*not a no-hit/i);
    expect(summarizeRegistryAdapterFailure("offeneregister-germany", timeoutFailure)).toMatch(/REGISTRY_ADAPTER_TIMEOUT.*not a no-hit/i);
    expect(classifyRegistryAdapterFailure(unavailable)).toBe("registry_unavailable");
    expect(classifyRegistryAdapterFailure(authFailure)).toBe("registry_auth_required");
    expect(classifyRegistryAdapterFailure(httpFailure)).toBe("registry_http_error");
    expect(classifyRegistryAdapterFailure(dnsFailure)).toBe("registry_transport_error");
    expect(classifyRegistryAdapterFailure(malformedFailure)).toBe("registry_malformed_response");
    expect(classifyRegistryAdapterFailure(timeoutFailure)).toBe("registry_timeout");
    expect(classifyRegistryAdapterFailure(numericErrnoFailure)).toBe("registry_transport_error");
    expect(summarizeRegistryAdapterFailure("kvk-netherlands", unavailable)).not.toContain(
      "sensitive provider detail",
    );
  });

  it("marks mixed parallel registry outcomes as partial instead of success", () => {
    expect(classifyRegistryBatchExecution([{ error: null }, { error: "HTTP 502" }])).toBe("partial");
    expect(classifyRegistryBatchExecution([{ error: null }, { error: null }])).toBe("success");
    expect(classifyRegistryBatchExecution([{ error: "HTTP 502" }, { error: "ENOTFOUND" }])).toBe("error");
    expect(classifyRegistryBatchExecution([])).toBe("error");
  });
});

describe("Investigator cancellation supervisor", () => {
  it("coalesces slow polling with per-action checks without caching settled results", async () => {
    vi.useFakeTimers();
    try {
      let finishFirst: ((value: boolean) => void) | undefined;
      const shouldCancel = vi.fn<() => Promise<boolean>>();
      shouldCancel.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }));
      shouldCancel.mockResolvedValue(false);
      const supervisor = createCancellationSupervisor(shouldCancel, vi.fn(), () => false);
      const first = supervisor.checkNow();
      const concurrent = supervisor.checkNow();
      expect(concurrent).toBe(first);
      await vi.advanceTimersByTimeAsync(INVESTIGATOR_CANCELLATION_POLL_INTERVAL_MS);
      expect(shouldCancel).toHaveBeenCalledTimes(1);
      expect(finishFirst).toBeDefined();
      finishFirst!(false);
      await expect(first).resolves.toBe(false);
      await vi.advanceTimersByTimeAsync(INVESTIGATOR_CANCELLATION_POLL_INTERVAL_MS);
      expect(shouldCancel).toHaveBeenCalledTimes(2);
      supervisor.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("observes background cancellation once and stops further owner/job polling", async () => {
    vi.useFakeTimers();
    try {
      let stopped = false;
      const shouldCancel = vi.fn().mockResolvedValue(true);
      const onCancel = vi.fn(() => { stopped = true; });
      const supervisor = createCancellationSupervisor(shouldCancel, onCancel, () => stopped);
      await vi.advanceTimersByTimeAsync(INVESTIGATOR_CANCELLATION_POLL_INTERVAL_MS);
      expect(onCancel).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(INVESTIGATOR_CANCELLATION_POLL_INTERVAL_MS * 5);
      expect(shouldCancel).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
      supervisor.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("Investigator action parse-failure provenance", () => {
  it("persists PARSE_FAILURE on the terminal invalid-contract record, not just the in-memory result", () => {
    const terminal = buildAgenticActionParseFailureRecord({
      turn: 24,
      model: "test-model",
      observation: "Invalid action contract (missing_action).",
      terminal: true,
    });
    const recoverable = buildAgenticActionParseFailureRecord({
      turn: 23,
      model: "test-model",
      observation: "Invalid action contract (missing_action).",
      terminal: false,
    });

    expect(terminal).toMatchObject({
      turn: 24,
      action: "parse_failure",
      execution: "error",
      failureDomain: "model_action",
      failureKind: "invalid_contract",
      stopReason: "PARSE_FAILURE",
    });
    expect(recoverable.stopReason).toBeUndefined();
  });
});

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

  it("persists exact source-span offsets and PDF page numbers in durable observation events", () => {
    expect(agenticCoreSource).toContain("const sourceBindings = boundFindings.map");
    expect(agenticCoreSource).toContain("record.sourceBindings = sourceBindings");
    expect(agenticCoreSource).toContain("pageNumber: span.pageNumber ?? null");
    expect(agenticCoreSource).toContain("sourceTurn: sourceRecord.turn");
    expect(bureauAgenticPassSource).toContain("sourceBindings:record.sourceBindings??[]");
    expect(bureauAgenticPassSource).toContain("sourceBindings:claimSourceBindings");
  });

  it("routes PDF visits through bounded text extraction while retaining browser-fetch PDF preflight", () => {
    const visitStart = agenticCoreSource.indexOf('if (action.action === "visit") {');
    const browserStart = agenticCoreSource.indexOf('if (action.action === "browser_fetch") {', visitStart);
    const registryStart = agenticCoreSource.indexOf('if (action.action === "registry_search") {', browserStart);
    const domainLookupStart = agenticCoreSource.indexOf('if (action.action === "domain_lookup") {', browserStart);
    const visitDispatch = agenticCoreSource.slice(visitStart, browserStart);
    const browserDispatch = agenticCoreSource.slice(browserStart, registryStart);
    expect(visitStart).toBeGreaterThan(-1);
    expect(browserStart).toBeGreaterThan(visitStart);
    expect(domainLookupStart).toBeGreaterThan(visitStart);
    expect(browserStart).toBeGreaterThan(visitStart);
    expect(registryStart).toBeGreaterThan(browserStart);
    expect(visitDispatch).not.toContain("if (isPdfPageResponse(action.url, null))");
    expect(visitDispatch.indexOf("toolVisit(canonical")).toBeGreaterThan(-1);
    expect(agenticCoreSource).toContain("extractPdfText(responseBytes");
    expect(agenticCoreSource).toContain("PDF_TEXT_MAX_BYTES");
    expect(agenticCoreSource).toContain("documentType=pdf retrievedAt=");
    expect(agenticCoreSource).toContain("OCR REQUIRED FOR IMAGE-ONLY PAGES");
    expect(browserDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeGreaterThan(-1);
    expect(browserDispatch.indexOf("if (isPdfPageResponse(action.url, null))")).toBeLessThan(browserDispatch.indexOf('import("./browser-fetch")'));
    expect(browserDispatch).toContain("no browser provider request was made");
  });

  it("does not treat PDF bytes as an observed HTML/text page", () => {
    expect(isPdfPageResponse("https://example.test/report.pdf", "application/octet-stream")).toBe(true);
    expect(isPdfPageResponse("https://example.test/report", "application/pdf; charset=binary")).toBe(true);
    expect(isPdfPageResponse("https://example.test/download", "application/octet-stream", 'attachment; filename="filing.pdf"')).toBe(true);
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
    for (const action of ["web_search", "parallel_web_search", "parallel_registry_search", "visit", "browser_fetch", "registry_search", "domain_lookup", "done"]) {
      expect(isModelSelectableAgentAction(action)).toBe(true);
    }
    for (const action of ["harvest_domain", "footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "footprint_spiderfoot", "made_up_tool", "", null]) {
      expect(isModelSelectableAgentAction(action)).toBe(false);
    }
  });
});

describe("attested Python OSINT capabilities remain model-selectable when the runtime authorizes them", () => {
  it("does not describe conditional worker tools as permanently unavailable", () => {
    const orientation = apexOrientationFor("dig_agent");
    expect(orientation).toContain("fresh signed worker attestation");
    expect(orientation).toContain("independently pinned worker/proxy image digests");
    expect(orientation).toContain("a source-observed email can justify considering footprint_email (Holehe) or footprint_spiderfoot");
    expect(orientation).not.toContain("intentionally not available capabilities");
  });

  it("keeps an attested email/SpiderFoot choice in the same per-turn prompt and structured action enum", () => {
    // This fixture represents the allowlist produced after the runtime verifies
    // its current worker attestation; it does not make tools globally available.
    const actionAllowlist = ["footprint_email", "footprint_spiderfoot", "web_search"];
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Investigate a source-observed public email and establish whether it is relevant to the target.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "An official page exposes the public email contact@example.test.",
      findings: [],
      mode: "discovery",
      actionAllowlist,
    });

    expect(prompt).toContain("AVAILABLE ACTIONS: footprint_email | footprint_spiderfoot | web_search.");
    expect(prompt).toContain("Worker-backed actions, when listed in AVAILABLE ACTIONS");
    expect(prompt).not.toContain("intentionally not available capabilities");
    const responseFormat = structuredActionResponseFormat("openai/gpt-oss-20b", actionAllowlist) as {
      json_schema: { schema: { properties: { action: { enum: string[] } } } };
    };
    expect(responseFormat.json_schema.schema.properties.action.enum).toEqual(actionAllowlist);
  });
});

describe("Investigator prompt URL integrity", () => {
  it("keeps a complete source URL when it fits the prompt inventory", () => {
    const url = "https://registry.example.test/filings/" + "a".repeat(300);
    const record = {
      turn: 1,
      model: "test-model",
      action: "web_search",
      execution: "success",
      args: { query: "official registry filing" },
      observation: "Search returned one potential official registry source.",
      observedUrls: [],
      leadUrls: [url],
      findings: [],
      providerFallback: [],
    } as AgenticTrajectoryRecord;

    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Find source-backed owner/operator evidence from public registries.",
      history: [],
      trajectoryRecords: [record],
      lastObservation: "A relevant registry result remains unfetched.",
      findings: [],
      mode: "discovery",
      actionAllowlist: ["web_search", "visit", "done"],
    });

    expect(prompt).toContain(url);
    expect(prompt).toContain('"leadUrlsOmittedFromPromptCount":0');
  });

  it("does not emit a truncated prefix when a URL is too long for an atomic prompt sample", () => {
    const url = "https://registry.example.test/filings/" + "z".repeat(700);
    const record = {
      turn: 1,
      model: "test-model",
      action: "web_search",
      execution: "success",
      args: { query: "official registry filing" },
      observation: "Search returned one potential official registry source.",
      observedUrls: [],
      leadUrls: [url],
      findings: [],
      providerFallback: [],
    } as AgenticTrajectoryRecord;

    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Find source-backed owner/operator evidence from public registries.",
      history: [],
      trajectoryRecords: [record],
      lastObservation: "A relevant registry result remains unfetched.",
      findings: [],
      mode: "discovery",
      actionAllowlist: ["web_search", "visit", "done"],
    });

    expect(prompt).toContain('"leadUrlsOmittedFromPromptCount":1');
    expect(prompt.includes(url.slice(0, 120))).toBe(prompt.includes(url));
  });
});

describe("discovery lead inventory", () => {
  it("keeps other search-result URLs available after one URL fails retrieval", () => {
    const urls = Array.from({ length: 17 }, (_, index) => `https://lead-${index + 1}.example.test/company`);
    const search = {
      turn: 1, model: "test-model", action: "parallel_web_search", args: {}, execution: "success",
      observation: "Search results are leads only.", observedUrls: [], leadUrls: urls, findings: [],
    } as AgenticTrajectoryRecord;
    const failedFetch = {
      turn: 2, model: "test-model", action: "browser_fetch", args: { url: urls[0] }, execution: "error",
      observation: "fetch failed", observedUrls: [], leadUrls: [], findings: [],
      failureDomain: "external_page_fetch", failureKind: "request_failure",
    } as AgenticTrajectoryRecord;
    const successfulFetch = {
      turn: 3, model: "test-model", action: "visit", args: { url: urls[1] }, execution: "success",
      observation: "observed source content", observedUrls: [urls[1]], leadUrls: [], findings: [],
    } as AgenticTrajectoryRecord;
    const blockedFetch = {
      turn: 4, model: "test-model", action: "visit", args: { url: urls[2] }, execution: "blocked",
      observation: "scope guard blocked before outbound execution", observedUrls: [], leadUrls: [], findings: [],
    } as AgenticTrajectoryRecord;

    const state = buildDiscoveryLeadUtilizationState([search, failedFetch, successfulFetch, blockedFetch]);
    expect(state.searchResultLeadUrlCount).toBe(17);
    expect(state.successfullyFetchedLeadUrlCount).toBe(1);
    expect(state.failedLeadUrlCount).toBe(1);
    expect(state.failedLeadUrls[0]).toMatchObject({
      url: urls[0], action: "browser_fetch", execution: "error",
      failureDomain: "external_page_fetch", failureKind: "request_failure",
    });
    expect(state.unfetchedLeadUrlCount).toBe(14);
    expect(state.unfetchedLeadUrls).toContain(urls[3]);
    expect(state.unfetchedLeadUrls).not.toContain(urls[2]);
    expect(state.failedLeadUrls.some((item) => item.url === urls[2])).toBe(false);
    expect(state.blockedLeadUrlCount).toBe(1);
    expect(state.blockedLeadUrls[0]).toMatchObject({ url: urls[2], action: "visit" });
    expect(state.unfetchedLeadUrls).not.toContain(urls[0]);
    expect(state.unfetchedLeadUrls).not.toContain(urls[1]);
  });
});

describe("partial model findings", () => {
  it("retains a source-backed organization lead returned with a non-terminal web-search action", () => {
    const finding = {
      vectorType: "other",
      value: "Example Manufacturing Ltd",
      personName: null,
      role: null,
      scope: "organization",
      sourceUrls: ["https://example.com/ownership"],
      note: "The fetched source names the company; ownership remains unverified.",
      promotionDecision: null,
      promotionReason: null,
    };
    const parsed = parseAgentAction(JSON.stringify({
      action: "web_search",
      query: "Example Manufacturing Ltd owners",
      provider: "serper",
      hypothesis: "A public registry page may identify company ownership.",
      purpose: "Find a source that can support or falsify the ownership hypothesis.",
      expectedInformationGain: 0.7,
      findings: [finding],
    }), ["web_search"]);

    expect(parsed?.action).toBe("web_search");
    expect(parsed?.partialFindings).toEqual([{
      ...finding,
      promotionDecision: undefined,
      promotionReason: undefined,
    }]);
  });

  it("keeps non-terminal person leads review-only and drops model promotion decisions", () => {
    const parsed = parseAgentAction(JSON.stringify({
      action: "web_search",
      query: "Example Manufacturing Ltd owner",
      provider: "serper",
      hypothesis: "An official source may identify an owner.",
      purpose: "Test an ownership hypothesis.",
      expectedInformationGain: 0.6,
      findings: [{
        vectorType: "other",
        value: "Jane Doe",
        personName: "Jane Doe",
        role: "Owner",
        scope: "candidate",
        sourceUrls: ["https://example.com/leadership"],
        note: "Candidate claim from a non-terminal action.",
        promotionDecision: "promote",
        promotionReason: "The output claims an ownership role.",
      }],
    }), ["web_search"]);

    expect(parsed?.partialFindings).toEqual([{
      vectorType: "other",
      value: "Jane Doe",
      personName: "Jane Doe",
      role: "Owner",
      scope: "candidate",
      sourceUrls: ["https://example.com/leadership"],
      note: "Candidate claim from a non-terminal action.",
      promotionDecision: undefined,
      promotionReason: undefined,
    }]);
  });

  it("preserves an unpromoted lead when the Investigator stops", () => {
    const finding = {
      vectorType: "other",
      value: "Jane Doe",
      personName: "Jane Doe",
      role: "Owner",
      scope: "candidate",
      sourceUrls: ["https://example.com/leadership"],
      note: "The fetched source supports a review lead only.",
      promotionDecision: null,
      promotionReason: null,
    };
    const parsed = parseAgentAction(JSON.stringify({
      action: "done",
      findings: [finding],
      thought: "The person lead needs target-stage corroboration before any HNWI conclusion.",
    }), ["done"]);

    expect(parsed?.action).toBe("done");
    expect(parsed?.partialFindings).toEqual([{
      ...finding,
      promotionDecision: undefined,
      promotionReason: undefined,
    }]);
  });

  it("asks the Investigator to retain useful sourced findings while it continues researching", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Find under-the-radar owners with credible wealth potential.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "A fetched official company page names a private manufacturing company.",
      findings: [],
      mode: "discovery",
    });
    expect(prompt).toContain("PARTIAL FINDINGS");
    expect(prompt).toContain("PARTIAL FINDINGS (not terminal-only)");
    expect(prompt).toContain("source-backed leads");
  });
});

describe("decision-scoped action allowlists", () => {
  it("parses against the same allowlist captured for the model decision, not a later worker-cache state", () => {
    const raw = JSON.stringify({
      action: "footprint_email",
      email: "alice@example.test",
      hypothesis: "The observed email may have a public service footprint.",
      purpose: "Test whether a targeted service footprint could distinguish the identity hypothesis.",
      expectedInformationGain: 0.7,
      thought: "Use the attested email footprint capability.",
    });
    expect(describeAgentActionParseFailure(raw, ["footprint_email"])).toBe("");
    expect(parseAgentAction(raw, ["footprint_email"])).toMatchObject({
      action: "footprint_email",
      email: "alice@example.test",
    });
    expect(parseAgentAction(raw, ["web_search"])).toBeNull();

    const actionAllowlist = ["footprint_email", "web_search"];
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Investigate the observed email and establish whether it belongs to the intended person.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "No external evidence has been collected yet.",
      findings: [],
      mode: "discovery",
      actionAllowlist,
    });
    expect(prompt).toContain("AVAILABLE ACTIONS: footprint_email | web_search.");

    const responseFormat = structuredActionResponseFormat("openai/gpt-oss-20b", actionAllowlist) as {
      type: string;
      json_schema: { schema: { properties: { action: { enum: string[] } } } };
    };
    expect(responseFormat.type).toBe("json_schema");
    expect(responseFormat.json_schema.schema.properties.action.enum).toEqual(actionAllowlist);

    const requestBody = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt,
      cognitiveTask: "identity_resolution",
      actionAllowlist,
    }) as { response_format: typeof responseFormat };
    expect(requestBody.response_format.json_schema.schema.properties.action.enum).toEqual(actionAllowlist);
  });
});

describe("Investigator outbound request audit boundary", () => {
  it("records the constructed outbound body only through the opt-in sanitized audit path", () => {
    expect(agenticCoreSource).toContain("emitInvestigatorProviderRequestAudit({");
    expect(agenticCoreSource).toContain("requestBody,");
    expect(agenticCoreSource).toContain("body: JSON.stringify(requestBody)");
    expect(agenticCoreSource).not.toContain('logger.info({ requestBody');
  });
});

describe("Investigator prompt architecture", () => {
  it("separates a bounded review-lead handoff from target-scoped evidence verification", () => {
    const discovery = buildStepPrompt({
      targetName: "",
      objective: "Discover a source-backed person with credible wealth potential.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "",
      findings: [],
      mode: "discovery",
    });
    const target = buildStepPrompt({
      targetName: "Alex Morgan",
      companyName: "Northstar Holdings",
      objective: "Investigate the exact named target for ownership, counter-evidence, and realistic public contact routes.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "",
      findings: [],
      mode: "target",
    });
    expect(discovery).toContain("minEvidence=1; minIndependentSourceUnits=1; requireExactSpanForFindings=false; requireFalsification=false");
    expect(discovery).toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    expect(discovery).toContain("one successfully fetched claim-grade source");
    expect(discovery).toContain("Target-scoped research owns independent corroboration, falsification, and contact-route verification before any HNWI/contact conclusion");
    expect(discovery).toContain("Target-stage research tests material business/asset/exit signals, independently corroborates or falsifies the lead, and verifies direct or indirect routes before any promotion");
    expect(discovery).not.toContain("at least one successful external action must explicitly attempt to disprove");
    expect(target).toContain("minEvidence=3; minIndependentSourceUnits=2; requireExactSpanForFindings=true; requireFalsification=true");
    expect(target).not.toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    expect(target).not.toContain("DISCOVERY TARGETABILITY GATE");
  });


  it("preserves the complete multiline Boss pivot in the emergency compact objective", () => {
    expect(extractBossPivotDirectionForCompactPrompt(
      "base objective\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\nVerify the exact entity anchor against public evidence.\nThen test a materially different independent source for the same name and role.",
    )).toBe("Verify the exact entity anchor against public evidence.\nThen test a materially different independent source for the same name and role.");
  });

  it("keeps the composed model prompt materially below the old 12k-character live request", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: [
        "Discover real named people for subsequent target-scoped public-contact research. Start from a concrete business or operating context.",
        "BOSS OPENING CONTROL DIRECTION (advisory, not a fixed research sequence):",
        "Report: Opening assessment: No concrete target entity has been provided.",
        "Next directions: " + JSON.stringify(["Select a publicly registered company in a defined sector and geography, then identify senior officers from its official leadership page."]),
        "Uncertainties: [\"No target entity was supplied.\"]",
      ].join("\n"),
      history: [],
      trajectoryRecords: Array.from({ length: 24 }, (_, index) => ({
        turn: index + 1,
        model: "openai/gpt-oss-20b",
        action: "parallel_web_search",
        execution: "success",
        args: { query: "generic research " + index },
        observation: "O".repeat(2_000),
        observedUrls: ["https://example" + index + ".com/source"],
        findings: index === 23 ? [{
          vectorType: "other",
          value: "latest-finding-" + "V".repeat(280),
          personName: "Latest Person " + "P".repeat(90),
          role: "Executive Officer " + "R".repeat(80),
          scope: "candidate",
          sourceUrls: ["https://example23.com/source", "https://independent.example/source"],
          note: "Latest record finding detail ".repeat(30),
        }] : [],
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

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("LATEST TRAJECTORY RECORD");
    expect(prompt).toContain("TURN 24");
    expect(prompt).toContain('"args":{"query":"generic research 23"}');
    expect(prompt).not.toContain('"action":{"type":"string","enum"');
    expect(prompt).not.toContain("APEX MISSION CONTRACT v");
    const availableBrowserProviders = getAvailableBrowserFetchProviders();
    const expectedActions = ["web_search", "parallel_web_search", "parallel_registry_search", "visit", ...(availableBrowserProviders.length ? ["browser_fetch"] : []), "registry_search", "domain_lookup", "done"];
    expect(prompt).toContain("AVAILABLE ACTIONS: " + expectedActions.join(" | ") + ".");
    expect(prompt).not.toContain("footprint_email");
    expect(prompt).not.toContain("footprint_username_maigret");
    expect(prompt).not.toContain("harvest_domain");
    expect(prompt).toContain("VALID PROVIDERS: web_search/parallel_web_search");
    expect(prompt).toMatch(/web_search\/parallel_web_search\s*=\s*serper\s*\|\s*tavily\s*\|\s*exa/);
    expect(prompt).toContain("browser_fetch");
    expect(prompt).toContain("domain_lookup");
    expect(prompt).toContain("visit supports bounded text extraction for text-bearing PDF documents");
    expect(prompt).toContain("browser_fetch is HTML-oriented and does not extract PDF text");
    expect(prompt).toMatch(/search snippets (?:remain leads, not evidence|are leads, not evidence)/i);
    expect(prompt).toMatch(/BOSS ADVISORY DIRECTION \(not a fixed action sequence\):|ACTIVE BOSS SCOPE:/);
    expect(prompt).toContain("MISSION PRIORITY:");
    expect(prompt).toContain("MISSION PRIORITY: objective and targetability outrank conflicting Boss/Right-hand advice.");
    expect(prompt).toContain("avoid Fortune/ranking lists and global-brand leadership without a plausible local owner/operator route hypothesis");
    expect(prompt).toContain("Select a publicly registered company in a defined sector and geography, then identify senior officers from its official leadership page.");
    expect(prompt).toContain("DISCOVERY PROGRESS GATE");
    expect(prompt).toContain("DISCOVERY TARGETABILITY GATE");
    expect(prompt).toContain("People—not companies or executive prestige—are the target");
    expect(prompt).toContain("ownership/equity/control/investment clue");
    expect(prompt).toMatch(/do not infer wealth from seniority alone|never infer wealth from seniority alone|seniority alone is not wealth/i);
    expect(prompt).toContain("an organization is a lead, not");
    expect(prompt).toMatch(/Fortune(?: 500)?\/ranking lists/);
    expect(prompt).toContain("a plausible local owner/operator route hypothesis");
    expect(prompt).toContain("Honor approved Boss scope");
    expect(prompt).toContain("source class need not appear in every discovery query");
    expect(prompt).toMatch(/Fortune(?: 500)?\/ranking lists/);
    expect(prompt).toContain("No preset targets/queries");
    expect(prompt).toMatch(/(?:News publishers and articles are evidence leads only|Publisher articles are evidence leads, never targets or access routes|Press articles (?:and third-party profiles are leads|are leads), not targets or access routes|Press\/profile pages are leads, not targets\/access routes)/);
    expect(prompt).toContain("Never use placeholders such as CompanyName, companywebsite.com, or example.com.");
    expect(prompt).toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    // The emergency prompt may omit the verbose JSON example to stay within the provider ceiling;
    // the compact field-level finding contract remains mandatory and testable.
    expect(prompt).toContain("Each finding needs vectorType/value/personName/role/scope/sourceUrls/note/promotionDecision/promotionReason.");
    expect(prompt).toContain("third-party people-search/profile-directory aggregators are leads only");
    expect(prompt).toContain("Official company leadership/staff pages and official filing/registry pages are acceptable");
    expect(prompt).toContain("one successfully fetched claim-grade source");
    expect(prompt).toContain("Target-scoped research owns independent corroboration, falsification, and contact-route verification before any HNWI/contact conclusion");
    expect(prompt).toContain("Target-stage research tests material business/asset/exit signals, independently corroborates or falsifies the lead, and verifies direct or indirect routes before any promotion");
    expect(prompt).toContain("CONTACT FACTS (observed, not attributed)");
    expect(prompt).toContain("minEvidence=1; minIndependentSourceUnits=1");
    expect(prompt).toContain("requireFalsification=false");
    expect(prompt).not.toContain("at least one successful external action must explicitly attempt to disprove");
    expect(prompt).toContain("not a prescribed action sequence");
  });

  it("preserves the scope-guard recovery contract in the next Investigator prompt", () => {
    const blockedObservation = "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Midwest family-owned manufacturing businesses, United States Midwest, official state business registries. A new search query must name the pivot subject, geography, and any required source class; follow-up URL/resource actions must be grounded in pivot-aligned source evidence already observed. Rationale, hypothesis, provider, or registry metadata alone does not satisfy scope. Revise the query/resource or ask Boss/Right-hand to approve a new objective. A first aligned search can seed evidence; no outbound request was made.";
    const compacted = compactEmergencyTrajectoryObservation(blockedObservation);
    expect(compacted).toContain("SCOPE GUARD BLOCKED ACTION");
    expect(compacted).toContain("web discovery may search in-scope topic/company terms");
    expect(compacted).toContain("observed aligned URL");
    expect(compacted).toContain("request new scope");
    expect(compacted).not.toContain("pivot_alignment_guard blocked this outbound action");

    const trajectoryRecords: Parameters<typeof buildStepPrompt>[0]["trajectoryRecords"] = Array.from({ length: 18 }, (_, index) => ({
      turn: index + 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      execution: "success",
      args: {
        query: (index % 3 === 0 ? "regional manufacturing "
          : index % 3 === 1 ? "family-owned industrial company " : "industrial registry directory ")
          + "X".repeat(220),
        provider: "serper",
        hypothesis: "Find a public ownership or registry source " + index,
        purpose: "Test the active manufacturing discovery hypothesis " + index,
        expectedInformationGain: 0.6,
      },
      observation: "Search returned leads but no directly fetched claim-grade source. " + "O".repeat(900),
      observedUrls: ["https://example-" + index + ".test/registry/company-directory"],
      findings: [],
      providerFallback: [],
    }));
    trajectoryRecords.push({
      turn: 19,
      model: "openai/gpt-oss-120b",
      action: "visit",
      execution: "blocked" as const,
      args: { url: "https://example.test/private-equity/team" },
      observation: blockedObservation,
      observedUrls: [],
      findings: [],
      providerFallback: [],
    });

    const prompt = buildStepPrompt({
      targetName: "",
      objective: `PRIMARY CASE OBJECTIVE:
Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary routes.
BOSS-DIRECTED RESEARCH QUESTION / PIVOT:
Midwest family-owned manufacturing businesses, United States Midwest, official state business registries.
Choose each next action yourself from the available capabilities and observed evidence.`,
      history: [],
      trajectoryRecords,
      lastObservation: blockedObservation,
      findings: [],
      priorContext: "Durable lead and provenance context. ".repeat(200),
      intelligenceContext: "Bounded research intelligence state. ".repeat(200),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("SCOPE GUARD BLOCKED ACTION");
    expect(prompt).toContain("source class");
    expect(prompt).toContain("OUTPUT CONTRACT:");
    expect(prompt).toContain("ALL REQUIRED TOP-LEVEL FIELDS: action, query, provider");
    expect(prompt).toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    expect(prompt).toContain("one successfully fetched claim-grade source");
    expect(prompt).toContain("Target-scoped research owns independent corroboration, falsification, and contact-route verification before any HNWI/contact conclusion");
    expect(prompt).toContain("Target-stage research tests material business/asset/exit signals, independently corroborates or falsifies the lead, and verifies direct or indirect routes before any promotion");
    // The durable working-context projection may retain raw provenance; the explicit latest-action tail must also carry the compact recovery instruction.
  });

  it("preserves classified scope and source-stage reasons in compact feedback", () => {
    const classified = compactEmergencyTrajectoryObservation(
      "pivot_alignment_guard blocked this outbound action before execution. Scope mismatch dimensions: searches[1] geography, source class. No outbound request was made.",
    );
    expect(classified).toContain("searches[1] geography, source class");

    const ordered = compactEmergencyTrajectoryObservation(
      "pivot_alignment_guard / ordered_source_stage_guard blocked this outbound action before execution. The active direction requires the first source stage before the later source stage. No outbound request was made.",
    );
    expect(ordered).toContain("first source stage");
    expect(ordered).toContain("search-result URLs alone do not complete");

    const filteredBatch = compactEmergencyTrajectoryObservation(
      "SCOPE FILTERED PARALLEL SEARCHES: retained 1 scope-aligned query(s); removed 1 out-of-scope query(s) before any outbound request. Rejected dimensions: searches[1] source class. Rejected queries were not sent.",
    );
    expect(filteredBatch).toContain("rejected queries were not sent");
    expect(filteredBatch).toContain("Use results and observed URLs only from the queries that actually executed");
  });

  it("fits the active Central-European ownership-source pivot and latest blocked action into the hard prompt ceiling", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE:",
      "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes for later target-scoped research. People—not companies or executive prestige—are the target. Prefer private, mid-market, regional and family businesses; their owners/operators/founders/shareholders; investors and private-capital principals; beneficial/controlling owners; and concession, franchise or license holders. Look for public evidence of ownership/equity/investment/control, material business/property assets or a business exit, and a plausible way to approach the person through public professional or business channels. Do not infer wealth from seniority alone. Start from a concrete business/sector/geography, use local-language terms and English when useful, test hypotheses with independent evidence, and pivot after generic or repetitive results. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth-potential basis, and realistic approach route are source-supported. Never invent a person, relationship, wealth fact, contact, or URL.",
      "CURRENT BOSS-DIRECTED RESEARCH QUESTION (scope constraint, not a fixed tool sequence):",
      "Shift focus to mid-market family-owned manufacturers or service firms in neighboring Central-European countries (e.g., Czech Republic, Slovakia) and seek publicly listed ownership filings or local business registries for named principals.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "Choose each next action yourself from the available capabilities and observed evidence."
    ].join("\n");
    const blockedObservation = "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Shift focus to mid-market family-owned manufacturers or service firms in neighboring Central-European countries (e.g., Czech Republic, Slovakia) and seek publicly listed ownership filings or local business registries for named principals. A new search query must name the pivot subject, geography, and any required source class; follow-up URL/resource actions must be grounded in pivot-aligned source evidence already observed. Rationale, hypothesis, provider, or registry metadata alone does not satisfy scope. Revise the query/resource or ask Boss/Right-hand to approve a new objective. A first aligned search can seed evidence; no outbound request was made.";
    const trajectoryRecords: Parameters<typeof buildStepPrompt>[0]["trajectoryRecords"] = [
      {
        turn: 1, model: "openai/gpt-oss-120b", action: "web_search", execution: "success",
        args: { query: "private equity founder mid-market manufacturing Poland", provider: "serper", hypothesis: "Polish private-capital principals may control mid-market manufacturing firms", purpose: "Identify candidate individuals meeting the criteria", expectedInformationGain: 0.6 },
        observation: "Search results returned six leads including an investor directory and general private-equity material; no source-backed named target established.",
        observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland", "https://www.ifc.org/en/pressroom/2024/ifc-investment-to-boost-growth-of-lower-mid-market-firms-in-central-and-eastern-europe"],
        findings: [], providerFallback: [],
      },
      {
        turn: 2, model: "openai/gpt-oss-120b", action: "visit", execution: "success",
        args: { url: "https://revenuebase.ai/companies/mid-market-private-equity-investors/poland" },
        observation: "Third-party vendor list of private-equity firms and aggregate matched-contact counts; no independently corroborated person-level ownership or contact evidence.",
        observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland"],
        findings: [], providerFallback: [],
      },
      {
        turn: 3, model: "openai/gpt-oss-120b", action: "web_search", execution: "success",
        args: { query: "Poland mid-market private equity firms founders list", provider: "serper", hypothesis: "A focused firm list may identify principals for independent verification", purpose: "Find exact founder names and roles", expectedInformationGain: 0.6 },
        observation: "Six broad list/article results; snippets did not name a verified Polish mid-market owner.",
        observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"],
        findings: [], providerFallback: [],
      },
      {
        turn: 4, model: "openai/gpt-oss-120b", action: "visit", execution: "success",
        args: { url: "https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/" },
        observation: "Global private-equity award/ranking article; no hypothesized Polish mid-market founder list found.",
        observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"],
        findings: [], providerFallback: [],
      },
      {
        turn: 5, model: "openai/gpt-oss-120b", action: "web_search", execution: "blocked",
        args: { query: "Czech Republic family-owned manufacturing company owner", provider: "serper", hypothesis: "A public filing may identify a principal behind a family-owned manufacturer", purpose: "Find named principals via the accepted ownership-source pivot", expectedInformationGain: 0.6 },
        observation: blockedObservation,
        observedUrls: [], findings: [], providerFallback: [],
      },
    ];
    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: [],
      trajectoryRecords,
      lastObservation: blockedObservation,
      findings: [],
      priorContext: "Prior source observations and provenance. ".repeat(80),
      intelligenceContext: "Research frontier and unresolved evidence requirements. ".repeat(80),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("Czech Republic");
    expect(prompt).toContain("Slovakia");
    expect(prompt).toContain("ownership filings or local business registries");
    expect(prompt).toContain("SCOPE GUARD BLOCKED ACTION");
    expect(prompt).toContain("VALID PROVIDERS:");
    expect(prompt).toContain("ALL REQUIRED TOP-LEVEL FIELDS:");
    expect(prompt).toContain("one successfully fetched claim-grade source");
    expect(prompt).toContain("Target-scoped research owns independent corroboration, falsification, and contact-route verification before any HNWI/contact conclusion");
    expect(prompt).toContain("Target-stage research tests material business/asset/exit signals, independently corroborates or falsifies the lead, and verifies direct or indirect routes before any promotion");
  });

  it("preserves the sector when emergency compaction sees a source-first registry direction", () => {
    const direction = "Search the Washington State Secretary of State business entity filings for privately held artisan food manufacturers and extract their names. The scope explicitly names geographies (Washington State) and source classes (business entity filings); the broader objective mentions the Pacific Northwest as an example only without changing this direction.";
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n\n");
    const compact = compactEmergencyInvestigatorObjective(objective);
    expect(compact).toContain("artisan food manufacturers");
    expect(compact).toContain("source classes: business entity filings");
    expect(compact).toMatch(/geographies: washington state;/i);
    expect(compact).not.toContain("geographies: washington, oregon");
  });

  it("keeps opening scope separate from appended Boss and Right-hand control notes during compaction", () => {
    const direction = "Search Washington State Secretary of State corporation filings for privately held manufacturing firms with listed owners or officers, focusing on the aerospace components sector.";
    const rawObjective = [
      "PRIMARY OPERATOR OBJECTIVE: Discover under-the-radar people with credible wealth potential and realistic public routes.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "BOSS OPENING CONTROL DIRECTION:",
      "Report: " + "Unverified opening narrative. ".repeat(8),
      "Next directions: " + JSON.stringify(["Investigate private manufacturing firms in Indiana using the Indiana Secretary of State database."]),
      "RIGHT-HAND OPENING REVIEW (advisory):",
      "Decision: Approve the opening direction.",
    ].join("\n");

    const bounded = buildBoundedInvestigatorObjective({ base: rawObjective, maxChars: 1_800 });
    expect(extractBossPivotDirectionForCompactPrompt(bounded)).toBe(direction);

    // Emergency prompt construction must not reinterpret "Washington State
    // Secretary of State" as a source-first phrase and drop the geography after
    // appended control prose makes the scope look long.
    const emergency = compactEmergencyInvestigatorObjective(bounded);
    expect(emergency).toContain("Washington State");
    expect(emergency).toContain("aerospace components");
    expect(emergency).not.toContain("Indiana");
    expect(emergency).not.toContain("Unverified opening narrative");
  });

  it("preserves a complete Dallas–Fort Worth scope in source-first emergency compaction", () => {
    const direction = "Search the Texas Secretary of State business entity database for privately held metal-fabrication manufacturers located in the Dallas-Fort Worth metropolitan area, extracting officer or member names from filing records. The active scope must remain limited to this sector and metro; use public business registry filings to identify owners, not generic social profiles.";
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n\n");

    const compact = compactEmergencyInvestigatorObjective(objective);
    expect(compact).toContain("metal-fabrication manufacturers");
    expect(compact).toMatch(/geographies: .*dallas.*fort worth.*dfw;/i);
    expect(compact).toContain("source classes: database");
    expect(compact).not.toContain("manufacturers located;");
  });

  it("excludes the pursue-unless continuation instruction from accepted pivot scope", () => {
    const direction = "Search for recent renewable-energy private-equity transactions in Vietnam, Thailand, and Indonesia and extract named fund managers or principal investors from transaction announcements or regulatory filings.";
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");

    expect(extractBossPivotDirectionForCompactPrompt(objective)).toBe(direction);
  });

  it("enforces an explicit directory-before-registry dependency until a directory page is actually fetched", () => {
    const stagedObjective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held construction businesses in the Midlands, first sourced from local chamber/industry-association directories, then director/shareholder information from Companies House or another public registry.",
    ].join("\n\n");
    const scopeKey = discoveryPivotScopeKey(stagedObjective);
    expect(scopeKey).not.toBeNull();

    expect(discoveryPivotAlignmentReason(stagedObjective, "web_search", {
      query: "Midlands privately held construction businesses chamber member directory",
      provider: "serper",
    }, [])).toBeNull();

    expect(discoveryPivotAlignmentReason(stagedObjective, "web_search", {
      query: "Midlands private limited construction Companies House director shareholder registry",
      provider: "serper",
    }, [])).toContain("ordered_source_stage_guard");

    expect(discoveryPivotAlignmentReason(stagedObjective, "visit", {
      url: "https://beta.companieshouse.gov.uk/company/04960386",
    }, [])).toContain("ordered_source_stage_guard");

    const failedDirectoryFetch = {
      turn: 1,
      model: "openai/gpt-oss-120b",
      action: "browser_fetch",
      args: { url: "https://midlandschamber.example/members-directory/" },
      pivotScopeKey: scopeKey ?? undefined,
      execution: "error",
      observation: "External fetch failed; no page was observed.",
      observedUrls: [],
      findings: [],
    } as AgenticTrajectoryRecord;
    expect(discoveryPivotAlignmentReason(stagedObjective, "web_search", {
      query: "Midlands private limited construction Companies House director shareholder registry",
      provider: "serper",
    }, [failedDirectoryFetch])).toContain("ordered_source_stage_guard");

    const fetchedDirectoryPage = {
      turn: 2,
      model: "openai/gpt-oss-120b",
      action: "visit",
      args: { url: "https://www.midlandschamber.co.uk/midlands-construction-members-directory/" },
      pivotScopeKey: scopeKey ?? undefined,
      execution: "success",
      observation: "The Midlands chamber member directory lists local construction firms.",
      observedUrls: ["https://www.midlandschamber.co.uk/midlands-construction-members-directory/"],
      findings: [],
    } as AgenticTrajectoryRecord;
    expect(discoveryPivotAlignmentReason(stagedObjective, "web_search", {
      query: "Midlands private limited construction Companies House director shareholder registry",
      provider: "serper",
    }, [fetchedDirectoryPage])).toBeNull();
  });

  it("recognizes filing-document names as valid filing-source language", () => {
    const objective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Search Delaware Division of Corporations filings for privately held renewable-energy firms located in Delaware and identify named principals from public filing records.",
    ].join("\n\n");

    expect(discoveryPivotAlignmentReason(objective, "parallel_web_search", {
      searches: [
        { query: 'Delaware renewable-energy firms "Certificate of Formation"', provider: "serper" },
        { query: 'Delaware renewable-energy firms "Annual Report"', provider: "serper" },
      ],
    }, [])).toBeNull();

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Delaware renewable-energy firms privately held ownership",
      provider: "serper",
    }, [])).toBeNull();
  });

  it("keeps the accepted geography while allowing truly localized topic wording", () => {
    const objective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Search the Texas Secretary of State business entity database for privately held metal-fabrication manufacturers located in the Dallas-Fort Worth metropolitan area, extracting officer or member names from filing records.",
    ].join("\n\n");

    for (const query of [
      "Dallas private metal fabrication manufacturer database",
      "Fort Worth private metal fabrication manufacturer database",
      "DFW private metal fabrication manufacturer database",
    ]) {
      expect(discoveryPivotAlignmentReason(objective, "web_search", {
        query, provider: "serper",
      }, [])).toBeNull();
    }

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Austin private metal fabrication manufacturer database",
      provider: "serper",
    }, [])).not.toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Власник приватного виробника металевих конструкцій Austin",
      provider: "serper",
    }, [])).not.toBeNull();
  });

  it("never lexically vetoes native-script queries against an English Boss pivot", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Identify private casino operators, concession holders, and beneficial owners associated with Portorož, Slovenia.",
    ].join("\n");
    const searches = [
      { query: "власник казино Порторож акціонери", provider: "serper" },
      { query: "مالك كازينو بورتوروز استثمار", provider: "tavily" },
      { query: "赌场波尔托罗什主要股东", provider: "exa" },
      { query: "カジノ ポルトロシュ 主要株主", provider: "serper" },
      { query: "Casino Portorož lastnik koncesionar Slovenija", provider: "tavily" },
      { query: "Portorož kaszinó tulajdonos koncesszió", provider: "exa" },
      { query: "Portorož kumarhane sahibi imtiyaz işletmecisi", provider: "serper" },
    ];

    for (const search of searches) {
      expect(discoveryPivotAlignmentReason(objective, "web_search", search, []), search.query).toBeNull();
    }
    const partition = partitionParallelWebSearchesByPivotScope(objective, searches, []);
    expect(partition.allowed).toEqual(searches);
    expect(partition.rejected).toEqual([]);
  });

  it("filters only out-of-scope queries from a parallel search batch", () => {
    const objective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Search the Texas Secretary of State business entity database for privately held metal-fabrication manufacturers located in the Dallas-Fort Worth metropolitan area, extracting officer or member names from filing records.",
    ].join("\n\n");
    const searches = [
      { query: "Dallas private metal fabrication manufacturer database", provider: "serper" },
      { query: "Austin private metal fabrication manufacturer database", provider: "serper" },
    ];

    const partition = partitionParallelWebSearchesByPivotScope(objective, searches, []);
    expect(partition.allowed).toEqual([searches[0]]);
    expect(partition.rejected.map((item) => item.search)).toEqual([searches[1]]);
  });

  it("partitions registry searches by jurisdiction while preserving valid local adapters", () => {
    const objective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held mid-market agribusiness companies in the Czech Republic using the ARES-Czechia registry to identify owners/operators.",
    ].join("\n");
    const searches = [
      { query: "Czech Republic privately held mid-market agribusiness companies", registry: "ares-czechia" },
      { query: "Germany privately held mid-market manufacturing firms", registry: "offeneregister-germany" },
    ];

    const partition = partitionParallelRegistrySearchesByPivotScope(objective, searches, []);
    expect(partition.allowed).toEqual([searches[0]]);
    expect(partition.rejected.map((item) => item.search)).toEqual([searches[1]]);
  });

  it("does not infer a source-stage order from ordinary source alternatives", () => {
    const alternativeObjective = [
      "Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held construction businesses in the Midlands using local chamber directories and Companies House public ownership records.",
    ].join("\n\n");
    expect(discoveryPivotAlignmentReason(alternativeObjective, "web_search", {
      query: "Midlands privately held construction businesses Companies House director shareholder registry",
      provider: "serper",
    }, [])).toBeNull();
  });

  it("keeps country queries in scope and rejects unrelated sectors", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search for recent renewable-energy private-equity transactions in Vietnam, Thailand, and Indonesia and extract named fund managers or principal investors from transaction announcements or regulatory filings.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");
    const searches = [
      { query: "Vietnam renewable energy private equity transaction 2023 regulatory filing fund manager", provider: "serper" },
      { query: "Thailand renewable energy private equity deal 2023 transaction announcement principal investor", provider: "serper" },
      { query: "Indonesia renewable energy private equity transaction 2023 filing principal investor", provider: "serper" },
    ];

    expect(discoveryPivotAlignmentReason(objective, "parallel_web_search", { searches }, [])).toBeNull();
    // Topic + geography are sufficient for a web-discovery query. The
    // Investigator may choose a later search that names a specific filing or
    // announcement source; the scope guard must not force a fixed tool sequence.
    expect(discoveryPivotAlignmentReason(objective, "parallel_web_search", {
      searches: searches.map((search, index) => index === 1
        ? { ...search, query: "Thailand renewable energy private equity deal 2023 fund manager" }
        : search),
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Thailand water utility officers licensees",
      provider: "serper",
    }, [])).not.toBeNull();
  });

  it("keeps semantic source and query selection with the Investigator", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search Washington State Secretary of State corporate filings for privately held aerospace-component companies in King County.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Washington State corporation search aerospace component King County",
      provider: "serper",
    }, [])).toBeNull();

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Washington County property assessor records land ownership individual owners",
      provider: "serper",
    }, [])).not.toBeNull();
  });

  it("requires observed URLs while keeping transport URL validation separate", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search Washington State corporate filings for privately held aerospace-component companies in King County.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");
    const scopeKey = discoveryPivotScopeKey(objective);
    expect(scopeKey).not.toBeNull();
    const priorSearch = {
      turn: 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      args: {
        query: "Washington State corporation search aerospace component King County",
        provider: "serper",
      },
      pivotScopeKey: scopeKey ?? undefined,
      execution: "success",
      observation: "Search found a public record lookup lead.",
      observedUrls: [],
      leadUrls: ["https://records.example.org/detail/12345"],
      findings: [],
    } as AgenticTrajectoryRecord;

    expect(discoveryPivotAlignmentReason(objective, "visit", {
      url: "https://records.example.org/detail/12345",
    }, [priorSearch])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "visit", {
      url: "https://guessed.example.org/owners",
    }, [priorSearch])).not.toBeNull();
    expect(validateDiscoverySourceUrl("https://guessed.example.org/owners")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("file:///etc/passwd")).toMatchObject({ allowed: false });
  });

  it("allows a normalized detail URL only when it preserves the identity of an aligned lead", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search Florida Division of Corporations (Sunbiz) for manufacturing companies founded after 2010 to uncover owners/operators with credible wealth potential and public contact routes.",
    ].join("\n");
    const scopeKey = discoveryPivotScopeKey(objective);
    expect(scopeKey).not.toBeNull();
    const priorSearch = {
      turn: 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      args: { query: "manufacturing corporation Florida Sunbiz founded after 2010", provider: "serper" },
      pivotScopeKey: scopeKey ?? undefined,
      execution: "success",
      observation: "Search results include a Florida Sunbiz detail URL for ALUPLATEMANUFACTURING.",
      observedUrls: [],
      leadUrls: [
        "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=EntityName&directionType=Initial&searchNameOrder=ALUPLATEMANUFACTURING+L567080&aggregateId=domp-l56708-43680d1e-3b7e-4391-b29a-d6e3a63868f0&searchTerm=ALUPAC+INTERNACIONAL+LLC&listNameOrder=ALUPACINTERNACIONAL+L230004272830",
      ],
      findings: [],
    } as AgenticTrajectoryRecord;

    const normalizedDetailUrl = "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=EntityName&directionType=Initial&searchNameOrder=ALUPLATEMANUFACTURING+L567080&aggregateId=domp-l56708";
    expect(discoveryPivotAlignmentReason(objective, "visit", {
      url: normalizedDetailUrl,
    }, [priorSearch])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "visit", {
      url: normalizedDetailUrl.replace("ALUPLATEMANUFACTURING+L567080", "UNRELATEDCOMPANY+L999999").replace("domp-l56708", "domp-l999999"),
    }, [priorSearch])).not.toBeNull();
  });

  it("preserves the approved region when choosing model-led searches", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search Midwest state business registry filings for family-owned manufacturing firms in Illinois and Indiana.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: 'Illinois family owned manufacturing company site:ilsos.gov "business entity"',
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Illinois Secretary of State business entity search site:ilsos.gov",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Texas Secretary of State business entity search family-owned manufacturers",
      provider: "serper",
    }, [])).not.toBeNull();
  });

  it("treats the Baltics as an OR-region and accepts local-language subject/geography aliases", () => {
    const balticObjective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held mid-market renewable energy firms in the Baltic states (Estonia, Latvia, Lithuania) and identify registered owners via national business registries.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(balticObjective, "web_search", {
      query: "Estonia business register renewable energy companies",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(balticObjective, "web_search", {
      query: "Germany renewable energy companies",
      provider: "serper",
    }, [])).not.toBeNull();

    const polandObjective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held mid-market renewable energy firms in Poland using KRS or CEIDG to identify registered owners.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(polandObjective, "web_search", {
      query: "Polska odnawialna energia KRS",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(polandObjective, "registry_search", {
      query: "renewable energy",
      registry: "ares-czechia",
    }, [])).not.toBeNull();
  });

  it("accepts Czech and German local-language manufacturing and region names without widening geography", () => {
    const moraviaObjective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Search the Czech ARES registry for shareholders or managing directors of mid-market private manufacturing companies in the Moravia region.",
    ].join("\n");
    for (const query of [
      "výrobní společnost Morava ares",
      "výrobní společnost Jihomoravský kraj ares",
    ]) {
      expect(discoveryPivotAlignmentReason(moraviaObjective, "registry_search", {
        query,
        registry: "ares-czechia",
      }, [])).toBeNull();
    }
    expect(discoveryPivotAlignmentReason(moraviaObjective, "registry_search", {
      query: "výrobní společnost Praha ares",
      registry: "ares-czechia",
    }, [])).not.toBeNull();

    const bavariaObjective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate private mid-market manufacturing firms in Bavaria.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(bavariaObjective, "web_search", {
      query: "Bayern Maschinenbau Firmen",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(bavariaObjective, "web_search", {
      query: "Sachsen Maschinenbau Firmen",
      provider: "serper",
    }, [])).not.toBeNull();
  });

  it("lets a scoped registry adapter supply jurisdiction and source-class context for concise queries", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT: Investigate privately held mid-market agribusiness companies in the Czech Republic using the ARES-Czechia registry to identify owners/operators.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(objective, "registry_search", {
      query: "agribusiness",
      registry: "ares-czechia",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "registry_search", {
      query: "manufacturing",
      registry: "sec-edgar",
    }, [])).not.toBeNull();
  });

  it("preserves native-language scope while blocking repeated out-of-scope actions", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Search Washington and Oregon state water-rights or water-service provider registries (e.g., Washington Department of Ecology water-rights database, Oregon Water Resources Department permits) for private firms, then retrieve named principals or managing partners from corporate filings, LinkedIn, or firm websites.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");
    const observedWaterUtilityQuery = "Washington State Public Utilities Commission water utility licensees list officers";
    const waterAnchors = pivotScopeAnchors(objective);
    expect(waterAnchors).toContain("water");
    expect(waterAnchors.some((anchor) => ["service", "provider", "right", "rights"].includes(anchor))).toBe(true);

    expect(discoveryPivotAlignmentReason(objective, "parallel_web_search", {
      searches: [
        { query: observedWaterUtilityQuery, provider: "serper" },
        { query: "Oregon water rights provider registry permit", provider: "serper" },
      ],
    }, [])).toBeNull();

    const outOfRegionReason = discoveryPivotAlignmentReason(objective, "parallel_web_search", {
      searches: [
        { query: observedWaterUtilityQuery, provider: "serper" },
        { query: "California water utility licensees list officers", provider: "serper" },
      ],
    }, []);
    expect(outOfRegionReason).not.toBeNull();

    const inScopeDiscoveryQuery = discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Washington water utility officers registry",
      provider: "serper",
    }, []);
    expect(inScopeDiscoveryQuery).toBeNull();

    const unobservedUrlReason = discoveryPivotAlignmentReason(objective, "visit", {
      url: "https://example.org/about",
    }, []);
    expect(unobservedUrlReason).not.toBeNull();

    const scopeKey = discoveryPivotScopeKey(objective);
    expect(scopeKey).not.toBeNull();
    const priorBlockedQuery = {
      turn: 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      args: { query: "California water utility licensees list officers", provider: "serper" },
      pivotScopeKey: scopeKey ?? undefined,
      execution: "blocked",
      observation: "pivot_alignment_guard blocked this outbound action. Scope mismatch dimensions: query geography.",
      observedUrls: [],
      findings: [],
    } as AgenticTrajectoryRecord;
    expect(repeatedPivotBlockedActionReason(objective, "web_search", {
      query: "California water utility licensees list officers",
      provider: "serper",
    }, [priorBlockedQuery])).not.toBeNull();
  });

  it("keeps subject-open pivot semantics model-led and preserves only explicit staged-source dependencies", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Shift to a sector-specific, geography-focused discovery approach (e.g., identify private mid-size firms in a chosen region and locate their registered owners via public corporate registries).",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Austin Texas private manufacturing company owners state business registry official Texas Secretary of State business entity search",
      provider: "serper",
    }, [])).toBeNull();

    const inScopeDiscoveryQuery = discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Austin Texas private manufacturing company owners state business registry", provider: "serper",
    }, []);
    expect(inScopeDiscoveryQuery).toBeNull();

    const scopeKey = discoveryPivotScopeKey(objective);
    if (!scopeKey) throw new Error("Expected the pivot source class to define a scope key");
    expect(repeatedPivotBlockedActionReason(objective, "web_search", {
      query: "Austin Texas private manufacturing company owners state business registry", provider: "serper",
    }, [{
      turn: 1, model: "openai/gpt-oss-120b", action: "web_search",
      args: { query: "Austin Texas private manufacturing company owners state business registry", provider: "serper" },
      pivotScopeKey: scopeKey, execution: "blocked",
      observation: "pivot_alignment_guard blocked this outbound action. Scope mismatch dimensions: query source class.",
      observedUrls: [], findings: [],
    } as AgenticTrajectoryRecord])).toBeNull();
  });

  it("preserves the approved regional business-class scope", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Shift focus to privately held service-sector businesses (e.g., regional logistics or specialty construction firms) in Wisconsin or Minnesota, and search state business registries for publicly listed owners/operators.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Wisconsin Secretary of State business entity search regional logistics firms",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Wisconsin regional logistics company ownership public record",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Iowa Secretary of State business entity search regional logistics firms",
      provider: "serper",
    }, [])).not.toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Wisconsin Secretary of State business entity search private equity firms",
      provider: "serper",
    }, [])).not.toBeNull();
  });
  it("preserves model choice across English and native-language region phrasing", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Identify privately held mid-market manufacturing companies in the Midwest US via state Secretary of State business entity search portals.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");

    const midwestAnchors = pivotScopeAnchors(objective);
    expect(midwestAnchors).toContain("manufacturing");
    expect(midwestAnchors).not.toContain("secretary");
    expect(midwestAnchors).not.toContain("portal");
    for (const state of ["Illinois", "Indiana", "Ohio", "Michigan"]) {
      expect(discoveryPivotAlignmentReason(objective, "web_search", {
        query: `${state} Secretary of State business entity search privately held mid-market manufacturing companies`,
        provider: "serper",
      }, [])).toBeNull();
    }
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Midwest US Secretary of State business entity search privately held mid-market manufacturing companies",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Texas Secretary of State business entity search privately held mid-market manufacturing companies",
      provider: "serper",
    }, [])).not.toBeNull();
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Soukromé středně velké kovovýrobní společnosti ve Wisconsin a Minnesota business registry",
      provider: "serper",
    }, [])).toBeNull();
  });

  it("keeps localized matching while enforcing Pacific Northwest subject and geography", () => {
    const equityObjective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Investigate ownership/equity information for Pacific Northwest private-equity funds and identify public fund ownership records.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");

    expect(discoveryPivotAlignmentReason(equityObjective, "web_search", {
      query: "Washington private equity fund managing partner official fund filings",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(equityObjective, "web_search", {
      query: "Portland Oregon private equity fund managing partner public filings",
      provider: "serper",
    }, [])).toBeNull();
    expect(discoveryPivotAlignmentReason(equityObjective, "web_search", {
      query: "New York private equity fund managing partner public filings",
      provider: "serper",
    }, [])).not.toBeNull();
    expect(discoveryPivotAlignmentReason(equityObjective, "web_search", {
      query: "Washington County property assessor records land ownership individual owners",
      provider: "serper",
    }, [])).not.toBeNull();

    const manufacturingObjective = [
      "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Shift focus to privately held Pacific Northwest mid-market firms in specialty manufacturing, renewable energy, or health-tech and public ownership/contact sources.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): none.",
    ].join("\n");
    expect(discoveryPivotAlignmentReason(manufacturingObjective, "web_search", {
      query: 'Seattle privately held mid-market manufacturing company owner site:wa.gov "Business License"',
      provider: "serper",
    }, [])).toBeNull();
  });

  it("fits a long active multi-country pivot and latest blocked action into the emergency prompt ceiling", () => {
    const direction = "Execute a precise web search that explicitly names the pivot subject, geographies (Vietnam, Thailand, Indonesia), and source class (transaction announcements, regulatory filings) – e.g., search for \"renewable energy private equity transaction Vietnam 2023\" and similar queries for Thailand and Indonesia, targeting official registries or reputable news outlets.";
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary routes.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): the approved scope was searched without source-backed findings.",
    ].join("\n");
    const compactScope = compactEmergencyInvestigatorObjective(objective);
    expect(compactScope).toContain("renewable energy private equity transaction");
    expect(compactScope).toContain("geographies: Vietnam, Thailand, Indonesia");
    expect(compactScope).toContain("source classes: transaction announcements, regulatory filings");
    expect(compactScope).not.toContain("Vietnam 2023");

    const blockedObservation = "repeat_pivot_alignment_guard blocked another out-of-scope query/resource after multiple distinct actions were rejected under the current Boss-approved pivot, with no new fetched source evidence.";
    const trajectoryRecords: Parameters<typeof buildStepPrompt>[0]["trajectoryRecords"] = Array.from({ length: 17 }, (_, index) => ({
      turn: index + 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      execution: index === 16 ? "blocked" as const : "success" as const,
      args: {
        query: `renewable energy private equity transaction Vietnam filing ${index} ${"q".repeat(180)}`,
        provider: "serper",
      },
      observation: `${index === 16 ? blockedObservation : "Search returned leads but no verified candidate."}${"o".repeat(700)}`,
      observedUrls: [],
      findings: [],
      providerFallback: [],
    }));
    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: Array.from({ length: 24 }, (_, index) => `Prior model-led action ${index}. ${"h".repeat(180)}`),
      trajectoryRecords,
      lastObservation: blockedObservation,
      findings: [],
      priorContext: "Durable discovery evidence context. ".repeat(400),
      intelligenceContext: "Research frontier and unresolved evidence requirements. ".repeat(400),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toMatch(/(?:ACTIVE BOSS SCOPE:|ACTIVE SCOPE CONSTRAINT:)/);
    expect(prompt).toContain("Vietnam, Thailand, Indonesia");
    expect(prompt).toContain("transaction announcements, regulatory filings");
    expect(prompt).toContain("ALL REQUIRED TOP-LEVEL FIELDS:");
    expect(prompt).toContain("DISCOVERY LEAD HANDOFF CONTRACT");
    expect(prompt).toContain("Target-scoped research owns independent corroboration, falsification, and contact-route verification before any HNWI/contact conclusion");
    expect(prompt).toContain("Target-stage research tests material business/asset/exit signals, independently corroborates or falsifies the lead, and verifies direct or indirect routes before any promotion");
  });

  it("allows directly observed official staff pages while excluding third-party people-search aggregators", async () => {
    const { isClaimGradeDiscoverySourceUrl } = await import("./candidate-source-url-union");
    expect(isClaimGradeDiscoverySourceUrl("https://www.naatp.org/staff")).toBe(true);
    expect(isClaimGradeDiscoverySourceUrl("https://www.zoominfo.com/p/example-person/123")).toBe(false);
    // Source eligibility is not HNWI promotion: only an explicit model-promoted,
    // same-source identity/role plus wealth-potential lead can be materialized.
    // Independent corroboration and the realistic contact route remain target-stage work.
    expect(agenticCoreSource).toContain("one successfully fetched claim-grade source");
    expect(canonicalAtlasDiscoverySource).toContain("durableEvidence: durableSourceCount >= 1");
    expect(canonicalAtlasDiscoverySource).toContain("hasDiscoveryOwnershipLeadSignal");
    expect(canonicalAtlasDiscoverySource).not.toContain("hasRealisticPersonRouteSource");
    expect(canonicalAtlasDiscoverySource).toContain("No candidate has been admitted, so the unused target-stage reserve is released for additional discovery");
    expect(canonicalAtlasDiscoverySource).toContain("No target-scoped research is authorized without a source-backed lead");
  });

  it("keeps discovery query quality heuristics advisory and language-agnostic", () => {
    for (const query of [
      "2023 venture capital investment biotech company CEO",
      "famous casino owners interview",
      "Fortune 500 company leadership page list",
      "2026 acquisition of AI startup by large corporation CEO statement",
    ]) {
      expect(validateDiscoverySearchQuery(query, [])).toMatchObject({ allowed: true });
    }
    expect(validateDiscoverySearchQuery("Acme Holdings beneficial owner official", [])).toMatchObject({ allowed: true });
    expect(validateDiscoverySearchQuery("Companies House director Kenya", [])).toMatchObject({ allowed: true });

    for (const placeholder of [
      "casino owners site:example.com",
      '"Chief Public Relations Officer" site:example.com',
      'search [CompanyName] owner',
      'search {{companyName}} owner',
    ]) {
      expect(validateDiscoverySearchQuery(placeholder, [])).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("placeholder"),
      });
    }
    // English-looking strings are not placeholders merely because they contain
    // old template variable names; the real subject may use any name/domain.
    expect(validateDiscoverySearchQuery("CompanyName Ltd beneficial owner", [])).toMatchObject({ allowed: true });
    expect(validateDiscoverySearchQuery("example.com.au startup owners", [])).toMatchObject({ allowed: true });
    expect(validateDiscoverySearchQuery('site:companywebsite.com "public relations" "Chief"', [])).toMatchObject({ allowed: true });

    const multilingualQueries = [
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
    ];
    for (const query of multilingualQueries) {
      expect(validateDiscoverySearchQuery(query, [])).toMatchObject({ allowed: true });
    }
    for (const broadPublisherQuery of ['site:reuters.com "赌场主要股东"', 'site:reuters.com "مالك الكازينو"']) {
      expect(validateDiscoverySearchQuery(broadPublisherQuery, [])).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("broad press-publisher-only search without an exact named person/business anchor"),
      });
    }
    expect(validateDiscoverySearchQuery('site:reuters.com "Casino Portorož"', [])).toMatchObject({ allowed: true });

    // Canonically equivalent spellings should share repeat-action identity, without transliteration.
    expect(normalizeDiscoverySearchQuery("Cafe\u0301")).toBe(normalizeDiscoverySearchQuery("Café"));
    expect(normalizeDiscoverySearchQuery("КАЗИНО")).toBe("казино");
  });

  it("blocks malformed site filters but keeps generic PR/contact wording advisory", () => {
    for (const query of [
      'site:.org "about us" "leadership" "team"',
      'site:.com "Leadership" "Our Team" "Company"',
      "press contact public relations site:.org",
    ]) {
      expect(validateDiscoverySearchQuery(query, [])).toMatchObject({ allowed: false });
    }
    expect(validateDiscoverySearchQuery("Niri Philadelphia public relations contact", [])).toMatchObject({ allowed: true });
    expect(validateDiscoverySearchQuery("casino Slovenia coast ownership concession operator", [])).toMatchObject({ allowed: true });
    expect(validateDiscoverySearchQuery("Casino Portorož owner contact", [])).toMatchObject({ allowed: true });
  });

  it("blocks repeated discovery searches to the same provider unless a new fetched source advances the case", () => {
    const first = {
      turn: 1, model: "test-model", action: "web_search",
      args: { query: "Casino Portoroz ownership", provider: "serper", locale: "sl", market: "si", hypothesis: "Find ownership", purpose: "Find the owner" },
      execution: "success", observation: "WEB_SEARCH returned two leads", observedUrls: ["https://search.example/1"], findings: [], providerFallback: [],
    } as Parameters<typeof repeatedDiscoverySearchReason>[1][number];
    expect(repeatedDiscoverySearchReason({ query: "  casino   portoroz OWNERSHIP ", provider: "serper", locale: "sl", market: "si" }, [first])).toContain("repeat_action_guard blocked repeated discovery search");
    expect(repeatedDiscoverySearchReason({ query: "Casino Portoroz ownership", provider: "exa", locale: "sl", market: "si" }, [first])).toBeNull();
    const failedFetch = {
      turn: 2, model: "test-model", action: "visit", args: { url: "https://casino.example/ownership" },
      execution: "error", observation: "failureDomain=external_page_fetch browser_fetch failed", observedUrls: [], findings: [], providerFallback: [],
    } as Parameters<typeof repeatedDiscoverySearchReason>[1][number];
    expect(repeatedDiscoverySearchReason({ query: "Casino Portoroz ownership", provider: "serper", locale: "sl", market: "si" }, [first, failedFetch])).toContain("repeat_action_guard");
    const newSource = {
      turn: 3, model: "test-model", action: "visit", args: { url: "https://casino.example/ownership" },
      execution: "success", observation: "Ownership page says the casino is operated by a local concession holder.", observedUrls: ["https://casino.example/ownership"], findings: [], providerFallback: [],
    } as Parameters<typeof repeatedDiscoverySearchReason>[1][number];
    expect(repeatedDiscoverySearchReason({ query: "Casino Portoroz ownership", provider: "serper", locale: "sl", market: "si" }, [first, newSource])).toBeNull();
  });

  it("recognizes an exact request repeated from a batched discovery search", () => {
    const parallel = {
      turn: 1, model: "test-model", action: "parallel_web_search",
      args: { searches: [{ query: "Casino Portoroz ownership", provider: "serper", locale: "sl", market: "si", purpose: "Find the owner" }, { query: "casino Portoroz company registry", provider: "exa", locale: "sl", market: "si", purpose: "Find registry record" }] },
      execution: "success", observation: "parallel search returned leads", observedUrls: ["https://search.example/1"], findings: [], providerFallback: [],
    } as Parameters<typeof repeatedDiscoverySearchReason>[1][number];
    expect(repeatedDiscoverySearchReason({ query: "Casino Portoroz ownership", provider: "serper", locale: "sl", market: "si" }, [parallel])).toContain("repeat_action_guard");
  });
  it("leaves title, wealth, sector, ownership and global-brand intent to the Investigator", () => {
    for (const query of [
      "Enterprise Mobility leadership team",
      "Casino Portorož management team",
      "Enterprise Mobility family ownership principal",
      "Casino Portorož owner/operator Slovenia",
      "Casino Portorož lastnik koncesionar Slovenija",
      "Coca-Cola Company executive leadership page official site",
      "Fortune 500 Coca-Cola leadership executive page official site",
      "Coca-Cola Slovenia independent bottler owner contact",
      "Casino Portorož beneficial owner concession holder Slovenia",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
    ]) {
      expect(validateDiscoverySearchQuery(query, [])).toMatchObject({ allowed: true });
    }
  });

  it("keeps source fetch preflight language-neutral and leaves semantic judgment to the model", () => {
    expect(validateDiscoverySourceUrl("https://www.coca-colacompany.com/about")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("https://www.coca-colacompany.com/about-us/leadership")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("https://fortune.com/ranking/fortune500/")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("https://www.coca-colacompany.com/ueber-uns/vertriebspartner/slowenien")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("https://coca-colacompany.com/empresa/distribuidores/portoroz")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("https://casino-portoroz.si/about/ownership")).toEqual({ allowed: true });
    expect(validateDiscoverySourceUrl("file:///etc/passwd")).toMatchObject({ allowed: false });
    expect(agenticCoreSource).toContain("Do not infer source relevance from");
    expect(agenticCoreSource).toContain("Candidate admission and terminal evidence gates remain responsible for quality");
  });

  it("validates hostname syntax without restricting language, TLD, or company identity", () => {
    expect(validateDiscoveryDomainLookup("amazon.com")).toMatchObject({ allowed: true });
    expect(validateDiscoveryDomainLookup("coca-colacompany.com")).toMatchObject({ allowed: true });
    expect(validateDiscoveryDomainLookup("cocacolaunited.com")).toMatchObject({ allowed: true });
    expect(validateDiscoveryDomainLookup("例え.テスト")).toMatchObject({ allowed: true });
    expect(validateDiscoveryDomainLookup("companyname.com")).toMatchObject({ allowed: true });
    expect(validateDiscoveryDomainLookup("example.com")).toMatchObject({ allowed: false });
    expect(validateDiscoveryDomainLookup("https://casino-portoroz.si/ownership")).toMatchObject({ allowed: false });
    expect(validateDiscoveryDomainLookup("casino-portoroz.si/path")).toMatchObject({ allowed: false });
    expect(validateDiscoveryDomainLookup("not a hostname")).toMatchObject({ allowed: false });

    const domainStart = agenticCoreSource.indexOf('if (action.action === "domain_lookup") {');
    const registryStart = agenticCoreSource.indexOf('if (action.action === "registry_search") {', domainStart);
    const domainDispatch = agenticCoreSource.slice(domainStart, registryStart);
    expect(domainDispatch.indexOf("validateDiscoveryDomainLookup(action.domain, searchQueriesUsed)")).toBeGreaterThan(-1);
    expect(domainDispatch.indexOf("validateDiscoveryDomainLookup(action.domain, searchQueriesUsed)")).toBeLessThan(domainDispatch.indexOf('lookupDomainSurface(action.domain'));

    const footprintStart = agenticCoreSource.indexOf('if (action.action === "footprint_spiderfoot") {', registryStart);
    const registryDispatch = agenticCoreSource.slice(registryStart, footprintStart);
    expect(registryDispatch.indexOf("validateDiscoverySearchQuery(action.query, searchQueriesUsed)")).toBeGreaterThan(-1);
    expect(registryDispatch.indexOf("validateDiscoverySearchQuery(action.query, searchQueriesUsed)")).toBeLessThan(registryDispatch.indexOf("searchRegistry({ query: action.query"));
  });

  it("wires the destination gate before both discovery page-fetch capabilities", () => {
    const visitStart = agenticCoreSource.indexOf('if (action.action === "visit") {');
    const domainLookupStart = agenticCoreSource.indexOf('if (action.action === "domain_lookup") {', visitStart);
    const visitDispatch = agenticCoreSource.slice(visitStart, domainLookupStart);
    const browserStart = agenticCoreSource.indexOf('if (action.action === "browser_fetch") {', visitStart);
    const registryStart = agenticCoreSource.indexOf('if (action.action === "registry_search") {', browserStart);
    const browserDispatch = agenticCoreSource.slice(browserStart, registryStart);
    expect(visitDispatch.indexOf("validateDiscoverySourceUrl(action.url)")).toBeGreaterThan(-1);
    expect(visitDispatch.indexOf("validateDiscoverySourceUrl(action.url)")).toBeLessThan(visitDispatch.indexOf("toolVisit(canonical"));
    expect(browserDispatch.indexOf("validateDiscoverySourceUrl(action.url)")).toBeGreaterThan(-1);
    expect(browserDispatch.indexOf("validateDiscoverySourceUrl(action.url)")).toBeLessThan(browserDispatch.indexOf('import("./browser-fetch")'));
  });

  it("enforces realistic-targetability query validation before single and parallel provider calls", () => {
    const parallelStart = agenticCoreSource.indexOf('if (action.action === "parallel_web_search") {');
    const singleStart = agenticCoreSource.indexOf('if (action.action === "web_search") {', parallelStart);
    const visitStart = agenticCoreSource.indexOf('if (action.action === "visit") {', singleStart);
    const parallelDispatch = agenticCoreSource.slice(parallelStart, singleStart);
    const singleDispatch = agenticCoreSource.slice(singleStart, visitStart);
    expect(parallelDispatch.indexOf("validateDiscoverySearchQuery(search.query, batchQueries)")).toBeGreaterThan(-1);
    expect(parallelDispatch.indexOf("validateDiscoverySearchQuery(search.query, batchQueries)")).toBeLessThan(parallelDispatch.indexOf("toolWebSearch(search.query"));
    expect(parallelDispatch.indexOf("repeatedDiscoverySearchReason(search, previousResearchRecords)")).toBeGreaterThan(-1);
    expect(parallelDispatch.indexOf("repeatedDiscoverySearchReason(search, previousResearchRecords)")).toBeLessThan(parallelDispatch.indexOf("toolWebSearch(search.query"));
    expect(singleDispatch.indexOf("validateDiscoverySearchQuery(action.query, searchQueriesUsed)")).toBeGreaterThan(-1);
    expect(singleDispatch.indexOf("validateDiscoverySearchQuery(action.query, searchQueriesUsed)")).toBeLessThan(singleDispatch.indexOf("toolWebSearch(action.query"));
    expect(singleDispatch.indexOf("repeatedDiscoverySearchReason(action, previousResearchRecords)")).toBeGreaterThan(-1);
    expect(singleDispatch.indexOf("repeatedDiscoverySearchReason(action, previousResearchRecords)")).toBeLessThan(singleDispatch.indexOf("toolWebSearch(action.query"));
  });

  it("counts single registry searches as search-only activity in liveness guidance", () => {
    const records = [
      livenessRecord("registry_search", "success"),
      livenessRecord("registry_search", "success"),
      livenessRecord("registry_search", "success"),
    ];
    const advisory = discoverySearchLivenessAdvisory(records);
    expect(advisory).toContain("Three consecutive successful search actions have occurred");
    expect(advisory).toContain("further searches remain available");

    const afterObservedPage = [...records, livenessRecord("visit", "success")];
    expect(discoverySearchLivenessAdvisory(afterObservedPage)).toBeNull();
  });

  it("keeps lead follow-up advisory and leaves search choice with the Investigator", () => {
    const records = [{
      ...livenessRecord("web_search", "success"),
      leadUrls: ["https://www.ohiosos.gov/business/search"],
      observedUrls: [],
    }];
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "discover source-backed people in Ohio manufacturing",
      history: [],
      trajectoryRecords: records,
      lastObservation: "Search results returned a potentially useful unvisited lead.",
      findings: [],
      mode: "discovery",
    });

    expect(prompt).toContain("LEAD FOLLOW-UP GUIDANCE (non-binding)");
    expect(prompt).toContain("The Investigator retains action choice");
    expect(agenticCoreSource).not.toContain("discoveryLeadFollowUpBackpressureReason");
    expect(agenticCoreSource).not.toContain("discovery_lead_followup_gate");
    expect(agenticCoreSource).not.toContain("DISCOVERY LEAD-UTILIZATION GATE BLOCKED ACTION");
  });

  it("keeps liveness advice advisory and the last-resort prompt under its hard ceiling", () => {
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
    // The final emergency prompt may deliberately discard optional trajectory text to preserve the mandatory action/evidence contract.
    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("OUTPUT CONTRACT: Return exactly ONE root JSON object");
    expect(advisory).not.toContain("must visit");
    expect(advisory).toContain("further searches remain available");
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

  describe("successful page retrieval repeat guard", () => {
    const successfulVisit = {
      ...livenessRecord("visit", "success"),
      turn: 4,
      args: {
        url: "https://example.com/team#leadership",
        hypothesis: "The page names the leadership team.",
        purpose: "Identify an executive.",
      },
      observedUrls: ["https://example.com/team"],
    };

    it("blocks the same normalized URL and capability when the model only changes its rationale", () => {
      const reason = redundantResearchActionReason("visit", {
        url: "https://EXAMPLE.com/team#contact",
        hypothesis: "The page lists an individual's role.",
        purpose: "Extract an exact title for admission.",
      }, [successfulVisit]);

      expect(reason).toContain("repeat_action_guard");
      expect(reason).toContain("Changing purpose or hypothesis alone");
    });

    it("does not treat another fetch capability of the same URL as independent new evidence", () => {
      const sameUrlBrowserFetch = {
        ...livenessRecord("browser_fetch", "success"),
        turn: 5,
        args: { url: "https://example.com/team", provider: "scrapfly" },
        observedUrls: ["https://example.com/team"],
      };
      const reason = redundantResearchActionReason("visit", {
        url: "https://example.com/team",
        hypothesis: "A different person may be listed.",
        purpose: "Extract another candidate.",
      }, [successfulVisit, sameUrlBrowserFetch]);

      expect(reason).toContain("repeat_action_guard");
    });

    it("allows one retry after an unspecified failure and allows revisiting after an independent fetched source", () => {
      const failedVisit = {
        ...livenessRecord("visit", "error"),
        turn: 4,
        args: { url: "https://example.com/team", hypothesis: "h", purpose: "p" },
      };
      expect(redundantResearchActionReason("visit", {
        url: "https://example.com/team", hypothesis: "h2", purpose: "p2",
      }, [failedVisit])).toBeNull();

      const independentVisit = {
        ...livenessRecord("visit", "success"),
        turn: 5,
        args: { url: "https://example.com/board", hypothesis: "h", purpose: "p" },
        observedUrls: ["https://example.com/board"],
      };
      expect(redundantResearchActionReason("visit", {
        url: "https://example.com/team", hypothesis: "follow-up", purpose: "verify",
      }, [successfulVisit, independentVisit])).toBeNull();
    });

    it("blocks another request after a non-retryable HTTP failure", () => {
      const failedVisit = {
        ...livenessRecord("visit", "error"),
        turn: 4,
        failureDomain: "external_page_fetch" as const,
        failureKind: "http_error" as const,
        args: { url: "https://example.com/media", hypothesis: "h", purpose: "p" },
      };
      const reason = redundantResearchActionReason("visit", {
        url: "https://example.com/media", hypothesis: "h2", purpose: "p2",
      }, [failedVisit]);
      expect(reason).toContain("non-retryable source failure");
    });

    it("allows one transient retry but blocks repeated transport failures for the same URL/capability", () => {
      const firstFailure = {
        ...livenessRecord("browser_fetch", "error"),
        turn: 4,
        failureDomain: "external_page_fetch" as const,
        failureKind: "request_failure" as const,
        args: { url: "https://example.com/media", provider: "scrapfly", hypothesis: "h", purpose: "p" },
      };
      const secondFailure = { ...firstFailure, turn: 5 };
      const args = { url: "https://example.com/media", provider: "scrapfly", hypothesis: "h2", purpose: "p2" };
      expect(redundantResearchActionReason("browser_fetch", args, [firstFailure])).toBeNull();
      expect(redundantResearchActionReason("browser_fetch", args, [firstFailure, secondFailure])).toContain("repeated transport failures");
    });

    it("keeps provider choice independent for browser fetches", () => {
      const previous = {
        ...livenessRecord("browser_fetch", "success"),
        turn: 4,
        args: { url: "https://example.com/team", provider: "scrapfly" },
        observedUrls: ["https://example.com/team"],
      };
      expect(redundantResearchActionReason("browser_fetch", {
        url: "https://example.com/team", provider: "zenrows",
        hypothesis: "Verify a different rendering.",
        purpose: "Check source visibility.",
      }, [previous])).toBeNull();
    });
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
    expect(prompt).toMatch(/The action shapes below name action-specific values only; they never replace the full required envelope\.|ALL REQUIRED TOP-LEVEL FIELDS: action,|Include every required field: action,/);
    expect(prompt).toMatch(/Return exactly ONE root JSON object|Return one root JSON object/);
    expect(prompt).toMatch(/ALL REQUIRED TOP-LEVEL FIELDS|Required fields: action,query,provider|Include every required field: action,/);
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
    expect(schema?.properties?.action?.enum).toEqual(["web_search", "parallel_web_search", "parallel_registry_search", "visit", ...(availableBrowserProviders.length ? ["browser_fetch"] : []), "registry_search", "domain_lookup", "done"]);
    expect(schema?.properties?.targetType).toEqual({ type: ["string", "null"] });
  });

  it("preserves unfetched search-result leads in compacted Investigator context", () => {
    const context = buildInvestigatorContext({
      targetName: "",
      objective: "Search Midwest state business registries for privately held manufacturers.",
      trajectoryRecords: [
        {
          turn: 1,
          model: "openai/gpt-oss-120b",
          action: "parallel_web_search",
          execution: "success",
          args: {
            searches: [
              { query: "Ohio Secretary of State business entity search", provider: "serper" },
              { query: "Indiana Secretary of State business entity search", provider: "serper" },
            ],
          },
          leadUrls: [
            "https://businesssearch.ohiosos.gov/",
            "https://bsd.sos.in.gov/PublicBusinessSearch",
          ],
          observation: "Search returned official government lookup pages. These URLs are leads, not fetched evidence.",
          observedUrls: [],
          findings: [],
        },
        {
          turn: 2,
          model: "openai/gpt-oss-120b",
          action: "web_search",
          execution: "blocked",
          args: { query: "Texas Secretary of State business entity search" },
          observation: "pivot_alignment_guard blocked the query before outbound execution; no request was made.",
          observedUrls: [],
          findings: [],
        },
      ],
      lastObservation: "The latest action was blocked before outbound execution.",
      findings: [],
      mode: "discovery",
      maxChars: 3_500,
    });

    expect(context).toContain("LEAD_URLS (search results only; not evidence until fetched)");
    expect(context).toContain("https://businesssearch.ohiosos.gov/");
    expect(context).toContain("https://bsd.sos.in.gov/PublicBusinessSearch");
    expect(context).toContain("not evidence");
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


  it("keeps the last successful search's exact lead URLs visible when the newest action is blocked", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary routes.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Identify privately held mid-market manufacturing companies in the Midwest US via state Secretary of State business entity search portals.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n");
    const records: AgenticTrajectoryRecord[] = [
      {
        turn: 16,
        model: "openai/gpt-oss-120b",
        pivotScopeKey: discoveryPivotScopeKey(objective) ?? undefined,
        action: "parallel_web_search",
        execution: "success",
        args: {
          searches: [
            { query: "Ohio Secretary of State business entity search manufacturing companies", provider: "serper" },
            { query: "Indiana Secretary of State business entity search manufacturing companies", provider: "serper" },
          ],
        },
        leadUrls: [
          "https://businesssearch.ohiosos.gov/",
          "https://bsd.sos.in.gov/PublicBusinessSearch",
        ],
        observation: "Search returned official state business entity portals as retrieval leads.",
        observedUrls: [],
        findings: [],
        providerFallback: [],
      },
      {
        turn: 17,
        model: "openai/gpt-oss-120b",
        pivotScopeKey: discoveryPivotScopeKey(objective) ?? undefined,
        action: "web_search",
        execution: "blocked",
        args: { query: "Texas Secretary of State business entity search manufacturing companies", provider: "serper" },
        observation: "pivot_alignment_guard blocked this out-of-scope query before outbound execution; no request was made.",
        observedUrls: [],
        findings: [],
        providerFallback: [],
      },
    ];

    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: [],
      trajectoryRecords: records,
      lastObservation: records[1]!.observation ?? "",
      findings: [],
      priorContext: "Durable discovery context. ".repeat(300),
      intelligenceContext: "Research frontier context. ".repeat(300),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("LATEST TRAJECTORY RECORD — TURN 17");
    expect(prompt).toContain("LAST SUCCESSFUL SEARCH WITH AVAILABLE LEADS");
    expect(prompt).toContain("consider inspecting a promising in-scope lead URL next");
    expect(prompt).toContain("https://businesssearch.ohiosos.gov/");
    expect(prompt).toContain("https://bsd.sos.in.gov/PublicBusinessSearch");
    expect(prompt).toContain("not evidence or a mandated next action");
    expect(prompt).toContain("do not retry the same binary URL through the other fetch action");
    expect(prompt).not.toContain("must visit");
  });

  it("does not carry a successful lead from a superseded Boss pivot as the active follow-up", () => {
    const oldObjective = [
      "PRIMARY CASE OBJECTIVE: Discover people with credible ownership evidence.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Find privately held construction-material suppliers in Ohio via Ohio Secretary of State business filings.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n");
    const activeObjective = [
      "PRIMARY CASE OBJECTIVE: Discover people with credible ownership evidence.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      "Find privately held agricultural-equipment manufacturers in Michigan via Michigan LARA business entity filings.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    ].join("\n");
    const records: AgenticTrajectoryRecord[] = [
      {
        turn: 4,
        model: "openai/gpt-oss-120b",
        pivotScopeKey: discoveryPivotScopeKey(oldObjective) ?? undefined,
        action: "web_search",
        execution: "success",
        args: { query: "Ohio Secretary of State construction material suppliers business filings", provider: "serper" },
        leadUrls: ["https://businesssearch.ohiosos.gov/"],
        observation: "Ohio portal returned as an unfetched lead under the superseded pivot.",
        observedUrls: [],
        findings: [],
        providerFallback: [],
      },
      {
        turn: 5,
        model: "openai/gpt-oss-120b",
        pivotScopeKey: discoveryPivotScopeKey(activeObjective) ?? undefined,
        action: "web_search",
        execution: "blocked",
        args: { query: "Texas agricultural equipment Secretary of State business filings", provider: "serper" },
        observation: "pivot_alignment_guard blocked the query before outbound execution.",
        observedUrls: [],
        findings: [],
        providerFallback: [],
      },
    ];

    const prompt = buildStepPrompt({
      targetName: "",
      objective: activeObjective,
      history: [],
      trajectoryRecords: records,
      lastObservation: records[1]!.observation ?? "",
      findings: [],
      priorContext: "",
      intelligenceContext: "",
      mode: "discovery",
    });

    expect(prompt).not.toContain("LAST SUCCESSFUL SEARCH WITH AVAILABLE LEADS");
    expect(prompt).not.toContain("consider inspecting a promising in-scope lead URL next");
  });

  it("advertises only registry adapters callable in the current runtime", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Research private manufacturing ownership leads using public sources.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "",
      findings: [],
      mode: "discovery",
    });
    expect(prompt).toMatch(/RUNTIME(?:-AVAILABLE)? REGISTRY IDS ONLY/);
    expect(prompt).toContain("sec-edgar");
    expect(prompt).not.toContain("inbiz");
    expect(prompt).toMatch(/never invent an ID based on a jurisdiction or agency name|Never invent an adapter ID/i);
    expect(prompt).toMatch(/Do not assume records expose owners, shareholders, members, or managers|verify data fields rather than assuming ownership disclosure/);
  });

  it("keeps a final compact Investigator prompt within the ceiling for oversized geographic/source alternatives", () => {
    const states = "Illinois, Indiana, Ohio, Michigan, Wisconsin, Minnesota, Iowa, Missouri, North Dakota, South Dakota, Kansas, Nebraska";
    const sourceClasses = "official Secretary of State business entity search portals, public corporate registration filings, official state registries, corporate filings, government databases, beneficial ownership records, licensee directories, trade association membership lists, transaction announcements";
    const direction = `Search privately held mid-market manufacturing businesses in geographies (${states}) using source classes (${sourceClasses}) to find attributable owners.`;
    const objective = [
      "PRIMARY CASE OBJECTIVE: Discover under-the-radar people with credible wealth potential and realistic routes.",
      "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
      direction,
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "RECENT PRIOR ACTS (newest last): search actions yielded leads but no fetched claim-grade source.",
    ].join("\n");
    const blockedObservation = "pivot_alignment_guard blocked a later action before outbound execution; this is not evidence that the search avenue is infeasible.";
    const trajectoryRecords: AgenticTrajectoryRecord[] = Array.from({ length: 17 }, (_, index) => ({
      turn: index + 1,
      model: "openai/gpt-oss-120b",
      action: "web_search",
      execution: index === 16 ? "blocked" : "success",
      args: { query: `Midwest private manufacturing ownership filings ${index} ${"q".repeat(160)}`, provider: "serper" },
      leadUrls: index === 15 ? ["https://businesssearch.ohiosos.gov/", "https://bsd.sos.in.gov/PublicBusinessSearch"] : [],
      observation: `${index === 16 ? blockedObservation : "Search returned possible official business entity lookup leads, not evidence."}${"o".repeat(700)}`,
      observedUrls: [],
      findings: [],
      providerFallback: [],
    }));

    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: Array.from({ length: 24 }, (_, index) => `Prior model-led action ${index}. ${"h".repeat(180)}`),
      trajectoryRecords,
      lastObservation: blockedObservation,
      findings: [],
      priorContext: "Durable discovery evidence context. ".repeat(400),
      intelligenceContext: "Research frontier and unresolved evidence requirements. ".repeat(400),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("ACTIVE BOSS SCOPE");
    expect(prompt).toContain("Illinois");
    expect(prompt).toContain("source classes");
    expect(prompt).toContain("OUTPUT CONTRACT:");
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

  it("reports the exact missing/unconfigured registry field for parallel registry actions", () => {
    const registryAction = (registries: unknown[]) => JSON.stringify({
      action: "parallel_registry_search",
      searches: registries.map((registry, index) => ({
        query: `model-registry-query-${index + 1}`,
        provider: null,
        registry,
        locale: null,
        market: null,
        purpose: `compare registry ${index + 1}`,
      })),
      hypothesis: "compare configured public registries for a specific ownership hypothesis",
      purpose: "test the registry action contract",
      expectedInformationGain: 0.5,
    });

    const missing = registryAction([null, "sec-edgar"]);
    const missingFailure = describeAgentActionParseFailure(missing);
    expect(missingFailure).toBe("invalid_action_arguments action=parallel_registry_search searches[0].registry missing");
    expect(parseAgentAction(missing)).toBeNull();
    expect(buildActionParseFailureObservation(missingFailure)).toContain('a supported "registry" ID explicitly selected from the configured choices');

    const unsupported = registryAction(["sec-edgar", "not-a-real-registry"]);
    expect(describeAgentActionParseFailure(unsupported)).toBe("invalid_action_arguments action=parallel_registry_search searches[1].registry unsupported");
    expect(parseAgentAction(unsupported)).toBeNull();

    const valid = registryAction(["sec-edgar", "brreg"]);
    expect(describeAgentActionParseFailure(valid)).toBe("");
    expect(parseAgentAction(valid)).toMatchObject({
      action: "parallel_registry_search",
      searches: [
        { query: "model-registry-query-1", registry: "sec-edgar" },
        { query: "model-registry-query-2", registry: "brreg" },
      ],
    });
  });

  it("rejects unsupported single-registry IDs before they can reach the registry client", () => {
    const action = (registry: string) => JSON.stringify({
      action: "registry_search",
      query: "Portland specialty food manufacturers",
      provider: null,
      url: null,
      email: null,
      username: null,
      domain: null,
      registry,
      thought: null,
      hypothesis: "A configured registry may disclose company identity and listed ownership clues.",
      purpose: "Find candidate companies for evidence-based person discovery.",
      expectedInformationGain: 0.7,
      locale: null,
      market: null,
      target: null,
      targetType: null,
      profile: null,
      searches: [],
      findings: [],
    });

    for (const id of ["oregon_sos", "or_sos_business_entity", "not-a-real-registry"]) {
      expect(describeAgentActionParseFailure(action(id))).toBe(
        "invalid_action_arguments action=registry_search registry unsupported",
      );
      expect(parseAgentAction(action(id))).toBeNull();
    }

    expect(describeAgentActionParseFailure(action("sec-edgar"))).toBe("");
    expect(parseAgentAction(action("sec-edgar"))).toMatchObject({
      action: "registry_search",
      registry: "sec-edgar",
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

  it("requires an explicit done.findings array but accepts an intentional empty finding set", () => {
    for (const raw of [
      '{"action":"done"}',
      '{"action":"done","findings":null}',
      '{"action":"done","findings":{}}',
    ]) {
      expect(describeAgentActionParseFailure(raw)).toBe("invalid_action_arguments action=done missing=findings");
      expect(parseAgentAction(raw)).toBeNull();
    }

    const abstention = '{"action":"done","findings":[]}';
    expect(describeAgentActionParseFailure(abstention)).toBe("");
    expect(parseAgentAction(abstention)).toMatchObject({ action: "done", findings: [] });
  });

  it("rejects over-limit execution-critical text instead of silently executing a truncated action", () => {
    const longQuery = JSON.stringify({
      action: "web_search",
      query: "Acme " + "query ".repeat(60),
      provider: "serper",
      hypothesis: "identify the current executive",
      purpose: "search the named company",
      expectedInformationGain: 0.5,
    });
    expect(describeAgentActionParseFailure(longQuery)).toBe("invalid_action_arguments action=web_search oversized=query");
    expect(parseAgentAction(longQuery)).toBeNull();

    const longUrl = JSON.stringify({
      action: "visit",
      url: "https://example.com/" + "segment".repeat(80),
      hypothesis: "verify the source",
      purpose: "fetch the exact named source",
      expectedInformationGain: 0.5,
    });
    expect(describeAgentActionParseFailure(longUrl)).toBe("invalid_action_arguments action=visit oversized=url");
    expect(parseAgentAction(longUrl)).toBeNull();
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
      args: { url: "https://example.gov/report.pdf" },
      execution: "success",
      observation: "PDF PAGE https://example.gov/report.pdf\nExtracted text:\n[Page 12] Jane Doe is Head of Operations. Public email: jane.doe@example.org.",
      observedUrls: ["https://example.gov/report.pdf"],
      findings: [],
      providerFallback: [],
    } as const;
    const finding = {
      vectorType: "email" as const,
      value: "jane.doe@example.org",
      personName: "Jane Doe",
      role: "Head of Operations",
      scope: "candidate" as const,
      sourceUrls: ["https://example.gov/report.pdf"],
      note: "Public business contact",
    };
    const bound = bindModelFindingsToObservedSources([finding], [priorVisit as unknown as Parameters<typeof bindModelFindingsToObservedSources>[1][number]]);
    expect(bound).toHaveLength(1);
    expect(bound[0]?.sourceRecord.turn).toBe(4);
    expect(bound[0]?.finding.sourceUrls).toEqual(["https://example.gov/report.pdf"]);
    expect(bound[0]?.span.pageNumber).toBe(12);
    expect(bound[0]?.span.text).toContain("jane.doe@example.org");
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

  it("requires a successfully observed source to support a discovery candidate name and role", () => {
    const sourceUrl = "https://www.aryon.security/about";
    const page = {
      turn: 1,
      model: "test-model",
      action: "visit",
      args: { url: sourceUrl },
      execution: "success" as const,
      observation: "Ron Arbel Co-Founder and CEO",
      observedUrls: [sourceUrl],
      findings: [],
      providerFallback: [],
    };
    const finding = {
      vectorType: "other" as const,
      value: "Ron Arbel",
      personName: "Ron Arbel",
      role: "Co-Founder and CEO",
      scope: "candidate" as const,
      sourceUrls: [sourceUrl],
      note: "Official company leadership page directly names the person and role.",
      promotionDecision: "promote" as const,
      promotionReason: "The fetched official page attributes the named role.",
    };
    const terminal = {
      turn: 2,
      model: "test-model",
      action: "done",
      args: {},
      execution: "success" as const,
      observation: "Investigator terminal action",
      observedUrls: [],
      findings: [finding],
      providerFallback: [],
    };

    expect(discoveryTerminalGate([page, terminal])).toEqual({ allowed: true, reason: null });
    expect(discoveryTerminalGate([page, { ...terminal, findings: [{ ...finding, role: "Chief Financial Officer" }] }]).allowed).toBe(false);
    expect(discoveryTerminalGate([page, { ...terminal, findings: [{ ...finding, role: null }] }]).allowed).toBe(false);
    expect(discoveryTerminalGate([page, { ...terminal, findings: [{ ...finding, role: null, promotionDecision: "reject" }] }]).allowed).toBe(true);

    const nameOnlyPage = { ...page, args: { url: "https://www.aryon.security/leadership" }, observedUrls: ["https://www.aryon.security/leadership"], observation: "Ron Arbel" };
    const jointIdentityAndRolePage = { ...page, args: { url: sourceUrl }, observation: "Ron Arbel — Co-Founder and CEO" };
    expect(discoveryTerminalGate([
      nameOnlyPage,
      jointIdentityAndRolePage,
      { ...terminal, findings: [{ ...finding, sourceUrls: ["https://www.aryon.security/leadership", sourceUrl] }] },
    ]).allowed).toBe(false);
  });

  it("accepts done only after the core succeeds and returns an evidence-gated terminal reason", () => {
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(true);
    expect(isAcceptedInvestigatorTerminal({ action: "visit", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(false);
  });

});


describe("Groq Investigator structured-output recovery", () => {
  it("detects explicit truncation separately from generic JSON validation errors", () => {
    expect(isGroqCompletionTruncationMessage(
      "max completion tokens reached before generating a valid document: output was truncated and missing required content; increase max_completion_tokens",
    )).toBe(true);
    expect(isGroqCompletionTruncationMessage("Failed to generate JSON. Please adjust your prompt.")).toBe(false);
    expect(isGroqCompletionTruncationMessage("Invalid API key")).toBe(false);
  });

  it("raises output budget once, without exceeding the bounded ceiling", () => {
    expect(nextGroqInvestigatorCompletionBudget(1024)).toBe(1536);
    expect(nextGroqInvestigatorCompletionBudget(1536)).toBe(2048);
    expect(nextGroqInvestigatorCompletionBudget(2048)).toBeNull();
    expect(nextGroqInvestigatorCompletionBudget(Number.NaN)).toBeNull();
  });

  it("retries explicit truncation with a larger completion budget before changing response format", () => {
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed",
      providerMessage: "max_completion_tokens reached; output was truncated; increase max_completion_tokens",
      responseFormat: "json_schema", completionBudgetRetryUsed: false, currentMaxCompletionTokens: 1024,
    })).toEqual({ action: "increase_completion_budget", nextMaxCompletionTokens: 1536 });
  });

  it("uses JSON-object compatibility for schema mismatch, then one bounded budget increase if that also fails", () => {
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed",
      providerMessage: "Generated JSON does not match the expected schema: missing registry",
      responseFormat: "json_schema", completionBudgetRetryUsed: false, currentMaxCompletionTokens: 1024,
    })).toEqual({ action: "retry_json_object" });
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed",
      providerMessage: "Failed to generate JSON",
      responseFormat: "json_object", completionBudgetRetryUsed: false, currentMaxCompletionTokens: 1024,
    })).toEqual({ action: "increase_completion_budget", nextMaxCompletionTokens: 1536 });
    expect(chooseGroqInvestigatorOutputRecovery({
      status: 400, providerCode: "json_validate_failed",
      providerMessage: "Failed to generate JSON",
      responseFormat: "json_object", completionBudgetRetryUsed: true, currentMaxCompletionTokens: 1536,
    })).toEqual({ action: "fail" });
  });

  it("does not route authentication, quota, or unrelated HTTP errors into JSON recovery", () => {
    for (const failure of [
      { status: 401, providerCode: "invalid_api_key" },
      { status: 429, providerCode: "rate_limit_exceeded" },
      { status: 400, providerCode: "invalid_request_error" },
    ]) {
      expect(chooseGroqInvestigatorOutputRecovery({
        ...failure, providerMessage: "provider failure", responseFormat: "json_schema",
        completionBudgetRetryUsed: false, currentMaxCompletionTokens: 1024,
      })).toEqual({ action: "fail" });
    }
  });
});

describe("PDF prompt capability contract", () => {
  it("directs text-bearing PDFs to visit and keeps browser_fetch HTML-only", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Investigate a source-backed company and identify attributable decision-makers.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "",
      findings: [],
      mode: "discovery",
    });

    expect(prompt).toContain("visit supports bounded text extraction for text-bearing PDF documents");
    expect(prompt).toContain("Scanned/image-only PDFs with no text are marked OCR-required; OCR is not available");
    expect(prompt).toContain("encrypted/password-protected and malformed PDFs are distinct structured extraction failures");
    expect(prompt).toContain("browser_fetch is HTML-oriented and does not extract PDF text; for a PDF URL or response, use visit instead");
    expect(prompt).not.toContain("visit and browser_fetch do not extract text from PDF binaries");
  });
});


describe("Swedish-language pivot alignment", () => {
  const objective = [
    "PRIMARY CASE OBJECTIVE: Find under-the-radar people with credible wealth potential.",
    "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
    "Identify beneficial owners of private manufacturing companies in Stockholm County via Sweden's Bolagsverket corporate filings.",
    "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
    "RECENT PRIOR ACTS (newest last): none.",
  ].join("\n");

  const searches = [
    { query: "Bolagsverket privat tillverkningsföretag Stockholm län årsredovisning PDF", provider: "serper", locale: "sv-SE", market: "SE" },
    { query: 'site:bolagsverket.se "tillverkning" "Stockholms län" "privat"', provider: "tavily", locale: "sv-SE", market: "SE" },
    { query: "Bolagsverket aktieägare privat tillverkningsbolag Stockholm län", provider: "exa", locale: "sv-SE", market: "SE" },
  ];

  it("allows native-language manufacturing and Stockholm County equivalents within the accepted scope", () => {
    for (const search of searches) {
      expect(discoveryPivotAlignmentReason(objective, "web_search", search, [])).toBeNull();
    }
    const partition = partitionParallelWebSearchesByPivotScope(objective, searches, []);
    expect(partition.allowed).toEqual(searches);
    expect(partition.rejected).toEqual([]);
  });

  it("still rejects another sector or an unrelated geography", () => {
    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Bolagsverket aktieägare privat vindkraftbolag Stockholm län årsredovisning",
      provider: "serper",
      locale: "sv-SE",
      market: "SE",
    }, [])).not.toBeNull();

    expect(discoveryPivotAlignmentReason(objective, "web_search", {
      query: "Bolagsverket privat tillverkningsföretag Göteborg län årsredovisning",
      provider: "serper",
      locale: "sv-SE",
      market: "SE",
    }, [])).not.toBeNull();
  });
});


describe("action-level durable review-card checkpoints", () => {
  it("invokes the existing card materializers only after the trajectory event is persisted", () => {
    const durableWrite = bureauAgenticPassSource.indexOf("await persistDiscoveryTrajectory(durableCaseId!,");
    const checkpoint = bureauAgenticPassSource.indexOf("await input.onDiscoveryCheckpoint?.");
    expect(durableWrite).toBeGreaterThanOrEqual(0);
    expect(checkpoint).toBeGreaterThan(durableWrite);
    expect(bureauAgenticPassSource).toContain("findings:record.findings");
    expect(canonicalAtlasDiscoverySource).toContain("onDiscoveryCheckpoint: checkpointDiscoveryFindings");
    expect(canonicalAtlasDiscoverySource).toContain("checkpointCanonicalDiscoveryFindings({");
    expect(canonicalAtlasDiscoverySource).toContain("return await materializeAtlasAdmissions({");
  });

  it("keeps partial-card eligibility tied to fetched, claim-grade, same-case source observations", () => {
    expect(canonicalAtlasDiscoverySource).toContain('observation.executionStatus !== "success"');
    expect(canonicalAtlasDiscoverySource).toContain("isClaimGradeDiscoverySourceUrl(sourceUrl)");
    expect(canonicalAtlasDiscoverySource).toContain("hasDiscoveryOwnershipLeadSignal");
    expect(canonicalAtlasDiscoverySource).toContain('"source-backed-partial-finding"');
    expect(canonicalAtlasDiscoverySource).toContain('stage: "partial_review"');
    expect(canonicalAtlasDiscoverySource).not.toContain('notes: "INVESTIGATOR-ADMITTED REVIEW CANDIDATE');
  });
});


describe("latest fetched source evidence survives emergency Investigator compaction", () => {
  it("keeps a source fact near the end of a long successful page observation", () => {
    const observation = "Fetched official company filing: INTRODUCTORY COVER TEXT. " + "background context ".repeat(180) + "OWNERSHIP FACT SENTINEL: the filing states the transaction involved a majority stake in SAMPLE MANUFACTURING LTD.";
    const compact = compactEmergencyTrajectoryObservation(observation, 700);
    expect(compact.length).toBeLessThanOrEqual(700);
    expect(compact).toContain("Fetched official company filing");
    expect(compact).toContain("OWNERSHIP FACT SENTINEL");
  });

  it("keeps fetched page facts and organization partial-finding instructions in the model prompt", () => {
    const observation = "Fetched official company filing: INTRODUCTORY COVER TEXT. " + "background context ".repeat(180) + "OWNERSHIP FACT SENTINEL: the filing states the transaction involved a majority stake in SAMPLE MANUFACTURING LTD.";
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Discover public-source leads for under-the-radar business owners and operators.",
      history: [],
      trajectoryRecords: [{
        turn: 1, model: "openai/gpt-oss-120b", action: "visit", execution: "success",
        args: { url: "https://www.example.org/filing" }, observation,
        observedUrls: ["https://www.example.org/filing"], findings: [],
      }],
      lastObservation: observation,
      findings: [],
      mode: "discovery",
    });
    expect(prompt).toContain("OWNERSHIP FACT SENTINEL");
    expect(prompt).toContain("After a successful visit/browser_fetch");
    expect(prompt).toContain("sourceUrls=[that fetched URL only]");
  });
});


describe("small emergency observation budgets", () => {
  it("never exceeds a budget too small to fit the middle-omission marker", () => {
    const observation = "a fetched page observation with useful text";
    expect(compactEmergencyTrajectoryObservation(observation, 40)).toBe(observation.slice(0, 40));
  });
});
