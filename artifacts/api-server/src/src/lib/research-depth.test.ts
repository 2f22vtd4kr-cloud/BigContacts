import { describe, expect, it } from "vitest";
import { resolveRemainingDiscoveryIterations } from "./research-depth";

describe("bounded discovery allocation", () => {
  it("preserves the target-research reserve when no candidate has been admitted yet", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 4,
      investigatorIterationsUsed: 4,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(8);

    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 12,
      investigatorIterationsUsed: 12,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: false,
    })).toBe(0);
  });

  it("also respects the remaining global budget after a lead is admitted", () => {
    expect(resolveRemainingDiscoveryIterations({
      totalIterationCeiling: 20,
      discoveryIterationCeiling: 12,
      discoveryIterationsUsed: 8,
      investigatorIterationsUsed: 8,
      targetResearchReserveIterations: 8,
      hasAdmittedCandidates: true,
    })).toBe(4);
  });
});
