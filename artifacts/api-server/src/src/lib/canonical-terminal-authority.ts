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
