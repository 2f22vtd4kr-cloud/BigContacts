import { describe, expect, it } from "vitest";
import { classifyInvestigatorEpisodeFailure, summarizeAtlasDiscoveryResearchHealth } from "./investigator-episode-health";

describe("canonical Investigator continuation health", () => {
  it("fails closed when the pass wrapper reports an unexpected error with no persisted acts", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "error",
      iterations: 0,
      trajectoryRecords: [],
      stopReason: "PARSE_FAILURE",
    })).toEqual({ code: "investigator_episode_error" });
  });

  it("hands a durably classified terminal PARSE_FAILURE to model-owned Boss control", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "error",
      iterations: 4,
      stopReason: "PARSE_FAILURE",
      trajectoryRecords: [{
        action: "parse_failure",
        execution: "error",
        stopReason: "PARSE_FAILURE",
        failureDomain: "model_action",
        failureKind: "invalid_contract",
      }],
    })).toBeNull();
  });

  it("fails closed when a parse failure is missing its durable terminal classification", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "error",
      iterations: 4,
      stopReason: "PARSE_FAILURE",
      trajectoryRecords: [{
        action: "parse_failure",
        execution: "error",
        failureDomain: "model_action",
        failureKind: "invalid_contract",
      }],
    })).toEqual({ code: "investigator_episode_error" });
  });

  it("does not let an empty nominally completed episode start another Boss control turn", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 0,
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a completed episode that contains only a model-authored done decision", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "done", execution: "success" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a proposed tool action that was selected but never executed", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "web_search", execution: "selected" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a proposed tool action with no execution outcome", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "web_search" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a blocked tool action that never ran", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "visit", execution: "blocked" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("returns to Boss after the exact repeated pivot guard suppresses an out-of-scope retry", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      stopReason: "ITERATION_BUDGET",
      trajectoryRecords: [{
        action: "web_search",
        execution: "blocked",
        observation: "repeat_pivot_alignment_guard blocked an identical out-of-scope query.",
      }],
    })).toBeNull();
  });
  it("returns to Boss when an iteration-budgeted episode contains only distinct pivot-alignment blocks", () => {
    const blocked = [
      "GrowthCap Advisory partner",
      "family-owned business founder technology United Kingdom",
      "family-owned manufacturing company founder Texas",
      "Texas private company founder ranking list",
    ];
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 4,
      stopReason: "ITERATION_BUDGET",
      trajectoryRecords: blocked.map((query) => ({
        action: "web_search",
        execution: "blocked",
        observation: "pivot_alignment_guard blocked this outbound action before execution. Query class: " + query,
      })),
    })).toBeNull();
  });

  it("does not recover a mixed episode merely because one action hit the pivot guard", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 4,
      stopReason: "ITERATION_BUDGET",
      trajectoryRecords: [
        { action: "web_search", execution: "blocked", observation: "pivot_alignment_guard blocked an out-of-scope query." },
        { action: "parse_failure", execution: "error", observation: "Malformed model action contract." },
      ],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("recognizes an executed research tool attempt even when the tool returns an error", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "web_search", execution: "http_error" }],
    })).toBeNull();
  });

  it("accepts a non-empty episode even when the case already has a longer cumulative trajectory", () => {
    // The caller passes only this episode's records. Historical events are not
    // included in this list and cannot suppress or invalidate the new action set.
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 6,
      trajectoryRecords: Array.from({ length: 6 }, (_, index) => ({
        action: index === 5 ? "visit" : "web_search",
        execution: "success",
      })),
    })).toBeNull();
  });

  it("fails closed when an unavailable episode has no local provider-error record", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 1,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_unavailable_without_provider_record" });
  });

  it("keeps explicit provider errors on the existing bounded provider-recovery path", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 1,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [{ action: "investigator_provider_error" }],
    })).toBeNull();
  });

  it("fails closed when unavailable status has no matching provider-error record", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 0,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_unavailable_without_provider_record" });
  });

  it("preserves successful episodes that contain model-selected actions", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 3,
      trajectoryRecords: [
        { action: "web_search", execution: "success" },
        { action: "visit", execution: "success" },
        { action: "done", execution: "success" },
      ],
    })).toBeNull();
  });

  it("does not classify operator cancellation as an Investigator failure", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "cancelled",
      iterations: 0,
      trajectoryRecords: [],
      stopReason: "CANCELLED",
    })).toBeNull();
  });
  it("reports blocks, rejected contracts, rate limits, fetched pages and unfetched leads separately", () => {
    expect(summarizeAtlasDiscoveryResearchHealth([
      { action: "web_search", execution: "blocked", observation: "pivot_alignment_guard blocked query before outbound execution." },
      { action: "parallel_registry_search", execution: "blocked", observation: "Unsupported registry: inbiz" },
      { action: "parse_failure", execution: "error", failureDomain: "model_action", failureKind: "invalid_contract" },
      { action: "investigator_provider_error", execution: "error", failureDomain: "model_provider", failureKind: "provider_rate_limited", observation: "HTTP_429" },
      { action: "visit", execution: "success", observation: "Page title and visible filing fields.", observedUrls: ["https://example.gov/filings", "https://example.gov/a/"] },
      { action: "parallel_web_search", execution: "success", observation: "Two search result URLs.", leadUrls: ["https://example.gov/a", "https://example.gov/b"] },
    ], 1)).toEqual({
      trajectoryRecords: 6,
      blockedActions: 2,
      scopeGuardBlocks: 1,
      unsupportedRegistryActions: 1,
      actionContractFailures: 1,
      providerRateLimitEvents: 1,
      successfulFetchedPages: 1,
      unfetchedSearchLeadUrls: 1,
      admittedCandidates: 1,
    });
  });

});
