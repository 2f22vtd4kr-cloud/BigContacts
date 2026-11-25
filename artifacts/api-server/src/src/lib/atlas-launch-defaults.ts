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

export const MAX_CANONICAL_ATLAS_DISCOVERY_OBJECTIVE_CHARS = 1_600;

// One discovery-first Atlas run needs time for Investigator research, independent
// oversight, Boss control turns and (when justified) one target investigation.
// The configured ceiling remains hard-bounded at 30 minutes.
export const DEFAULT_CANONICAL_ATLAS_RUN_TIMEOUT_MS = 30 * 60 * 1_000;
export const MIN_CANONICAL_ATLAS_RUN_TIMEOUT_MS = 2 * 60 * 1_000;
export const MAX_CANONICAL_ATLAS_RUN_TIMEOUT_MS = 30 * 60 * 1_000;

export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = "Find lesser-known or unknown wealthy people who are realistically contactable through legitimate public/professional routes and relevant to the founder’s objective; identify other objective-fit people, companies, assets and relationships. Ranking, top-N and famous-investor list pages are poor sources for this mission and should not be searched as a discovery strategy. Find people through primary evidence such as corporate filings, board seats, ownership records, company leadership pages, documented exits and transaction announcements. Honor explicit human scope and exclusions. The Investigator owns meaning, relevance, hypotheses, target selection, research direction, source/tool choice, follow-ups, evidence-led pivots and stopping; Boss authorizes material scope changes. Where geography is open, the Investigator may develop evidence-led jurisdiction hypotheses and propose them to Boss. Do not infer wealth, ownership, role, identity or contactability from snippets or proximity. Search results and registry hits are leads; consequential claims require attributable fetched evidence and exact quotations. Keep organization routes distinct from personal routes. Preserve model-selected provisional leads and uncertainty; target research verifies identity, ownership, materiality, counter-evidence and routes before promotion. No keyword, regex, name, employer or domain gates; code verifies source reality, exact cited URLs and exact quotes, not meaning. Operator caps are resource limits, not relevance or admission rules. Never invent people, relationships, wealth, contacts or URLs.";

export const CANONICAL_ATLAS_LAUNCH_BODY = {
  /** Diversified discovery over bulk FAA-scale ingest */
  discoveryFirst: true,
  /**
   * Operational upper bound only. The Investigator/Boss decide which targets
   * matter and when to stop; this is not a target quota or admission threshold.
   */
  targetCount: 1,
  discoveryObjective: DEFAULT_ATLAS_DISCOVERY_OBJECTIVE,
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

export function resolveCanonicalAtlasTargetCount(value: unknown = CANONICAL_ATLAS_LAUNCH_BODY.targetCount): number {
  const parsed = Number(value ?? CANONICAL_ATLAS_LAUNCH_BODY.targetCount);
  const requested = Number.isFinite(parsed) && parsed !== 0 ? Math.trunc(parsed) : CANONICAL_ATLAS_LAUNCH_BODY.targetCount;
  return Math.max(1, Math.min(25, requested));
}

export function resolveCanonicalAtlasRunTimeoutMs(value: unknown = DEFAULT_CANONICAL_ATLAS_RUN_TIMEOUT_MS): number {
  const parsed = Number(value);
  const requested = Number.isFinite(parsed) ? Math.floor(parsed) : DEFAULT_CANONICAL_ATLAS_RUN_TIMEOUT_MS;
  return Math.max(MIN_CANONICAL_ATLAS_RUN_TIMEOUT_MS, Math.min(MAX_CANONICAL_ATLAS_RUN_TIMEOUT_MS, requested));
}

export type CanonicalAtlasLaunchBody = typeof CANONICAL_ATLAS_LAUNCH_BODY;

/** Minimal smoke (launch then immediate stop) — not a real bureau cycle */
export const SMOKE_ATLAS_LAUNCH_BODY = {
  ...CANONICAL_ATLAS_LAUNCH_BODY,
  targetCount: 1,
  targetTimeoutMs: 60_000,
} as const;
