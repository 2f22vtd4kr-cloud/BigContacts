import { describe, expect, it } from "vitest";
import { classifyCanonicalAtlasFailure } from "../lib/canonical-atlas-failure-diagnostics";

describe("canonical Atlas lease-read diagnostics", () => {
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
