export type LatestEvidenceBackedTerminal = "discovery" | "target" | null;

export function deriveLatestEvidenceBackedTerminal(
  kind: "discovery" | "target",
  status: string,
  stopReason?: string,
  resourceLimited = false,
): LatestEvidenceBackedTerminal {
  if (kind === "target") return status === "complete" ? "target" : null;
  return status === "completed" && stopReason === "MODEL_DECIDED_DONE" && !resourceLimited ? "discovery" : null;
}

/**
 * A full Atlas run is complete only after a target-scoped episode completes.
 * Discovery admission is a reviewable lead, not the terminal result of a
 * full research run. The separate discovery-only endpoint has its own gate.
 */
export function isCanonicalAtlasRunEvidenceComplete(
  latestTerminal: LatestEvidenceBackedTerminal,
  researchedTargetEpisodes: number,
): boolean {
  return latestTerminal === "target" && Number.isInteger(researchedTargetEpisodes) && researchedTargetEpisodes > 0;
}

/**
 * A target episode is terminal only when the Investigator and completed control
 * oversight both agree to stop, there is claim-grade evidence, and no local
 * cancellation or resource/deadline fence invalidated the episode.
 */
export function isCanonicalTargetEpisodeComplete(input: {
  investigatorStatus: string | null;
  stopReason: string | null;
  evidenceGraphCount: number;
  oversightStatus: string | null;
  oversightAction: string | null;
  cancelled: boolean;
  resourceLimited: boolean;
  deadlineExceeded: boolean;
}): boolean {
  return input.investigatorStatus === "completed"
    && input.stopReason === "MODEL_DECIDED_DONE"
    && Number.isInteger(input.evidenceGraphCount)
    && input.evidenceGraphCount > 0
    && input.oversightStatus === "completed"
    && input.oversightAction === "stop"
    && !input.cancelled
    && !input.resourceLimited
    && !input.deadlineExceeded;
}
