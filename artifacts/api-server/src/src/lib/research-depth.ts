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
 * Bound one Investigator episode by its configured technical per-act ceiling.
 * The same global mission ceiling applies to discovery and target research; no
 * quota or reserved share is assigned to either phase.
 */
export function resolveDiscoveryIterationsPerAct(
  config: Pick<ResearchDepthConfig, "investigatorIterationsPerAct">,
  missionIterationCeiling: number,
): number {
  const available = Number.isFinite(missionIterationCeiling)
    ? Math.max(0, Math.floor(missionIterationCeiling))
    : 0;
  if (available === 0) return 0;
  const configuredCap = Number.isFinite(config.investigatorIterationsPerAct)
    && config.investigatorIterationsPerAct > 0
    ? Math.floor(config.investigatorIterationsPerAct)
    : available;
  return Math.min(configuredCap, available);
}

/**
 * The opening episode uses the same configured per-act technical ceiling as
 * every later episode. No fixed first-pass count or discovery/target allocation.
 */
export function resolveOpeningInvestigatorIterations(
  config: Pick<ResearchDepthConfig, "investigatorIterationsPerAct">,
  missionIterationCeiling: number,
): number {
  return resolveDiscoveryIterationsPerAct(config, missionIterationCeiling);
}

/** Remaining technical mission actions, shared by discovery and target research. */
export function resolveRemainingDiscoveryIterations(input: {
  totalIterationCeiling: number;
  investigatorIterationsUsed: number;
}): number {
  if (
    !Number.isFinite(input.totalIterationCeiling)
    || input.totalIterationCeiling < 0
    || !Number.isFinite(input.investigatorIterationsUsed)
    || input.investigatorIterationsUsed < 0
  ) return 0;
  return Math.max(0, Math.floor(input.totalIterationCeiling) - Math.floor(input.investigatorIterationsUsed));
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