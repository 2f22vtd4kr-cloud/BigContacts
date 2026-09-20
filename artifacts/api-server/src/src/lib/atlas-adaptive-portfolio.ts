/**
 * Apex Atlas adaptive discovery portfolio.
 *
 * Discovery lanes are treated as an online allocation problem, not a fixed
 * popularity list. The allocator preserves explicit diversity floors while
 * exploiting lanes that demonstrate useful evidence yield.
 */

export type DiscoveryLane = {
  id: string;
  geography: string;
  occupation: string;
  wealthMechanism: string;
  sourceKind: string;
};

export type DiscoveryLaneFeedback = {
  laneId: string;
  attempts: number;
  candidates: number;
  admitted: number;
  usefulEvidence: number;
  duplicates: number;
  reachable: number;
  failures: number;
};

export type AdaptiveLaneDecision = DiscoveryLane & {
  score: number;
  exploitation: number;
  novelty: number;
  reliability: number;
  reason: string;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function normalizedRate(numerator: number, denominator: number): number {
  return denominator > 0 ? clamp(numerator / denominator) : 0;
}

/**
 * Bayesian-smoothed utility estimate. A zero-history lane receives a prior rather
 * than being treated as a failure, while noisy high-volume lanes cannot dominate.
 */
export function scoreDiscoveryLane(
  lane: DiscoveryLane,
  feedback: DiscoveryLaneFeedback | undefined,
  covered: { geography: Set<string>; occupation: Set<string>; wealthMechanism: Set<string>; sourceKind: Set<string> },
): AdaptiveLaneDecision {
  const attempts = feedback?.attempts ?? 0;
  const candidates = feedback?.candidates ?? 0;
  const prior = 1;
  const yieldRate = (candidates + prior) / (attempts + 2 * prior);
  const admissionRate = (feedback?.admitted ?? 0 + 1) / (candidates + 2);
  const evidenceRate = (feedback?.usefulEvidence ?? 0 + 1) / (Math.max(1, feedback?.admitted ?? 0) + 2);
  const reachability = (feedback?.reachable ?? 0 + 1) / (Math.max(1, feedback?.admitted ?? 0) + 2);
  const duplicatePenalty = normalizedRate(feedback?.duplicates ?? 0, Math.max(1, candidates));
  const failurePenalty = normalizedRate(feedback?.failures ?? 0, Math.max(1, attempts));

  const novelty =
    (covered.geography.has(lane.geography) ? 0 : 0.30) +
    (covered.occupation.has(lane.occupation) ? 0 : 0.25) +
    (covered.wealthMechanism.has(lane.wealthMechanism) ? 0 : 0.25) +
    (covered.sourceKind.has(lane.sourceKind) ? 0 : 0.20);

  const exploitation = clamp(
    yieldRate * 0.25 +
    admissionRate * 0.20 +
    evidenceRate * 0.25 +
    reachability * 0.20 -
    duplicatePenalty * 0.07 -
    failurePenalty * 0.03,
  );

  const exploration = attempts < 3 ? 0.22 : 0.06;
  const score = clamp(exploitation * 0.68 + novelty * 0.22 + exploration * 0.10);

  return {
    ...lane,
    score,
    exploitation,
    novelty,
    reliability: clamp((yieldRate + evidenceRate + reachability) / 3),
    reason: attempts < 3
      ? "Under-observed lane: preserve exploration while satisfying diversity floors."
      : novelty > 0.5
        ? "Under-covered dimension: exploration is strategically valuable."
        : exploitation > 0.65
          ? "Observed useful yield supports measured exploitation."
          : "Mixed or weak historical yield: retain only when needed for portfolio diversity.",
  };
}

export function allocateDiscoveryPortfolio(
  lanes: readonly DiscoveryLane[],
  feedback: readonly DiscoveryLaneFeedback[],
  limit: number,
): AdaptiveLaneDecision[] {
  const max = Math.max(1, Math.min(Math.floor(limit), lanes.length));
  const byId = new Map(feedback.map((item) => [item.laneId, item]));
  const covered = {
    geography: new Set<string>(),
    occupation: new Set<string>(),
    wealthMechanism: new Set<string>(),
    sourceKind: new Set<string>(),
  };

  const decisions = lanes.map((lane) => scoreDiscoveryLane(lane, byId.get(lane.id), covered));
  const chosen: AdaptiveLaneDecision[] = [];
  const add = (item: AdaptiveLaneDecision) => {
    if (chosen.some((existing) => existing.id === item.id) || chosen.length >= max) return;
    chosen.push(item);
    covered.geography.add(item.geography);
    covered.occupation.add(item.occupation);
    covered.wealthMechanism.add(item.wealthMechanism);
    covered.sourceKind.add(item.sourceKind);
  };

  // First pass: protect diversity floors. This prevents an apparently high-yield
  // lane from collapsing the whole portfolio into one geography/source family.
  for (const dimension of ["geography", "occupation", "wealthMechanism", "sourceKind"] as const) {
    const unseen = decisions
      .filter((item) => !covered[dimension].has(item[dimension]))
      .sort((a, b) => b.score - a.score);
    if (unseen[0]) add(unseen[0]);
  }

  for (const item of [...decisions].sort((a, b) => b.score - a.score)) add(item);
  return chosen.slice(0, max);
}
