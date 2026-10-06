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
