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
