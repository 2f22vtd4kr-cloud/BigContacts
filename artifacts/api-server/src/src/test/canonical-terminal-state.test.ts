import { describe, expect, it } from "vitest";
import { deriveCanonicalTerminalDecision } from "../lib/canonical-terminal-state";

describe("canonical terminal state", () => {
  it("marks the job done only when the durable case is complete", () => {
    expect(deriveCanonicalTerminalDecision({ durableCaseStatus: "complete", locallyCancelled: false })).toEqual({
      jobStatus: "done",
      outcome: "complete",
      caseStatus: "complete",
    });
  });

  it("cannot report success when the durable case is review/unavailable", () => {
    expect(deriveCanonicalTerminalDecision({ durableCaseStatus: "review", locallyCancelled: false })).toEqual({
      jobStatus: "failed",
      outcome: "incomplete",
      caseStatus: "review",
    });
  });

  it("treats durable completion as authoritative even if the worker notices a late cancellation", () => {
    expect(deriveCanonicalTerminalDecision({ durableCaseStatus: "complete", locallyCancelled: true })).toEqual({
      jobStatus: "done",
      outcome: "complete",
      caseStatus: "complete",
    });
  });
});
