/**
 * Discovery quality metrics — person-shaped admissions, evidence retention, fame rejects.
 * Pure functions over candidate lists; no invention, no provider calls.
 */

import { evaluateTargetFitness, shouldRejectTarget } from "./target-fitness";
import { scoreApproachableCandidate } from "./discovery-intake";

export type DiscoveryCandidateMetricInput = {
  name: string;
  type?: string | null;
  relevance?: string | null;
  reachability?: string | null;
  contactEvidence?: Array<{ value?: string | null }> | null;
};

export type DiscoveryQualityMetrics = {
  total: number;
  personShaped: number;
  withAnyEvidence: number;
  fameRejected: number;
  nonPersonRejected: number;
  approachableMean: number;
  personAdmitRate: number;
  evidenceRate: number;
};

export function computeDiscoveryQualityMetrics(
  candidates: readonly DiscoveryCandidateMetricInput[],
): DiscoveryQualityMetrics {
  const total = candidates.length;
  let personShaped = 0;
  let withAnyEvidence = 0;
  let fameRejected = 0;
  let nonPersonRejected = 0;
  let approachableSum = 0;

  for (const candidate of candidates) {
    const fitness = evaluateTargetFitness({
      name: candidate.name,
      type: candidate.type,
      snippet: `${candidate.relevance ?? ""} ${candidate.reachability ?? ""}`,
      personScoped: true,
    });
    if (fitness.fit === "reject_fame_only") fameRejected += 1;
    if (fitness.fit === "reject_non_person") nonPersonRejected += 1;
    if (fitness.fit === "strong" || fitness.fit === "weak" || fitness.fit === "review") {
      personShaped += 1;
    }
    const hasEvidence = (candidate.contactEvidence ?? []).some(
      (item) => typeof item.value === "string" && item.value.trim().length > 0,
    );
    if (hasEvidence) withAnyEvidence += 1;
    approachableSum += scoreApproachableCandidate({
      name: candidate.name,
      snippet: `${candidate.relevance ?? ""} ${candidate.reachability ?? ""}`,
    });
  }

  return {
    total,
    personShaped,
    withAnyEvidence,
    fameRejected,
    nonPersonRejected,
    approachableMean: total ? Number((approachableSum / total).toFixed(3)) : 0,
    personAdmitRate: total ? Number((personShaped / total).toFixed(3)) : 0,
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

  if (mode === "run-discovery" && input.hasInvestigatorReports && metrics.total >= 3) {
    return {
      stop: true,
      reason: "evidence_sufficient",
      detail: "Preliminary discovery already recorded investigator reports and candidates; use next-pass or human review instead of re-running opening discovery.",
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

  if (
    mode === "next-pass" &&
    metrics.personShaped >= 3 &&
    metrics.withAnyEvidence >= 2 &&
    metrics.evidenceRate >= 0.25
  ) {
    return {
      stop: true,
      reason: "evidence_sufficient",
      detail: "Discovery already retains person-shaped candidates with contact evidence; prefer human review over further verification spend.",
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
