import { describe, expect, it } from "vitest";
import {
  createAdaptiveResearchState,
  selectNextAdaptiveAction,
  type AdaptiveResearchState,
} from "../lib/adaptive-research-director";

function state(overrides: Partial<AdaptiveResearchState> = {}): AdaptiveResearchState {
  return {
    ...createAdaptiveResearchState({
      targetName: "Campione S.p.A.",
      targetType: "Corporation",
      country: "IT",
      context: {
        relatedOrganizations: [],
        candidateDomains: [],
      },
    }),
    ...overrides,
  };
}

describe("adaptive research director action selection", () => {
  it("stops when action budget is exhausted", () => {
    const action = selectNextAdaptiveAction(state({
      completedActions: ["resolve_identity", "official_routes", "follow_person", "complementary_lane"],
      noProgressPasses: 0,
    }), 4);
    expect(action.kind).toBe("stop_review");
  });

  it("stops after a bounded no-progress budget", () => {
    const action = selectNextAdaptiveAction(state({
      identityAssessment: "confirmed",
      completedActions: ["resolve_identity"],
      noProgressPasses: 2,
    }));
    expect(action.kind).toBe("stop_review");
  });

  it("does not script a research ladder when models are absent", () => {
    const action = selectNextAdaptiveAction(state());
    expect(action.kind).toBe("stop_review");
    expect(action.reason.toLowerCase()).toMatch(/stop|rules|budget|progress/);
  });
});
