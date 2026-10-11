import { describe, expect, it } from "vitest";
import { classifyInvestigatorEpisodeFailure } from "./investigator-episode-health";

describe("canonical Investigator continuation health", () => {
  it("fails closed when the pass wrapper reports an unexpected error with no persisted acts", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "error",
      iterations: 0,
      trajectoryRecords: [],
      stopReason: "PARSE_FAILURE",
    })).toEqual({ code: "investigator_episode_error" });
  });

  it("does not let an empty nominally completed episode start another Boss control turn", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 0,
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a completed episode that contains only a model-authored done decision", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "done", execution: "success" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a proposed tool action that was selected but never executed", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "web_search", execution: "selected" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("rejects a blocked tool action that never ran", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "visit", execution: "blocked" }],
    })).toEqual({ code: "investigator_episode_no_action" });
  });

  it("recognizes an executed research tool attempt even when the tool returns an error", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 1,
      trajectoryRecords: [{ action: "web_search", execution: "http_error" }],
    })).toBeNull();
  });

  it("accepts a non-empty episode even when the case already has a longer cumulative trajectory", () => {
    // The caller passes only this episode's records. Historical events are not
    // included in this list and cannot suppress or invalidate the new action set.
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 6,
      trajectoryRecords: Array.from({ length: 6 }, (_, index) => ({
        action: index === 5 ? "visit" : "web_search",
      })),
    })).toBeNull();
  });

  it("fails closed when an unavailable episode has no local provider-error record", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 1,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_unavailable_without_provider_record" });
  });

  it("keeps explicit provider errors on the existing bounded provider-recovery path", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 1,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [{ action: "investigator_provider_error" }],
    })).toBeNull();
  });

  it("fails closed when unavailable status has no matching provider-error record", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "unavailable",
      iterations: 0,
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [],
    })).toEqual({ code: "investigator_episode_unavailable_without_provider_record" });
  });

  it("preserves successful episodes that contain model-selected actions", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "completed",
      iterations: 3,
      trajectoryRecords: [
        { action: "web_search", execution: "success" },
        { action: "visit", execution: "success" },
        { action: "done", execution: "success" },
      ],
    })).toBeNull();
  });

  it("does not classify operator cancellation as an Investigator failure", () => {
    expect(classifyInvestigatorEpisodeFailure({
      status: "cancelled",
      iterations: 0,
      trajectoryRecords: [],
      stopReason: "CANCELLED",
    })).toBeNull();
  });
});
