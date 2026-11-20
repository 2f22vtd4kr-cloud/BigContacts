import { describe, expect, it } from "vitest";
import { resolveDiscoveryIterationCeiling, resolveDiscoveryIterationsPerAct, resolveRemainingDiscoveryIterations } from "../lib/research-depth";


describe("discovery and target research allocation", () => {
  it("reserves one quarter of the technical mission ceiling for target verification", () => {
    expect(resolveDiscoveryIterationCeiling(64)).toBe(48);
    expect(resolveDiscoveryIterationCeiling(20)).toBe(15);
    expect(resolveDiscoveryIterationCeiling(4)).toBe(3);
    expect(resolveDiscoveryIterationCeiling(1)).toBe(1);
    expect(resolveDiscoveryIterationCeiling(0)).toBe(0);
  });
});

describe("shared Investigator technical mission budget", () => {
  it("shares remaining mission capacity between discovery and target research", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      investigatorIterationsUsed: 4,
    })).toBe(16);
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      investigatorIterationsUsed: 12,
    })).toBe(8);
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      investigatorIterationsUsed: 20,
    })).toBe(0);
  });

  it("fails closed for invalid mission counters", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: Number.NaN,
      investigatorIterationsUsed: 2,
    })).toBe(0);
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      investigatorIterationsUsed: -1,
    })).toBe(0);
  });
});

describe("per-episode technical bounds", () => {
  it("bounds each Investigator episode by configured capacity and the six-turn oversight interval", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 20)).toBe(6);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 8)).toBe(6);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 4 }, 12)).toBe(4);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 7)).toBe(6);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 6 }, 0)).toBe(0);
  });
});
