/**
 * Discovery quality metrics — person-shaped admissions, evidence retention, fame rejects.
 * Pure functions over candidate lists; no invention, no provider calls.
 */


export type DiscoveryCandidateMetricInput = {
  name: string;
  type?: string | null;
  relevance?: string | null;
  reachability?: string | null;
  contactEvidence?: Array<{ value?: string | null }> | null;
};

export type DiscoveryQualityMetrics = {
  total: number;
  personShaped: null;
  withAnyEvidence: number;
  fameRejected: null;
  nonPersonRejected: null;
  approachableMean: null;
  personAdmitRate: null;
  evidenceRate: number;
};

export function computeDiscoveryQualityMetrics(
  candidates: readonly DiscoveryCandidateMetricInput[],
): DiscoveryQualityMetrics {
  const total = candidates.length;
  let withAnyEvidence = 0;
  for (const candidate of candidates) {
    const hasEvidence = (candidate.contactEvidence ?? []).some(
      (item) => typeof item.value === "string" && item.value.trim().length > 0,
    );
    if (hasEvidence) withAnyEvidence += 1;
  }

  return {
    total,
    // Semantic fitness and approachability are deliberately unassessed here.
    personShaped: null,
    withAnyEvidence,
    fameRejected: null,
    nonPersonRejected: null,
    approachableMean: null,
    personAdmitRate: null,
    evidenceRate: total ? Number((withAnyEvidence / total).toFixed(3)) : 0,
  };
}

export type DiscoveryStopReason = "budget_depth_hit" | "evidence_sufficient" | "already_reviewed";

export type DiscoveryStopDecision = {
  stop: boolean;
  reason: DiscoveryStopReason | null;
  detail: string;
  metrics: DiscoveryQualityMetrics;
};

/**
 * Deterministic stop for discovery-adjacent passes (next-pass, re-run discovery, boss review retry).
 * Does not invent contacts — only reads candidate metrics + iteration budget.
 */
export function evaluateDiscoveryStop(input: {
  candidates: readonly DiscoveryCandidateMetricInput[];
  iteration: number;
  maxPasses?: number;
  /** True when Gemini Boss closure already completed successfully. */
  bossReviewCompleted?: boolean;
  /** True when preliminary discovery already produced investigator reports. */
  hasInvestigatorReports?: boolean;
  mode?: "next-pass" | "run-discovery" | "boss-review";
}): DiscoveryStopDecision {
  const metrics = computeDiscoveryQualityMetrics(input.candidates);
  const maxPasses = Math.max(1, input.maxPasses ?? 4);
  const mode = input.mode ?? "next-pass";
  const nextIteration = input.iteration + 1;

  if (mode === "boss-review" && input.bossReviewCompleted) {
    return {
      stop: true,
      reason: "already_reviewed",
      detail: "Boss closure review already completed; retry only after a provider gap, not by default.",
      metrics,
    };
  }

  if (nextIteration > maxPasses) {
    return {
      stop: true,
      reason: "budget_depth_hit",
      detail: `Discovery depth budget exhausted (iteration ${input.iteration}, max ${maxPasses}); surface candidates for human review.`,
      metrics,
    };
  }

  return {
    stop: false,
    reason: null,
    detail: "Continue discovery within budget.",
    metrics,
  };
}
