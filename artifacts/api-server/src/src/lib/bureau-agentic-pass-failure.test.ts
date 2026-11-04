import { describe, expect, it } from "vitest";
import { buildBureauAgenticPassFailureResult, shouldSkipAlreadyFinalizedTrajectory } from "./bureau-agentic-pass-failure";

describe("Bureau agentic pass failure preservation", () => {
  it("retains completed Investigator observations and identifies a failed finalization boundary", () => {
    const prior = {
      turn: 4,
      model: "groq-investigator-1",
      action: "web_search",
      args: { query: "operating companies" },
      execution: "success" as const,
      observation: "Six public search leads were returned.",
      observedUrls: [],
      findings: [],
      providerFallback: [],
    };
    const result = buildBureauAgenticPassFailureResult({
      stage: "trajectory_finalization",
      errorSummary: "Bureau agentic pass failed (Error, messageChars=42 digest=redacted)",
      runId: "run-1",
      caseId: 7,
      agenticResult: {
        model: "groq-investigator-1",
        iterations: 4,
        searches: 1,
        visits: 0,
        findings: [],
        partialFindings: [],
        modelFindings: [],
        trajectory: ["step4: web_search execution=success"],
        trajectoryRecords: [prior],
      },
    });

    expect(result.status).toBe("error");
    expect(result.searches).toBe(1);
    expect(result.trajectoryRecords).toHaveLength(2);
    expect(result.trajectoryRecords[0]).toEqual(prior);
    expect(result.trajectoryRecords[1]).toMatchObject({
      action: "runtime_error",
      turn: 5,
      execution: "error",
      args: { stage: "trajectory_finalization" },
      failureDomain: "persistence_database",
      failureKind: "unexpected_exception",
    });
    expect(result.trajectory).toContain("step5: runtime_error execution=error stage=trajectory_finalization");
    expect(result.caseId).toBe(7);
  });

  it("retains callback-captured trajectory when the wrapper fails before receiving the agentic result", () => {
    const result = buildBureauAgenticPassFailureResult({
      stage: "live_event_delivery",
      errorSummary: "Bureau live event delivery failed (Error, messageChars=20 digest=redacted)",
      runId: "run-2",
      capturedTrajectoryRecords: [{
        turn: 2,
        model: "groq-investigator-1",
        action: "visit",
        args: { url: "https://example.org/" },
        execution: "success",
        observation: "Fetched public page.",
        observedUrls: ["https://example.org/"],
        findings: [],
        providerFallback: [],
      }],
    });

    expect(result.searches).toBe(0);
    expect(result.trajectoryRecords.map((record) => record.action)).toEqual(["visit", "runtime_error"]);
    expect(result.trajectoryRecords[1]).toMatchObject({
      turn: 3,
      failureDomain: "unexpected_programming_error",
      failureKind: "request_failure",
    });
  });
  it("skips an already-finalized replay only when it contains no new trajectory records", () => {
    expect(shouldSkipAlreadyFinalizedTrajectory({ runAlreadyFinalized: true, pendingRecordCount: 0 })).toBe(true);
    expect(shouldSkipAlreadyFinalizedTrajectory({ runAlreadyFinalized: true, pendingRecordCount: 1 })).toBe(false);
    expect(shouldSkipAlreadyFinalizedTrajectory({ runAlreadyFinalized: false, pendingRecordCount: 0 })).toBe(false);
  });

});
