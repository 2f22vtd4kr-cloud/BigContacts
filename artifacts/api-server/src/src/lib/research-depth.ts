/**
 * Research depth tiers — scale-safe quality control for Apex Atlas (Replit-optimised).
 *
 * fast     → DEFAULT — bulk / thousands of targets (same budget as legacy 5-action cap)
 * standard → richer single-target enrichment (set RESEARCH_DEPTH=standard)
 * deep     → VIP / human-requested thorough pass (set RESEARCH_DEPTH=deep)
 *
 * Override with Replit Secret / env: RESEARCH_DEPTH=fast|standard|deep
 */

export type ResearchDepth = "fast" | "standard" | "deep";

export type ResearchDepthConfig = {
  depth: ResearchDepth;
  /** Adaptive Research Director action budget */
  adaptiveMaxActions: number;
  /** Consecutive no-progress passes before stop */
  noProgressLimit: number;
  /** Max person follow-ups inside adaptive loop */
  maxPersonFollowUps: number;
  /** Max official-domain follow-ups */
  maxDomainFollowUps: number;
  /** Legacy flag — always false; free research does not force pending-vector scripts */
  forcePendingVectorBias: boolean;
  /** Agentic ReAct dig iteration budget */
  agenticMaxIterations: number;
  /** Run identity collision / alias challenge before stop when budget remains */
  challengePass: boolean;
};

const CONFIGS: Record<ResearchDepth, ResearchDepthConfig> = {
  fast: {
    depth: "fast",
    adaptiveMaxActions: 8,
    noProgressLimit: 2,
    maxPersonFollowUps: 2,
    maxDomainFollowUps: 1,
    forcePendingVectorBias: false,
    agenticMaxIterations: 10,
    challengePass: false,
  },
  standard: {
    depth: "standard",
    adaptiveMaxActions: 12,
    noProgressLimit: 2,
    maxPersonFollowUps: 5,
    maxDomainFollowUps: 2,
    forcePendingVectorBias: false,
    agenticMaxIterations: 16,
    challengePass: true,
  },
  deep: {
    depth: "deep",
    adaptiveMaxActions: 16,
    noProgressLimit: 3,
    maxPersonFollowUps: 8,
    maxDomainFollowUps: 3,
    forcePendingVectorBias: false,
    agenticMaxIterations: 20,
    challengePass: true,
  },
};

/** Hard ceiling so a bad env value cannot explode Replit / provider cost. */
export const ABSOLUTE_ADAPTIVE_ACTION_CAP = 16;

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
