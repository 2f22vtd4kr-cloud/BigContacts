import { describe, expect, it } from "vitest";
import { shouldCheckpointResearchEpisode } from "./research-episode-policy";

describe("research episode policy", () => {
  it("does not force oversight after every early action", () => {
    const result = shouldCheckpointResearchEpisode({ actionsSinceCheckpoint: 1, actionExecution: "success", informationGain: 0.6 });
    expect(result.checkpoint).toBe(false);
  });
  it("checkpoints at the bounded episode boundary", () => {
    const result = shouldCheckpointResearchEpisode({ actionsSinceCheckpoint: 5, actionExecution: "success", informationGain: 0.5 });
    expect(result.checkpoint).toBe(true);
    expect(result.reasons).toContain("episode_boundary");
  });
  it("escalates immediately for contradictions and failed actions", () => {
    const result = shouldCheckpointResearchEpisode({ actionsSinceCheckpoint: 1, contradictionCount: 1, actionExecution: "error" });
    expect(result.checkpoint).toBe(true);
    expect(result.reasons).toEqual(expect.arrayContaining(["contradiction", "failed_action"]));
  });
});
