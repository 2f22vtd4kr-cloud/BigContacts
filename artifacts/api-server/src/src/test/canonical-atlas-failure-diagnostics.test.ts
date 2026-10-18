import { describe, expect, it } from "vitest";
import {
  classifyAtlasScopeGuardObservation,
  classifyCanonicalAtlasFailure,
  classifyInvestigatorProviderError,
  isRecoverableLegacyRightHandOpeningFailure,
  isRecoverableRightHandOpeningFailure,
} from "../lib/canonical-atlas-failure-diagnostics";

describe("Atlas scope-guard diagnostics", () => {
  it("classifies a preflight scope block as a model-action rejection, not a provider failure", () => {
    expect(classifyAtlasScopeGuardObservation("repeat_pivot_alignment_guard blocked the request; no outbound request was made.")).toEqual({
      domain: "model_action",
      kind: "out_of_scope_action",
    });
    expect(classifyAtlasScopeGuardObservation("The search provider returned HTTP 403.")).toBeNull();
  });
});

describe("Investigator quota diagnostics", () => {
  it("keeps daily token quota exhaustion distinct from request-count exhaustion", () => {
    expect(classifyInvestigatorProviderError("upstream_token_quota_exhausted")).toEqual({
      domain: "model_provider",
      kind: "provider_capacity_exhausted",
    });
    expect(classifyInvestigatorProviderError("upstream_quota_exhausted")).toEqual({
      domain: "model_provider",
      kind: "hard_request_quota",
    });
    expect(classifyInvestigatorProviderError("upstream_token_window_wait_exceeded")).toEqual({
      domain: "model_provider",
      kind: "provider_capacity_exhausted",
    });
  });
});

describe("canonical Atlas lease-read diagnostics", () => {
  it("classifies an invalid Right-hand opening contract as a model contract failure", () => {
    expect(classifyCanonicalAtlasFailure({
      stage: "right_hand_opening_review",
      error: new Error("Groq Right-hand returned invalid oversight: Right-hand returned an invalid opening review contract."),
    })).toEqual({ domain: "model_provider", kind: "invalid_contract" });
  });

  it("classifies provider JSON-generation errors as contract failures and keeps the opening boundary recoverable", () => {
    const error = new Error('Groq Right-hand unavailable; failing closed: Groq Right-hand exhausted bounded attempts: [{"httpStatus":400,"providerCode":"json_validate_failed"}]');
    expect(classifyCanonicalAtlasFailure({ stage: "right_hand_opening_review", error })).toEqual({
      domain: "model_provider",
      kind: "invalid_contract",
    });
    expect(isRecoverableRightHandOpeningFailure("right_hand_opening_review", error)).toBe(true);
    expect(isRecoverableRightHandOpeningFailure("investigator_episode", error)).toBe(false);
  });

  it("allows legacy control recovery only for a terminal failed Atlas job at the Right-hand opening stage", () => {
    const legacyFailure = {
      currentAction: "canonical-atlas-failed",
      jobType: "atlas-run",
      jobStatus: "failed",
      jobMessage: "Canonical Atlas discovery failed (stage=right_hand_opening_review; failureDomain=unexpected_programming_error)",
    };
    expect(isRecoverableLegacyRightHandOpeningFailure(legacyFailure)).toBe(true);
    expect(isRecoverableLegacyRightHandOpeningFailure({ ...legacyFailure, jobType: "case-bureau-discovery" })).toBe(false);
    expect(isRecoverableLegacyRightHandOpeningFailure({ ...legacyFailure, jobStatus: "running" })).toBe(false);
    expect(isRecoverableLegacyRightHandOpeningFailure({ ...legacyFailure, jobMessage: "stage=investigator_episode" })).toBe(false);
    expect(isRecoverableLegacyRightHandOpeningFailure({ ...legacyFailure, currentAction: "canonical-atlas-cancelled" })).toBe(false);
  });

  it("labels a transport failure during the authoritative job/lease read as a lease request failure", () => {
    expect(classifyCanonicalAtlasFailure({
      stage: "job_state_or_lease",
      error: new Error("NETWORK_ERROR (Error, messageChars=86 digest=redacted)"),
    })).toEqual({ domain: "lease_job_state", kind: "request_failure" });
  });

  it("labels an explicitly unknown job-state read as unavailable", () => {
    expect(classifyCanonicalAtlasFailure({
      stage: "job_state_or_lease",
      error: new Error("Permanent Redis job-state read failed; job record state is unknown."),
    })).toEqual({ domain: "lease_job_state", kind: "job_state_unavailable" });
  });

  it("labels an exhausted no-action Investigator episode as a model-action outcome", () => {
    expect(classifyCanonicalAtlasFailure({
      stage: "investigator_episode",
      error: new Error("investigator_episode_no_action"),
    })).toEqual({ domain: "model_action", kind: "no_usable_action" });
  });

  it("does not relabel an unrelated exception as a transport failure", () => {
    expect(classifyCanonicalAtlasFailure({
      stage: "job_state_or_lease",
      error: new Error("unexpected local invariant failure"),
    })).toEqual({ domain: "lease_job_state", kind: "unexpected_exception" });
  });
});
