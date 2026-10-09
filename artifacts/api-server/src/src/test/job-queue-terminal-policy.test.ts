import { describe, expect, it } from "vitest";
import { canApplyJobPatch, canApplyJobPatchWithoutRedis, classifyJobCreationVerification } from "../lib/job-queue-terminal-policy";

describe("job queue terminal write policy", () => {
  it.each(["done", "failed", "cancelled"])("rejects every late update after %s", (status) => {
    expect(canApplyJobPatch(status)).toBe(false);
  });

  it.each(["queued", "running", "paused", "", null, undefined])("allows updates while status is nonterminal (%s)", (status) => {
    expect(canApplyJobPatch(status)).toBe(true);
  });
});

describe("job queue Redis outage write policy", () => {
  it("allows only explicitly memory-only jobs to update from a local nonterminal snapshot", () => {
    expect(canApplyJobPatchWithoutRedis("running", true)).toBe(true);
    expect(canApplyJobPatchWithoutRedis("queued", false)).toBe(false);
    expect(canApplyJobPatchWithoutRedis(undefined, false)).toBe(false);
  });

  it.each(["done", "failed", "cancelled"])("never updates a terminal memory-only job after Redis recovery or outage (%s)", (status) => {
    expect(canApplyJobPatchWithoutRedis(status, true)).toBe(false);
  });
});


describe("atomic job creation reconciliation", () => {
  it("recognizes only the exact queued record as durable", () => {
    expect(classifyJobCreationVerification("job-1", "atlas-run", {
      jobId: "job-1", type: "atlas-run", status: "queued",
    })).toBe("durable");
  });

  it("distinguishes a confirmed absent record from an unavailable Redis read", () => {
    expect(classifyJobCreationVerification("job-1", "atlas-run", {})).toBe("absent");
    expect(classifyJobCreationVerification("job-1", "atlas-run", null)).toBe("indeterminate");
  });

  it("rejects mismatched, partial, or terminal records as proof of successful creation", () => {
    expect(classifyJobCreationVerification("job-1", "atlas-run", {
      jobId: "job-1", type: "other", status: "queued",
    })).toBe("conflict");
    expect(classifyJobCreationVerification("job-1", "atlas-run", {
      jobId: "job-1", type: "atlas-run", status: "running",
    })).toBe("conflict");
    expect(classifyJobCreationVerification("job-1", "atlas-run", {
      type: "atlas-run", status: "queued",
    })).toBe("conflict");
  });
});
