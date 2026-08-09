/**
 * Research depth tiers — scale-safe quality control for Apex Atlas.
 *
 * fast     → bulk / thousands of targets (cheap)
 * standard → default target-scoped enrichment
 * deep     → VIP / human-requested thorough pass (Gemini-class effort)
 *
 * Override with env RESEARCH_DEPTH=fast|standard|deep
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
  /** Prefer closing pending contact vectors in Boss queue */
  forcePendingVectorBias: boolean;
  /** Run identity collision / alias challenge before stop when budget remains */
  challengePass: boolean;
};

const CONFIGS: Record<ResearchDepth, ResearchDepthConfig> = {
  fast: {
    depth: "fast",
    adaptiveMaxActions: 5,
    noProgressLimit: 2,
    maxPersonFollowUps: 2,
    maxDomainFollowUps: 1,
    forcePendingVectorBias: true,
    challengePass: false,
  },
  standard: {
    depth: "standard",
    adaptiveMaxActions: 8,
    noProgressLimit: 2,
    maxPersonFollowUps: 4,
    maxDomainFollowUps: 2,
    forcePendingVectorBias: true,
    challengePass: true,
  },
  deep: {
    depth: "deep",
    adaptiveMaxActions: 12,
    noProgressLimit: 3,
    maxPersonFollowUps: 6,
    maxDomainFollowUps: 3,
    forcePendingVectorBias: true,
    challengePass: true,
  },
};

/** Hard ceiling so a bad env value cannot explode cost. */
export const ABSOLUTE_ADAPTIVE_ACTION_CAP = 12;

export function parseResearchDepth(raw: string | null | undefined): ResearchDepth {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "fast" || value === "standard" || value === "deep") return value;
  return "standard";
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
    `challengePass=${config.challengePass ? "on" : "off"}`,
  ].join(" · ");
}
