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

export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Find lesser-known people with credible wealth potential who may be relevant to the founder’s objective. Identify potential investors and other objective-fit people, companies, assets, relationships and public/professional routes. Honor explicit human scope and exclusions. The Investigator owns relevance, hypotheses, target selection, research direction, source/tool choice, follow-ups, evidence-led pivots and stopping; Boss authorizes material scope changes. Where geography is open, the Investigator may develop evidence-led jurisdiction hypotheses and propose them to Boss. Fame, wealth labels, seniority, size, listing status, sector, geography, source class, ranking and route category are context, not automatic qualifications or exclusions. Do not infer wealth, ownership, role, identity or contactability from snippets, prestige or proximity. Search results and registry hits are leads; consequential claims require attributable fetched evidence and exact quotations. Keep organization routes distinct from personal routes. Preserve model-selected provisional leads and uncertainty; target research verifies identity, ownership, materiality, counter-evidence and routes before promotion. No fixed source mix, search sequence, target class, geography or target quota. Never invent people, relationships, wealth, contacts or URLs.";

export const CANONICAL_ATLAS_LAUNCH_BODY = {
  /** Diversified discovery over bulk FAA-scale ingest */
  discoveryFirst: true,
  /**
   * Operational upper bound only. The Investigator/Boss decide which targets
   * matter and when to stop; this is not a target quota or admission threshold.
   */
  targetCount: 1,
  discoveryObjective: DEFAULT_ATLAS_DISCOVERY_OBJECTIVE,
  /** Operational upper bound matching targetCount; model-owned stopping governs actual work. */
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
