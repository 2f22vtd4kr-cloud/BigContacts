import { describe, expect, it } from "vitest";
import { buildMissionActionBudget, resolveDiscoveryIterationCeiling, resolveDiscoveryIterationsPerAct, resolveOpeningInvestigatorIterations, resolveRemainingDiscoveryIterations } from "./research-depth";


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
  it("keeps discovery and target research on the same remaining global action counter", () => {
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
  it("uses the configured per-act ceiling without reserving a fixed number of opening turns", () => {
    expect(resolveOpeningInvestigatorIterations({ investigatorIterationsPerAct: 6 }, 20)).toBe(6);
    expect(resolveOpeningInvestigatorIterations({ investigatorIterationsPerAct: 6 }, 8)).toBe(6);
    expect(resolveOpeningInvestigatorIterations({ investigatorIterationsPerAct: 4 }, 12)).toBe(4);
    expect(resolveOpeningInvestigatorIterations({ investigatorIterationsPerAct: 2 }, 2)).toBe(2);
    expect(resolveOpeningInvestigatorIterations({ investigatorIterationsPerAct: 6 }, 0)).toBe(0);
  });

  it("bounds each episode by its technical per-act limit, not an assumed number of discovery episodes", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 7)).toBe(7);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 2 }, 7)).toBe(2);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 0)).toBe(0);
  });
});

describe("mission versus episode budget semantics", () => {
  it("does not treat a bounded Investigator episode as an exhausted mission", () => {
    expect(buildMissionActionBudget({
      actionsUsed: 4,
      maximumActions: 20,
      maximumActionsPerEpisode: 4,
      episodeStopReason: "ITERATION_BUDGET",
    })).toEqual({
      actionsUsed: 4,
      maximumActions: 20,
      actionsRemaining: 16,
      maximumActionsPerEpisode: 4,
      episodeStopReason: "ITERATION_BUDGET",
      episodeLimitReached: true,
      missionLimitReached: false,
    });
  });

  it("marks the mission exhausted only when the authoritative mission counter reaches its maximum", () => {
    expect(buildMissionActionBudget({
      actionsUsed: 20,
      maximumActions: 20,
      maximumActionsPerEpisode: 4,
      episodeStopReason: null,
    }).missionLimitReached).toBe(true);
  });

  it("sanitizes invalid counters without fabricating remaining mission capacity", () => {
    expect(buildMissionActionBudget({
      actionsUsed: Number.NaN,
      maximumActions: -5,
      maximumActionsPerEpisode: Number.POSITIVE_INFINITY,
      episodeStopReason: "x".repeat(200),
    })).toEqual({
      actionsUsed: 0,
      maximumActions: 0,
      actionsRemaining: 0,
      maximumActionsPerEpisode: 0,
      episodeStopReason: "x".repeat(80),
      episodeLimitReached: false,
      missionLimitReached: true,
    });
  });
});
