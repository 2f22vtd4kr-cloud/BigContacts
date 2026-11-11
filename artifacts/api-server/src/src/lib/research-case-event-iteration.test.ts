import { describe, expect, it } from "vitest";
import {
  nextResearchCaseEventIteration,
  lockResearchCaseEventAppendStream,
  resolveMonotonicResearchCaseIteration,
} from "./research-case-event-iteration";

describe("research case event iteration high-water", () => {
  it("acquires the per-case append lock through the active transaction", async () => {
    let calls = 0;
    await lockResearchCaseEventAppendStream({ execute: () => { calls += 1; } }, 42);
    expect(calls).toBe(1);
    await expect(lockResearchCaseEventAppendStream({ execute: () => { calls += 1; } }, 0)).rejects.toThrow("positive case ID");
    expect(calls).toBe(1);
  });
  it("preserves existing monotonic turn resolver behavior", () => {
    expect(resolveMonotonicResearchCaseIteration(4, 9)).toBe(9);
  });

  it("advances beyond the durable event ledger when case iteration lags", () => {
    expect(nextResearchCaseEventIteration(4, 9)).toBe(10);
  });

  it("advances beyond case iteration when it exceeds the event ledger", () => {
    expect(nextResearchCaseEventIteration(12, 8)).toBe(13);
  });

  it("strictly orders historical source observations before the current act and control decision", () => {
    const sourceOne = nextResearchCaseEventIteration(1, 9);
    const sourceTwo = nextResearchCaseEventIteration(2, sourceOne);
    const currentAct = nextResearchCaseEventIteration(3, sourceTwo);
    const controlDecision = nextResearchCaseEventIteration(3, currentAct);
    expect([sourceOne, sourceTwo, currentAct, controlDecision]).toEqual([10, 11, 12, 13]);
  });

  it("starts at one for missing or invalid prior counters", () => {
    expect(nextResearchCaseEventIteration(null, undefined)).toBe(1);
    expect(nextResearchCaseEventIteration(Number.NaN, -2)).toBe(1);
    expect(nextResearchCaseEventIteration(3, Number.POSITIVE_INFINITY)).toBe(4);
  });
});
