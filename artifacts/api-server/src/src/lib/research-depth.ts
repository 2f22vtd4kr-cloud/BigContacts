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
    agenticMaxIterations: MAX_AGENTIC_ITERATIONS,
    agenticHardTimeoutMs: 120_000,
    challengePass: false,
  },
  standard: {
    depth: "standard",
    adaptiveMaxActions: UNBOUNDED,
    noProgressLimit: UNBOUNDED,
    maxPersonFollowUps: UNBOUNDED,
    maxDomainFollowUps: UNBOUNDED,
    forcePendingVectorBias: false,
    agenticMaxIterations: UNBOUNDED,
    agenticHardTimeoutMs: 210_000,
    challengePass: true,
  },
  deep: {
    depth: "deep",
    adaptiveMaxActions: UNBOUNDED,
    noProgressLimit: UNBOUNDED,
    maxPersonFollowUps: UNBOUNDED,
    maxDomainFollowUps: UNBOUNDED,
    forcePendingVectorBias: false,
    agenticMaxIterations: UNBOUNDED,
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

export function describeResearchDepth(config: ResearchDepthConfig): string {
  return [
    `depth=${config.depth}`,
    `adaptiveMaxActions=${Number.isFinite(config.adaptiveMaxActions) ? config.adaptiveMaxActions : "model-decided"}`,
    `personFollowUps=${Number.isFinite(config.maxPersonFollowUps) ? config.maxPersonFollowUps : "model-decided"}`,
    `domainFollowUps=${Number.isFinite(config.maxDomainFollowUps) ? config.maxDomainFollowUps : "model-decided"}`,
    `agenticMaxIterations=${Number.isFinite(config.agenticMaxIterations) ? config.agenticMaxIterations : "model-decided"}`,
    `challengePass=${config.challengePass ? "on" : "off"}`,
  ].join(" · ");
}