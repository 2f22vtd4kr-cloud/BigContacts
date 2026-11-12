import { describe, expect, it } from "vitest";
import {
  nextResearchCaseEventIteration,
  isInvestigatorAuthoredResearchEvent,
  lockResearchCaseEventAppendStream,
  resolveMonotonicResearchCaseIteration,
} from "./research-case-event-iteration";

describe("research case event iteration high-water", () => {
  it("accepts only Investigator-authored events for discovery card provenance", () => {
    expect(isInvestigatorAuthoredResearchEvent("head_investigator")).toBe(true);
    expect(isInvestigatorAuthoredResearchEvent("groq_boss")).toBe(false);
    expect(isInvestigatorAuthoredResearchEvent("right_hand")).toBe(false);
    expect(isInvestigatorAuthoredResearchEvent("system")).toBe(false);
    expect(isInvestigatorAuthoredResearchEvent(null)).toBe(false);
  });
  it("acquires the per-case append lock through the active transaction", async () => {
    let calls = 0;
    await lockResearchCaseEventAppendStream({ execute: () => { calls += 1; } }, 42);
    expect(calls).toBe(1);
    await expect(lockResearchCaseEventAppendStream({ execute: () => { calls += 1; } }, 0)).rejects.toThrow("positive case ID");
    expect(calls).toBe(1);
  });
  it("clamps an Investigator turn to the durable event high-water mark", () => {
    expect(resolveMonotonicResearchCaseIteration(4, 9)).toBe(9);
  });

  it("preserves a turn number that is already ahead of the event high-water mark", () => {
    expect(resolveMonotonicResearchCaseIteration(12, 8)).toBe(12);
  });

  it("allows observation, claim and promotion events to share one Investigator turn", () => {
    const observation = resolveMonotonicResearchCaseIteration(4, 9);
    const claim = resolveMonotonicResearchCaseIteration(4, observation);
    const promotion = resolveMonotonicResearchCaseIteration(4, claim);
    expect([observation, claim, promotion]).toEqual([9, 9, 9]);
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
