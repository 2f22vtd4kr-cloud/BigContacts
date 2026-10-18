import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldContinueAfterInvestigatorParseFailure } from "./agentic-web-research";

const targetWrapperSource = readFileSync(
  resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"),
  "utf8",
);

describe("target wrapper parse-failure routing", () => {
  it("handles parse failure before ordinary Right-hand/Boss oversight", () => {
    const targetLoopStart = targetWrapperSource.indexOf("const MAX_TARGET_ACTION_TURNS");
    const parseFailureBranch = targetWrapperSource.indexOf('if (raw.action === "parse_failure")', targetLoopStart);
    const correctionDecision = targetWrapperSource.indexOf(
      "shouldContinueAfterInvestigatorParseFailure({",
      parseFailureBranch,
    );
    const terminalReturn = targetWrapperSource.indexOf("groundingTrajectoryRecords: [...historyRecords, ...records]", parseFailureBranch);
    const ordinaryOversight = targetWrapperSource.indexOf(
      "const checkpointResult = await applyOversight(normalizedRecord, actionTurn);",
      parseFailureBranch,
    );

    expect(targetLoopStart).toBeGreaterThan(-1);
    expect(parseFailureBranch).toBeGreaterThan(targetLoopStart);
    expect(correctionDecision).toBeGreaterThan(parseFailureBranch);
    expect(terminalReturn).toBeGreaterThan(correctionDecision);
    expect(ordinaryOversight).toBeGreaterThan(terminalReturn);
    expect(targetWrapperSource.slice(parseFailureBranch, ordinaryOversight)).toContain("continue;");
    expect(targetWrapperSource.slice(parseFailureBranch, ordinaryOversight)).toContain("consecutiveActionParseFailures");
    const targetLoop = targetWrapperSource.slice(targetLoopStart);
    expect(targetLoop).toContain("error = actResult.error;");
    expect(targetLoop).not.toContain("error = actResult.error ?? error;");
  });
});

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
