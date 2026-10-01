/**
 * Small empirical action-yield memory.
 *
 * This is not RL. It is an auditable Beta-style success estimate plus observed
 * information gain, suitable for contextual action selection without retraining.
 */
export type ActionYieldStat = {
  attempts: number;
  useful: number;
  failures: number;
  totalInformationGain: number;
  lastTurn: number;
  predictedInformationGain: number;
  realizedInformationGain: number;
  absolutePredictionError: number;
};

export type ActionYieldSummary = {
  action: string;
  attempts: number;
  usefulRate: number;
  failureRate: number;
  meanInformationGain: number;
  posteriorSuccess: number;
  meanPredictedInformationGain: number;
  meanRealizedInformationGain: number;
  meanPredictionError: number;
};

const PRIOR_ALPHA = 1;
const PRIOR_BETA = 1;

export function updateActionYield(
  previous: ActionYieldStat | undefined,
  input: { useful: boolean; execution: string; informationGain: number; turn: number; predictedInformationGain?: number; realizedInformationGain?: number },
): ActionYieldStat {
  const current = previous ?? { attempts: 0, useful: 0, failures: 0, totalInformationGain: 0, lastTurn: 0, predictedInformationGain: 0, realizedInformationGain: 0, absolutePredictionError: 0 };
  return {
    attempts: current.attempts + 1,
    useful: current.useful + (input.useful ? 1 : 0),
    failures: current.failures + (["error", "http_error", "timeout", "cancelled", "blocked"].includes(input.execution) ? 1 : 0),
    totalInformationGain: current.totalInformationGain + Math.max(0, Math.min(1, input.informationGain)),
    lastTurn: Math.max(current.lastTurn, input.turn),
    predictedInformationGain: current.predictedInformationGain + Math.max(0, Math.min(1, input.predictedInformationGain ?? input.informationGain)),
    realizedInformationGain: current.realizedInformationGain + Math.max(0, Math.min(1, input.realizedInformationGain ?? input.informationGain)),
    absolutePredictionError: current.absolutePredictionError + Math.abs(Math.max(0, Math.min(1, input.predictedInformationGain ?? input.informationGain)) - Math.max(0, Math.min(1, input.realizedInformationGain ?? input.informationGain))),
  };
}

export function summarizeActionYield(action: string, stat: ActionYieldStat | undefined): ActionYieldSummary {
  const current = stat ?? { attempts: 0, useful: 0, failures: 0, totalInformationGain: 0, lastTurn: 0, predictedInformationGain: 0, realizedInformationGain: 0, absolutePredictionError: 0 };
  const posteriorSuccess = (PRIOR_ALPHA + current.useful) / (PRIOR_ALPHA + PRIOR_BETA + current.attempts);
  return {
    action,
    attempts: current.attempts,
    usefulRate: current.attempts ? current.useful / current.attempts : 0,
    failureRate: current.attempts ? current.failures / current.attempts : 0,
    meanInformationGain: current.attempts ? current.totalInformationGain / current.attempts : 0,
    posteriorSuccess,
    meanPredictedInformationGain: current.attempts ? current.predictedInformationGain / current.attempts : 0,
    meanRealizedInformationGain: current.attempts ? current.realizedInformationGain / current.attempts : 0,
    meanPredictionError: current.attempts ? current.absolutePredictionError / current.attempts : 0,
  };
}

export function rankLearnedActionYield(stats: ReadonlyMap<string, ActionYieldStat>): ActionYieldSummary[] {
  return [...stats.entries()]
    .map(([action, stat]) => summarizeActionYield(action, stat))
    .sort((a, b) => b.posteriorSuccess - a.posteriorSuccess || b.meanInformationGain - a.meanInformationGain);
}
