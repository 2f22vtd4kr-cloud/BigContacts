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

export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Discover a broad, evidence-led pool of real people and entities relevant to the human objective: HNWIs and wealth-linked individuals where public evidence supports them; operating companies and their owners, operators, founders, shareholders and investors; and HNWI-facing professional mediators and service providers such as notaries, geometri, architects, engineers, and hotel, restaurant and real-estate professionals. Use public registries and basic web research across the supplied or approved geography and relevant sectors. Keep discovery breadth-first and low-depth; preserve useful company, person and mediator leads and partial findings with exact observed names and public URLs. HNWI status is additional, not required; do not require wealth or contact proof at discovery. Do not impose fixed target types, named target lists, provider/source order, sector or geography absent human scope, or celebrity/name blacklists. Boss owns objective, scope, target selection, pivots and stopping; the Investigator chooses evidence-led queries and actions. Search snippets are leads, not evidence. Never invent identities, relationships, wealth, contacts or URLs.";

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
