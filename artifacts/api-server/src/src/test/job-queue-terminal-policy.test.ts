import { describe, expect, it } from "vitest";
import { canApplyJobPatch, canApplyJobPatchWithoutRedis, classifyActiveJobLaneStatus, classifyActiveJobRead, classifyJobCreationVerification } from "../lib/job-queue-terminal-policy";

describe("job queue terminal write policy", () => {
  it.each(["done", "failed", "cancelled"])("rejects every late update after %s", (status) => {
    expect(canApplyJobPatch(status)).toBe(false);
  });

  it.each(["queued", "running", "paused"])("allows updates for known nonterminal status %s", (status) => {
    expect(canApplyJobPatch(status)).toBe(true);
  });

  it.each(["", null, undefined, "completed", "mystery"])("rejects updates for missing or unknown status (%s)", (status) => {
    expect(canApplyJobPatch(status)).toBe(false);
  });
});

describe("job queue Redis outage write policy", () => {
  it("allows only explicitly memory-only jobs to update from a local nonterminal snapshot", () => {
    expect(canApplyJobPatchWithoutRedis("running", true)).toBe(true);
    expect(canApplyJobPatchWithoutRedis("queued", false)).toBe(false);
    expect(canApplyJobPatchWithoutRedis(undefined, false)).toBe(false);
    expect(canApplyJobPatchWithoutRedis("completed", true)).toBe(false);
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

describe("active job state read classification", () => {
  it("distinguishes an authoritative idle lane from an unavailable state store", () => {
    expect(classifyActiveJobRead(true, null)).toEqual({ state: "idle", jobId: null });
    expect(classifyActiveJobRead(false, null)).toEqual({ state: "unavailable", jobId: null });
  });

  it("preserves the exact active job ID only after a successful state read", () => {
    expect(classifyActiveJobRead(true, "job-123")).toEqual({ state: "active", jobId: "job-123" });
    expect(classifyActiveJobRead(false, "job-123")).toEqual({ state: "unavailable", jobId: null });
  });
});

describe("active job lane status classification", () => {
  it.each(["queued", "running", "paused"])("keeps nonterminal status %s active", status => {
    expect(classifyActiveJobLaneStatus(status)).toBe("active");
  });

  it.each(["done", "failed", "cancelled"])("recognizes terminal status %s", status => {
    expect(classifyActiveJobLaneStatus(status)).toBe("terminal");
  });

  it.each([undefined, null, "", "completed", "mystery"])("does not misreport unknown status %s as idle", status => {
    expect(classifyActiveJobLaneStatus(status)).toBe("unknown");
  });
});
