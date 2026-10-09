import { describe, expect, it } from "vitest";
import { canApplyJobPatch, canApplyJobPatchWithoutRedis } from "../lib/job-queue-terminal-policy";

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
