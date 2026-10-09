import { describe, expect, it } from "vitest";
import { canApplyJobPatch } from "../lib/job-queue-terminal-policy";

describe("job queue terminal write policy", () => {
  it.each(["done", "failed", "cancelled"])("rejects every late update after %s", (status) => {
    expect(canApplyJobPatch(status)).toBe(false);
  });

  it.each(["queued", "running", "paused", "", null, undefined])("allows updates while status is nonterminal (%s)", (status) => {
    expect(canApplyJobPatch(status)).toBe(true);
  });
});
