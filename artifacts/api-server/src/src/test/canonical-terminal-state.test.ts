import { describe, expect, it } from "vitest";
import { deriveCanonicalTerminalDecision } from "../lib/canonical-single-target-runner";

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

  it("cannot convert a local cancellation into a successful completion", () => {
    expect(deriveCanonicalTerminalDecision({ durableCaseStatus: "complete", locallyCancelled: true })).toEqual({
      jobStatus: "cancelled",
      outcome: "incomplete",
      caseStatus: "complete",
    });
  });
});
