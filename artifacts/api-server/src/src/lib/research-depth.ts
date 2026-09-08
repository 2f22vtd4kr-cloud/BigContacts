/**
 * Research depth tiers — scale-safe quality control for Apex Atlas (Replit-optimised).
 *
 * fast     → DEFAULT — bulk / thousands of targets
 * standard → richer single-target enrichment
 * deep     → VIP / human-requested thorough pass
 *
 * The adaptive director is a coordination layer around the free-ReAct Investigator;
 * its budget must not consume the quota that should go to actual web research.
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
  agenticHardTimeoutMs: number;
  challengePass: boolean;
};

const CONFIGS: Record<ResearchDepth, ResearchDepthConfig> = {
  fast: {
    depth: "fast",
    adaptiveMaxActions: 5,
    noProgressLimit: 2,
    maxPersonFollowUps: 2,
    maxDomainFollowUps: 1,
    forcePendingVectorBias: false,
    agenticMaxIterations: 8,
    agenticHardTimeoutMs: 120_000,
    challengePass: false,
  },
  standard: {
    depth: "standard",
    adaptiveMaxActions: 8,
    noProgressLimit: 2,
    maxPersonFollowUps: 4,
    maxDomainFollowUps: 2,
    forcePendingVectorBias: false,
    agenticMaxIterations: 14,
    agenticHardTimeoutMs: 210_000,
    challengePass: true,
  },
  deep: {
    depth: "deep",
    adaptiveMaxActions: 12,
    noProgressLimit: 3,
    maxPersonFollowUps: 7,
    maxDomainFollowUps: 3,
    forcePendingVectorBias: false,
    agenticMaxIterations: 20,
    agenticHardTimeoutMs: 360_000,
    challengePass: true,
  },
};

/** Hard ceiling so a bad env value cannot explode provider cost. */
export const ABSOLUTE_ADAPTIVE_ACTION_CAP = 12;

/** Default for unset / invalid env — keeps bulk runs cheap on Replit. */
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

export function describeResearchDepth(config: ResearchDepthConfig): string {
  return [
    `depth=${config.depth}`,
    `adaptiveMaxActions=${config.adaptiveMaxActions}`,
    `personFollowUps=${config.maxPersonFollowUps}`,
    `domainFollowUps=${config.maxDomainFollowUps}`,
    `agenticMaxIterations=${config.agenticMaxIterations}`,
    `challengePass=${config.challengePass ? "on" : "off"}`,
  ].join(" · ");
}