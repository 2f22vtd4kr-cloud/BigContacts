/**
 * Research depth is a coordination hint, not a scripted research playbook.
 * The Investigator chooses trajectory and stopping; the hard timeout remains
 * the operational safety boundary.
 */

export type ResearchDepth = "fast" | "standard" | "deep";

export type ResearchDepthConfig = {
  depth: ResearchDepth;
  adaptiveMaxActions: number;
  noProgressLimit: number;
  maxPersonFollowUps: number;
  maxDomainFollowUps: number;
  forcePendingVectorBias: boolean;
  agenticMaxIterations: number;
  investigatorIterationsPerAct: number;
  agenticHardTimeoutMs: number;
  challengePass: boolean;
};

const MAX_RESEARCH_ACTIONS = 64;
const MAX_NO_PROGRESS = 64;
const MAX_FOLLOW_UPS = 64;
const MAX_AGENTIC_ITERATIONS = 64;

const CONFIGS: Record<ResearchDepth, ResearchDepthConfig> = {
  fast: {
    depth: "fast",
    adaptiveMaxActions: MAX_RESEARCH_ACTIONS,
    noProgressLimit: MAX_NO_PROGRESS,
    maxPersonFollowUps: MAX_FOLLOW_UPS,
    maxDomainFollowUps: MAX_FOLLOW_UPS,
    forcePendingVectorBias: false,
    agenticMaxIterations: 12,
    investigatorIterationsPerAct: 4,
    agenticHardTimeoutMs: 120_000,
    challengePass: false,
  },
  standard: {
    depth: "standard",
    adaptiveMaxActions: MAX_RESEARCH_ACTIONS,
    noProgressLimit: MAX_NO_PROGRESS,
    maxPersonFollowUps: MAX_FOLLOW_UPS,
    maxDomainFollowUps: MAX_FOLLOW_UPS,
    forcePendingVectorBias: false,
    agenticMaxIterations: 20,
    investigatorIterationsPerAct: 6,
    agenticHardTimeoutMs: 210_000,
    challengePass: true,
  },
  deep: {
    depth: "deep",
    adaptiveMaxActions: MAX_RESEARCH_ACTIONS,
    noProgressLimit: MAX_NO_PROGRESS,
    maxPersonFollowUps: MAX_FOLLOW_UPS,
    maxDomainFollowUps: MAX_FOLLOW_UPS,
    forcePendingVectorBias: false,
    agenticMaxIterations: 32,
    investigatorIterationsPerAct: 8,
    agenticHardTimeoutMs: 360_000,
    challengePass: true,
  },
};

/** Retained as a compatibility export; it is no longer used as a research cap. */
export const ABSOLUTE_ADAPTIVE_ACTION_CAP = MAX_RESEARCH_ACTIONS;

export const DEFAULT_RESEARCH_DEPTH: ResearchDepth = "fast";

export function parseResearchDepth(raw: string | null | undefined): ResearchDepth {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "fast" || value === "standard" || value === "deep") return value;
  return DEFAULT_RESEARCH_DEPTH;
}

export function resolveResearchDepth(options?: {
  explicit?: string | null;
  env?: NodeJS.ProcessEnv;
}): ResearchDepthConfig {
  const env = options?.env ?? process.env;
  const depth = parseResearchDepth(options?.explicit ?? env.RESEARCH_DEPTH);
  return CONFIGS[depth];
}

export type MissionActionBudget = {
  actionsUsed: number;
  maximumActions: number;
  actionsRemaining: number;
  maximumActionsPerEpisode: number;
  episodeStopReason: string | null;
  episodeLimitReached: boolean;
  missionLimitReached: boolean;
};

/**
 * Derive supervisor-facing budget flags from the one authoritative mission
 * counter and the actual most-recent episode result. This does not allocate,
 * increment, or own research counters.
 */
export function buildMissionActionBudget(input: {
  actionsUsed: number;
  maximumActions: number;
  maximumActionsPerEpisode: number;
  episodeStopReason: string | null;
}): MissionActionBudget {
  const count = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const actionsUsed = count(input.actionsUsed);
  const maximumActions = count(input.maximumActions);
  const maximumActionsPerEpisode = count(input.maximumActionsPerEpisode);
  const episodeStopReason = typeof input.episodeStopReason === "string"
    ? input.episodeStopReason.slice(0, 80)
    : null;
  return {
    actionsUsed,
    maximumActions,
    actionsRemaining: Math.max(0, maximumActions - actionsUsed),
    maximumActionsPerEpisode,
    episodeStopReason,
    episodeLimitReached: episodeStopReason === "ITERATION_BUDGET",
    missionLimitReached: actionsUsed >= maximumActions,
  };
}

