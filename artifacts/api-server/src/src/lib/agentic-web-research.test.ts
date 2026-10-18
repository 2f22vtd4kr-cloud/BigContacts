import { describe, expect, it } from "vitest";
import { shouldContinueAfterInvestigatorParseFailure } from "./agentic-web-research";

describe("bounded Investigator action-parse recovery", () => {
  it("allows one corrective model turn when the action budget remains", () => {
    expect(shouldContinueAfterInvestigatorParseFailure({
      stopReason: "PARSE_FAILURE",
      consecutiveFailures: 1,
      actionTurn: 1,
      maxActionTurns: 6,
    })).toBe(true);
  });

  it("stops after the configured consecutive parse-failure limit", () => {
    expect(shouldContinueAfterInvestigatorParseFailure({
      stopReason: "PARSE_FAILURE",
      consecutiveFailures: 2,
      actionTurn: 2,
      maxActionTurns: 6,
    })).toBe(false);
  });

  it("does not schedule a corrective turn when the action budget is exhausted", () => {
    expect(shouldContinueAfterInvestigatorParseFailure({
      stopReason: "PARSE_FAILURE",
      consecutiveFailures: 1,
      actionTurn: 6,
      maxActionTurns: 6,
    })).toBe(false);
  });

  it("does not treat provider or other failures as parse-recovery requests", () => {
    expect(shouldContinueAfterInvestigatorParseFailure({
      stopReason: "LLM_UNAVAILABLE",
      consecutiveFailures: 1,
      actionTurn: 1,
      maxActionTurns: 6,
    })).toBe(false);
  });
});
