/**
 * Canonical Apex Atlas launch body.
 *
 * Every operator path MUST use these defaults unless the caller explicitly
 * overrides a field (single-target, smoke, etc.).
 *
 * "Run Apex Atlas research/bureau" means ONLY:
 *   POST /api/ingest/atlas-run
 *   with CANONICAL_ATLAS_LAUNCH_BODY (or a documented subset override)
 *
 * Not: random scripts, auto-pipeline (unless ENABLE_AUTO_PIPELINE=true),
 * not: starting only Phase J, not: mock mode.
 */

export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Discover lesser-known people with credible wealth potential and public/professional routes. “Lesser-known” describes prominence, not a search term, name fragment, brand, or target type. A person is the ultimate investor-identification goal. Companies are leads and may be selected for target-scoped research to identify owners, operators, founders, shareholders, investors or assets. Focus on private/mid-market firms, controlling owners, investors and concession/license holders. Seek public ownership/equity/investment/control evidence, material assets or exits, plus practical public/professional routes. Never infer wealth from seniority, fame, prestige or brand leadership; avoid celebrity/richest lists and global household brands unless evidence identifies a realistic local operator/intermediary. Do not compare sectors/geographies; use only human-specified geography. Select one company, person or asset from a public source; one useful candidate starts target research. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth basis and approach route are source-supported. Never invent people, relationships, wealth, contacts or URLs.";

export const CANONICAL_ATLAS_LAUNCH_BODY = {
  /** Diversified discovery over bulk FAA-scale ingest */
  discoveryFirst: true,
  /**
   * Number of targets the Bureau is asked to research end-to-end.
   * Discovery is the funnel for this same target goal; it must not run an
   * arbitrary larger number of expensive LLM sessions and then discard them
   * merely because researchLimit is smaller.
   */
  targetCount: 1,
  discoveryObjective: DEFAULT_ATLAS_DISCOVERY_OBJECTIVE,
  /**
   * Full target-scoped research budget. In the canonical flow this matches
   * targetCount: each admitted discovery target gets researched. The
   * orchestrator may still research fewer when discovery cannot produce
   * enough qualified targets, but it must never manufacture targets to fill
   * this number.
   */
  researchLimit: 1,
  /** Always run research/enrichment for a bureau run */
  runResearch: true,
  hotLeadsOnly: false,
  /** Discovery-first skips FAA bulk by default */
  skipFaa: true,
  broadCategories: 3,
  batchSize: 50,
  phaseJBatchSize: 10,
  /** Per-target enrichment ceiling (ms) — matches orchestrator 420s floor work */
  targetTimeoutMs: 420_000,
  /** free dig depth: fast | standard | deep */
  researchDepth: "standard",
} as const;

export type CanonicalAtlasLaunchBody = typeof CANONICAL_ATLAS_LAUNCH_BODY;

/** Minimal smoke (launch then immediate stop) — not a real bureau cycle */
export const SMOKE_ATLAS_LAUNCH_BODY = {
  ...CANONICAL_ATLAS_LAUNCH_BODY,
  targetCount: 1,
  researchLimit: 1,
  targetTimeoutMs: 60_000,
} as const;
