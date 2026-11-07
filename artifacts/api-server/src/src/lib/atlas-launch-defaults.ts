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

export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Identify real operating companies and their current business decision-makers for B2B prospecting. No sector or country is specified; keep discovery broad. A source-backed operating company is a valid finding even if its decision-maker remains unresolved; preserve its company card and state the gap. Identify people only when fetched public company or professional sources support their current decision-maker role and company connection. Seek legitimate public professional or company contact routes when published; do not use private or personal contact details or infer wealth. Treat snippets and search results as unverified leads, not evidence. Let Boss and Investigator choose targets, hypotheses, providers, sources, queries, actions, pivots and stopping from evidence; do not impose a fixed research sequence.";

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
