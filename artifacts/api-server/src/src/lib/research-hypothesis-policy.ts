/**
 * Deterministic hypothesis updating.
 *
 * This is deliberately a lightweight Bayesian/log-odds-style controller, not a
 * claim that Apex has a calibrated Bayesian posterior. Source reliability and
 * independence are explicit inputs; the result is an auditable relative score.
 */
export type HypothesisEvidenceSignal = {
  direction: "support" | "contradict";
  sourceReliability: number;
  sourceIndependence: number;
  identitySpecificity: number;
};

export type HypothesisPosterior = {
  prior: number;
  logOdds: number;
  score: number;
  supportWeight: number;
  contradictionWeight: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function logit(probability: number): number {
  const p = Math.min(0.999, Math.max(0.001, probability));
  return Math.log(p / (1 - p));
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

/**
 * Convert source signals into a bounded likelihood-ratio contribution.
 * Independence discounts copied/saturated evidence rather than counting it as
 * a second independent experiment.
 */
export function evidenceLogOddsContribution(signal: HypothesisEvidenceSignal): number {
  const reliability = clamp(signal.sourceReliability);
  const independence = clamp(signal.sourceIndependence);
  const specificity = clamp(signal.identitySpecificity);
  const strength = (reliability * 0.45 + independence * 0.35 + specificity * 0.20);
  const magnitude = 0.15 + strength * 2.35;
  return signal.direction === "support" ? magnitude : -magnitude;
}

export function updateHypothesisPosterior(
  prior: number,
  signals: readonly HypothesisEvidenceSignal[],
): HypothesisPosterior {
  const boundedPrior = clamp(prior);
  let logOdds = logit(boundedPrior);
  let supportWeight = 0;
  let contradictionWeight = 0;

  for (const signal of signals) {
    const contribution = evidenceLogOddsContribution(signal);
    logOdds += contribution;
    if (contribution > 0) supportWeight += contribution;
    else contradictionWeight += Math.abs(contribution);
  }

  return {
    prior: boundedPrior,
    logOdds,
    score: clamp(sigmoid(logOdds)),
    supportWeight,
    contradictionWeight,
  };
}

export function chooseBestDiscriminator(input: {
  missingDiscriminators: readonly string[];
  contradictionPressure: number;
  unresolvedPressure: number;
}): string | null {
  const candidates = input.missingDiscriminators.map((value) => value.trim()).filter(Boolean);
  if (!candidates.length) return null;
  if (input.contradictionPressure >= input.unresolvedPressure) return candidates[0] ?? null;
  return candidates.find((value) => /identity|role|company|ownership|attribution|contact/i.test(value)) ?? candidates[0] ?? null;
}

export type FalsificationPlan = {
  required: boolean;
  priority: number;
  discriminator: string | null;
  reason: string;
};

export function assessFalsificationPlan(input: {
  leadingHypothesisScore: number | null;
  contradictionPressure: number;
  unresolvedPressure: number;
  missingDiscriminators: readonly string[];
}): FalsificationPlan {
  const discriminator = chooseBestDiscriminator(input);
  const priority = Math.max(
    clamp(input.contradictionPressure),
    clamp(input.unresolvedPressure),
    input.leadingHypothesisScore !== null ? clamp(input.leadingHypothesisScore) * 0.35 : 0,
  );
  return {
    required: Boolean(discriminator) && (input.contradictionPressure >= 0.25 || input.unresolvedPressure >= 0.35 || (input.leadingHypothesisScore ?? 0) >= 0.8),
    priority,
    discriminator,
    reason: discriminator
      ? "A leading identity/contact hypothesis has a concrete discriminator that should be tested before terminal promotion."
      : "No explicit falsifiable discriminator is currently recorded; create one before overconfidence.",
  };
}
