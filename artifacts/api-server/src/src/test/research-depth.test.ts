import { describe, expect, it } from "vitest";
import { resolveDiscoveryIterationsPerAct, resolveRemainingDiscoveryIterations } from "../lib/research-depth";

describe("pivot-aware discovery episode budgeting", () => {
  it("splits the standard discovery allowance so two accepted pivots can still receive Investigator turns", () => {
    // Standard depth reserves 8 of 20 actions for target research, leaving 12
    // discovery actions. A six-action episode consumed all of that after only
    // two acts in the audited run; four-action acts let a second pivot execute.
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 12)).toBe(4);
  });

  it("scales the act cap to fast and deep discovery budgets without exceeding configured caps", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 4 }, 7)).toBe(3);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 19)).toBe(7);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 3 }, 10)).toBe(3);
  });

  it("returns no action allocation when the discovery budget is exhausted", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 0)).toBe(0);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, -1)).toBe(0);
  });
});


describe("model-directed discovery continuation budget", () => {
  const standard = {
    totalIterationCeiling: 20,
    discoveryIterationCeiling: 12,
    discoveryIterationsUsed: 12,
    investigatorIterationsUsed: 12,
    targetResearchReserveIterations: 8,
  };

  it("never releases the target reserve when the discovery allocation is exhausted without a candidate", () => {
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      hasAdmittedCandidates: false,
    })).toBe(0);
  });

  it("preserves the target reserve when there is an admitted candidate to research", () => {
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      hasAdmittedCandidates: true,
    })).toBe(0);
  });

  it("never lets discovery exceed its allocation to consume the global hard ceiling", () => {
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      discoveryIterationsUsed: 16,
      investigatorIterationsUsed: 16,
      hasAdmittedCandidates: false,
    })).toBe(0);
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      discoveryIterationsUsed: 20,
      investigatorIterationsUsed: 20,
      hasAdmittedCandidates: false,
    })).toBe(0);
  });

  it("still protects target capacity while discovery has admitted candidates", () => {
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      discoveryIterationsUsed: 10,
      investigatorIterationsUsed: 10,
      hasAdmittedCandidates: true,
    })).toBe(2);
  });

  it("fails closed for invalid budget values", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: Number.NaN,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 0,
      investigatorIterationsUsed: 0,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(0);
    expect(resolveRemainingDiscoveryIterations({
      ...standard,
      discoveryIterationsUsed: -1,
      investigatorIterationsUsed: 12,
      hasAdmittedCandidates: false,
    })).toBe(0);
  });
});