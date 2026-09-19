export type CanonicalTerminalDecision = {
  jobStatus: "done" | "failed" | "cancelled";
  outcome: "complete" | "incomplete";
  caseStatus: "complete" | "review" | "unknown";
};

export function deriveCanonicalTerminalDecision(input: {
  durableCaseStatus: string | null | undefined;
  locallyCancelled: boolean;
}): CanonicalTerminalDecision {
  if (input.durableCaseStatus === "complete") {
    return { jobStatus: "done", outcome: "complete", caseStatus: "complete" };
  }
  if (input.locallyCancelled) {
    return {
      jobStatus: "cancelled",
      outcome: "incomplete",
      caseStatus: input.durableCaseStatus === "review" ? "review" : "unknown",
    };
  }
  return {
    jobStatus: "failed",
    outcome: "incomplete",
    caseStatus: input.durableCaseStatus === "review" ? "review" : "unknown",
  };
}
