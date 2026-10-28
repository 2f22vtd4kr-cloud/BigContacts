import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { groundedFindingsForTrajectory, shouldContinueAfterInvestigatorParseFailure } from "./agentic-web-research";
import { sourceBackedAgenticFindings } from "./bureau-agentic-pass";

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

describe("durable URL inventory continuation passthrough", () => {
  it("preserves the separate durable inventory while rebuilding lossy prior context", () => {
    const inputStart = targetWrapperSource.indexOf("const actInput: RunInput = { ...input");
    const coreCall = targetWrapperSource.indexOf("core.runAgenticWebResearch(actInput)", inputStart);
    expect(inputStart).toBeGreaterThan(-1);
    expect(coreCall).toBeGreaterThan(inputStart);
    const actInput = targetWrapperSource.slice(inputStart, coreCall);
    expect(actInput).toContain("...input");
    expect(actInput).toContain("priorContext: buildContinuationState");
    // The wrapper deliberately changes priorContext; it must not overwrite the
    // separate durableUrlInventory field carried through by ...input.
    expect(actInput).not.toMatch(/durableUrlInventory\\s*:/);
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


describe("search-result organization review leads", () => {
  const lead = {
    vectorType: "other",
    value: "Blackstone Group",
    personName: null,
    role: null,
    scope: "organization",
    sourceUrls: ["https://blackstone.com"],
    note: "LOW-CONFIDENCE REVIEW-ONLY COMPANY LEAD; search_result_lead; exact business-like title returned by the search provider; snippet/title only, underlying page not fetched; no ownership, wealth, person, or contact conclusion.",
  } as const;
  const searchRecord = {
    turn: 1,
    model: "test-model",
    action: "web_search",
    args: { query: "investment firms" },
    leadUrls: ["https://blackstone.com"],
    execution: "success",
    observation: `Blackstone Group
URL: https://blackstone.com
Blackstone Group is an investment manager.`,
    observedUrls: [],
    findings: [lead],
  } as const;

  it("preserves an exact search-result company lead for the review-card checkpoint", () => {
    expect(groundedFindingsForTrajectory([lead], [searchRecord])).toHaveLength(1);
    expect(sourceBackedAgenticFindings([lead], [], [searchRecord])).toHaveLength(1);
  });

  it("does not let an unrelated URL support the search-result lead", () => {
    const mismatched = { ...lead, sourceUrls: ["https://unrelated.example"] };
    expect(groundedFindingsForTrajectory([mismatched], [searchRecord])).toEqual([]);
    expect(sourceBackedAgenticFindings([mismatched], [], [searchRecord])).toEqual([]);
  });

  it("does not let a search snippet promote an ordinary organization claim", () => {
    const ordinaryClaim = {
      ...lead,
      note: "The company was founded by Jane Example.",
      sourceUrls: ["https://blackstone.com"],
    };
    expect(groundedFindingsForTrajectory([ordinaryClaim], [searchRecord])).toEqual([]);
    expect(sourceBackedAgenticFindings([ordinaryClaim], [], [searchRecord])).toEqual([]);
  });
});
