export type EvidenceStatus = "supported" | "review" | "disputed" | "rejected";

export interface EvidenceDecision {
  status: EvidenceStatus;
  rejectionReason: string | null;
}

export function decideEvidence(input: {
  confidence: number;
  sourceName?: string | null;
  conflictReason?: string | null;
  negativeReason?: string | null;
  attributable?: boolean;
}): EvidenceDecision {
  if (input.attributable === false || !input.sourceName?.trim()) {
    return {
      status: "rejected",
      rejectionReason: "No attributable public source was retained for this claim.",
    };
  }
  if (input.conflictReason) {
    return { status: "disputed", rejectionReason: input.conflictReason };
  }
  if (input.negativeReason) {
    return { status: "disputed", rejectionReason: input.negativeReason };
  }
  if (input.confidence >= 0.7) return { status: "supported", rejectionReason: null };
  return {
    status: "review",
    rejectionReason: "Evidence is retained for review but does not meet the support threshold.",
  };
}