/**
 * Bound a discovery episode so the reserved discovery-action budget can normally
 * accommodate three model-controlled Investigator acts. That gives Boss/Right-hand
 * opportunities to redirect after an unproductive act and still execute the accepted
 * redirect, while preserving the target-research reserve and the configured hard cap.
 * This changes only act size; it does not prescribe any research tools or sequence.
 */
export function resolveDiscoveryIterationsPerAct(
  config: Pick<ResearchDepthConfig, "investigatorIterationsPerAct">,
  discoveryIterationCeiling: number,
): number {
  const available = Number.isFinite(discoveryIterationCeiling)
    ? Math.max(0, Math.floor(discoveryIterationCeiling))
    : 0;
  if (available === 0) return 0;
  const configuredCap = Number.isFinite(config.investigatorIterationsPerAct)
    && config.investigatorIterationsPerAct > 0
    ? Math.floor(config.investigatorIterationsPerAct)
    : available;
  return Math.max(1, Math.min(configuredCap, Math.ceil(available / 3)));
}

/**
 * Resolve the remaining actions for a model-approved discovery continuation.
 * Discovery always respects its bounded allocation so a promising lead can receive
 * target-scoped research within the same run. If no lead qualifies by the discovery
 * ceiling, leave the protected budget unused rather than letting discovery expand
 * into the entire job.
 */
export function resolveRemainingDiscoveryIterations(input: {
  totalIterationCeiling: number;
  discoveryIterationCeiling: number;
  discoveryIterationsUsed: number;
  investigatorIterationsUsed: number;
  targetResearchReserveIterations: number;
  hasAdmittedCandidates: boolean;
}): number {
  const budgetInputs = [
    input.totalIterationCeiling,
    input.discoveryIterationCeiling,
    input.discoveryIterationsUsed,
    input.investigatorIterationsUsed,
    input.targetResearchReserveIterations,
  ];
  if (budgetInputs.some((value) => !Number.isFinite(value) || value < 0)) return 0;
  const nonNegativeInteger = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const total = nonNegativeInteger(input.totalIterationCeiling);
  const discoveryUsed = nonNegativeInteger(input.discoveryIterationsUsed);
  const investigatorUsed = nonNegativeInteger(input.investigatorIterationsUsed);
  const configuredDiscoveryCeiling = Math.min(total, nonNegativeInteger(input.discoveryIterationCeiling));
  const targetReserve = Math.min(total, nonNegativeInteger(input.targetResearchReserveIterations));
  // Once an admitted lead exists, cap discovery while preserving the target
  // reserve that has not already been consumed by target-scoped research.
  const effectiveDiscoveryCeiling = input.hasAdmittedCandidates
    ? Math.min(configuredDiscoveryCeiling, Math.max(0, total - targetReserve))
    : total;
  const targetActionsUsed = Math.max(0, investigatorUsed - discoveryUsed);
  const effectiveTargetReserve = input.hasAdmittedCandidates
    ? Math.max(0, targetReserve - targetActionsUsed)
    : 0;
  const discoveryRemaining = Math.max(0, effectiveDiscoveryCeiling - discoveryUsed);
  const globalRemaining = Math.max(0, total - investigatorUsed - effectiveTargetReserve);
  return Math.min(discoveryRemaining, globalRemaining);
}

export function describeResearchDepth(config: ResearchDepthConfig): string {
  return [
    `depth=${config.depth}`,
    `adaptiveMaxActions=${Number.isFinite(config.adaptiveMaxActions) ? config.adaptiveMaxActions : "model-decided"}`,
    `personFollowUps=${Number.isFinite(config.maxPersonFollowUps) ? config.maxPersonFollowUps : "model-decided"}`,
    `domainFollowUps=${Number.isFinite(config.maxDomainFollowUps) ? config.maxDomainFollowUps : "model-decided"}`,
    `agenticMaxIterations=${Number.isFinite(config.agenticMaxIterations) ? config.agenticMaxIterations : "model-decided"}`,
    `investigatorIterationsPerAct=${Number.isFinite(config.investigatorIterationsPerAct) ? config.investigatorIterationsPerAct : "model-decided"}`,
    `challengePass=${config.challengePass ? "on" : "off"}`,
  ].join(" · ");
}