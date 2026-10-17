import { describe, expect, it } from "vitest";
import { resolveRemainingDiscoveryIterations } from "./research-depth";

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
