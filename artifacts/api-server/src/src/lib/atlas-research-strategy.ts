/**
 * Apex Atlas research strategy primitives.
 *
 * Deterministic helpers keep portfolio diversity and information-gain arithmetic
 * outside the model while leaving the model free to choose the actual trajectory.
 */

export type TargetPortfolioDimensions = {
  geography: string;
  occupation: string;
  wealthMechanism: string;
  reachability: number;
  sourceDiversity: number;
  uniqueness: number;
  publicFootprint: number;
};

export type ResearchMoveAssessment = {
  expectedInformationGain: number;
  identityDiscrimination: number;
  contactRelevance: number;
  sourceIndependence: number;
  successProbability: number;
  cost: number;
  score: number;
  rationale: string[];
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function assessResearchMove(input: {
  expectedInformationGain: number;
  identityDiscrimination?: number;
  contactRelevance?: number;
  sourceIndependence?: number;
  successProbability?: number;
  cost?: number;
  alreadyUsedSourceFamily?: boolean;
  testsContradiction?: boolean;
}): ResearchMoveAssessment {
  const information = clamp(input.expectedInformationGain);
  const identity = clamp(input.identityDiscrimination ?? information);
  const contact = clamp(input.contactRelevance ?? 0.5);
  const independence = clamp(input.sourceIndependence ?? (input.alreadyUsedSourceFamily ? 0.25 : 0.8));
  const success = clamp(input.successProbability ?? 0.6);
  const cost = clamp(input.cost ?? 0.3);
  const contradictionBonus = input.testsContradiction ? 0.1 : 0;
  const score = clamp(
    ((information * 0.30) +
      (identity * 0.25) +
      (contact * 0.15) +
      (independence * 0.15) +
      (success * 0.15) +
      contradictionBonus) * (1 - cost * 0.35),
  );
  const rationale = [
    independence < 0.4 ? "Prefer a new source family instead of another copy." : "Source family adds independent evidence.",
    identity >= 0.7 ? "Strong identity-discrimination value." : "Identity value is moderate; avoid treating the result as proof alone.",
    input.testsContradiction ? "Move explicitly tests a falsifiable hypothesis." : "Consider a disconfirming move before promotion.",
    cost >= 0.7 ? "High-cost move; require stronger expected value." : "Cost is proportionate to expected research value.",
  ];
  return { expectedInformationGain:information, identityDiscrimination:identity, contactRelevance:contact, sourceIndependence:independence, successProbability:success, cost, score, rationale };
}

export function rankPortfolioCandidate(input: TargetPortfolioDimensions): number {
  return clamp(
    input.reachability * 0.24 +
    input.sourceDiversity * 0.16 +
    input.uniqueness * 0.14 +
    input.publicFootprint * 0.18 +
    clamp(input.occupation.length > 0 ? 0.8 : 0.1) * 0.08 +
    clamp(input.wealthMechanism.length > 0 ? 0.8 : 0.1) * 0.10 +
    clamp(input.geography.length > 0 ? 0.8 : 0.1) * 0.10,
  );
}

export function diversifyPortfolio<T extends TargetPortfolioDimensions>(
  candidates: T[],
  limit: number,
): T[] {
  const max = Math.max(1, Math.floor(limit));
  const chosen: T[] = [];
  const seenGeography = new Set<string>();
  const seenOccupation = new Set<string>();
  const seenWealth = new Set<string>();
  const sorted = [...candidates].sort((a, b) => rankPortfolioCandidate(b) - rankPortfolioCandidate(a));

  for (const candidate of sorted) {
    if (chosen.length >= max) break;
    const geo = candidate.geography.toLowerCase();
    const occ = candidate.occupation.toLowerCase();
    const wealth = candidate.wealthMechanism.toLowerCase();
    const novel = !seenGeography.has(geo) || !seenOccupation.has(occ) || !seenWealth.has(wealth);
    if (novel || chosen.length < Math.min(3, max)) {
      chosen.push(candidate);
      seenGeography.add(geo);
      seenOccupation.add(occ);
      seenWealth.add(wealth);
    }
  }
  return chosen;
}
