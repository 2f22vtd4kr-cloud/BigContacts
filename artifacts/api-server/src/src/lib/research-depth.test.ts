import { describe, expect, it } from "vitest";
import { buildMissionActionBudget, resolveDiscoveryIterationsPerAct, resolveRemainingDiscoveryIterations } from "./research-depth";

describe("bounded discovery allocation", () => {
  it("releases the target-stage reserve while discovery has no admitted candidate", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 4,
      investigatorIterationsUsed: 4,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(16);

    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 12,
      investigatorIterationsUsed: 12,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(8);

    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 20,
      investigatorIterationsUsed: 20,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(0);
  });

  it("activates the protected target-research reserve after a lead is admitted", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 20,
      discoveryIterationsUsed: 8,
      investigatorIterationsUsed: 8,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: true,
    })).toBe(4);

    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 20,
      discoveryIterationsUsed: 12,
      investigatorIterationsUsed: 12,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: true,
    })).toBe(0);

    // Five target-stage actions already consumed half the reserve. Discovery
    // may use the other six iterations allowed by its ceiling, protecting only
    // the three target-stage actions that remain unspent.
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 20,
      discoveryIterationsUsed: 6,
      investigatorIterationsUsed: 11,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: true,
    })).toBe(6);
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

  it("bounds an episode without prescribing which research actions the model chooses", () => {
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 7)).toBe(3);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 2 }, 7)).toBe(2);
    expect(resolveDiscoveryIterationsPerAct({ investigatorIterationsPerAct: 8 }, 0)).toBe(0);
  });
});
