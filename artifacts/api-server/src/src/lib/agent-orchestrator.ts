/**
 * Multi-Agent Reasoning Pipeline — Phase 5
 *
 * Four deterministic TypeScript agents coordinate in sequence:
 *
 *   Planner  — parses query intent, extracts asset/geo/name filters
 *   Retriever — runs hybrid search + optional SQL pre-filter
 *   Analyst  — validates source registries, applies signal boosts, generates reasoning
 *   Critic   — re-ranks, removes noise, produces final output
 *
 * No LLM calls. All logic is deterministic and traces back to real data.
 */

import { db, entitiesTable, assetsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hybridSearch, type HybridResult } from "./hybrid-search";

export interface PlannerOutput {
  intent: "person" | "asset" | "company" | "mixed";
  assetFocus?: string;
  locations: string[];
  nameHints: string[];
  minScore?: number;
  hotOnly: boolean;
  strategy: "broad" | "asset-led" | "geo-led" | "name-led";
  reasoning: string;
  durationMs: number;
}

const GEO_MAP: Record<string, string> = {
  texas: "TX", california: "CA", florida: "FL", "new york": "NY",
  colorado: "CO", nevada: "NV", arizona: "AZ", georgia: "GA",
  uk: "British", "united kingdom": "British", britain: "British", british: "British",
  american: "US", "united states": "US", usa: "US", us: "US",
  swiss: "Switzerland", switzerland: "Switzerland",
  france: "France", french: "French",
  germany: "Germany", german: "German",
  italy: "Italy", italian: "Italian",
  norway: "Norway", norwegian: "Norwegian",
  canada: "Canada", canadian: "Canadian",
  australia: "Australia", australian: "Australian",
};

const ASSET_MAP: Record<string, string> = {
  jet: "Aviation", airplane: "Aviation", plane: "Aviation", aircraft: "Aviation",
  helicopter: "Aviation", turboprop: "Aviation", turbofan: "Aviation",
  "private jet": "Aviation", "private plane": "Aviation",
  yacht: "Marine", boat: "Marine", vessel: "Marine", ship: "Marine",
  villa: "RealEstate", property: "RealEstate", estate: "RealEstate",
  mansion: "RealEstate", house: "RealEstate",
};

const ASSET_EXPANSION: Record<string, string[]> = {
  Aviation:   ["aircraft", "airplane", "jet", "turbofan", "turboprop", "helicopter", "rotorcraft", "tail"],
  Marine:     ["yacht", "vessel", "boat", "ship", "marina"],
  RealEstate: ["property", "estate", "villa", "mansion", "residence", "freehold"],
};

const INTENT_EXPANSION: Record<string, string[]> = {
  person:  ["owner", "individual", "HNWI", "director", "beneficial", "officer"],
  company: ["corporation", "trust", "fund", "LLC", "Ltd", "Inc", "group"],
  asset:   [],
  mixed:   [],
};

export function expandQuery(query: string, plan: PlannerOutput): string {
  const ql = query.toLowerCase();
  const extra: string[] = [];

  if (plan.assetFocus) {
    for (const s of (ASSET_EXPANSION[plan.assetFocus] ?? [])) {
      if (!ql.includes(s.toLowerCase())) extra.push(s);
    }
  }
  for (const loc of plan.locations) {
    if (!ql.includes(loc.toLowerCase())) extra.push(loc);
  }
  for (const hint of plan.nameHints) {
    if (!ql.includes(hint.toLowerCase())) extra.push(hint);
  }
  for (const t of (INTENT_EXPANSION[plan.intent] ?? [])) {
    if (!ql.includes(t.toLowerCase())) extra.push(t);
  }
  return extra.length > 0 ? `${query} ${extra.join(" ")}` : query;
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i").test(text.trim());
}

export function planQuery(query: string): PlannerOutput {
  const t0 = Date.now();
  const ql = query.toLowerCase();

  let assetFocus: string | undefined;
  for (const [kw, cat] of Object.entries(ASSET_MAP)) {
    if (containsTerm(ql, kw)) { assetFocus = cat; break; }
  }

  const locations: string[] = [];
  for (const [kw, loc] of Object.entries(GEO_MAP)) {
    if (containsTerm(ql, kw) && !locations.includes(loc)) locations.push(loc);
  }

  const STOP = new Set(["The", "And", "For", "With", "From", "Show", "Find", "Who", "Has"]);
  const nameHints = query
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w) && w.length > 2 && !STOP.has(w))
    .slice(0, 3);

  const hotOnly = /\b(hot|top|richest|billionaire|ultra.?high)\b/.test(ql);
  const highWealth = /\b(billionaire|centi.?millionaire|ultra)\b/.test(ql);
  const minScore = highWealth ? 0.72 : hotOnly ? 0.60 : undefined;

  const isCompany = /\b(company|corp|inc\.|ltd|llc|fund|trust|group)\b/.test(ql);
  const isPerson = /\b(owner|person|individual|director|ceo|exec|who|officer)\b/.test(ql);
  const intent: PlannerOutput["intent"] =
    isCompany ? "company" : assetFocus ? "asset" : isPerson ? "person" : "mixed";

  let strategy: PlannerOutput["strategy"] = "broad";
  if (assetFocus) strategy = "asset-led";
  else if (locations.length > 0) strategy = "geo-led";
  else if (nameHints.length > 0) strategy = "name-led";

  const reasoning = [
    `Intent classified as: ${intent}.`,
    assetFocus ? `Asset filter: ${assetFocus}.` : null,
    locations.length ? `Geographic filter: ${locations.join(", ")}.` : null,
    nameHints.length ? `Name hints extracted: ${nameHints.join(", ")}.` : null,
    minScore ? `Minimum Bayesian score: ${minScore}.` : null,
    `Search strategy: ${strategy}.`,
  ].filter(Boolean).join(" ");

  return { intent, assetFocus, locations, nameHints, minScore, hotOnly, strategy, reasoning, durationMs: Date.now() - t0 };
}

export interface RetrieverMeta {
  bm25Hits: number;
  semanticHits: number;
  graphHits: number;
  totalCandidates: number;
  sqlPrefilter: number;
  expandedQuery: string;
  durationMs: number;
}

export interface RetrieverOutput { candidates: HybridResult[]; meta: RetrieverMeta; }

export async function retrieve(query: string, plan: PlannerOutput): Promise<RetrieverOutput> {
  const t0 = Date.now();
  let filterIds: number[] | undefined;
  const hasFilters = plan.locations.length > 0 || plan.hotOnly || plan.minScore != null || plan.assetFocus;

  if (hasFilters) {
    try {
      let ownerIds: Set<number> | undefined;
      if (plan.assetFocus) {
        const assetRows = await db.select({ ownerId: assetsTable.ownerEntityId }).from(assetsTable).where(eq(assetsTable.category, plan.assetFocus));
        ownerIds = new Set(assetRows.map((a) => a.ownerId).filter((id): id is number => id != null));
      }

      const clauses: string[] = [];
      if (plan.hotOnly) clauses.push(`is_hot = true`);
      if (plan.minScore != null) clauses.push(`bayesian_score >= ${plan.minScore}`);
      if (plan.locations.length > 0) {
        const locLike = plan.locations.map((l) => `(nationality ILIKE '%${l}%' OR known_residences ILIKE '%${l}%')`).join(" OR ");
        clauses.push(`(${locLike})`);
      }
      const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      // Keep the pre-filter bounded, but large enough not to silently discard
      // the majority of a valid filtered population before hybrid ranking.
      const rows = await db.execute(sql.raw(`SELECT id FROM entities ${whereClause} LIMIT 10000`));
      const entityIds = (rows.rows as any[]).map((r: any) => Number(r.id)).filter((id: number) => Number.isSafeInteger(id) && id > 0);
      filterIds = ownerIds ? entityIds.filter((id) => ownerIds!.has(id)) : entityIds;
    } catch {
      filterIds = undefined;
    }
  }

  const expandedQuery = expandQuery(query, plan);
  const { results, meta } = await hybridSearch(expandedQuery, filterIds, 50);
  return {
    candidates: results,
    meta: { ...meta, sqlPrefilter: filterIds?.length ?? -1, expandedQuery, durationMs: Date.now() - t0 },
  };
}

export interface AnalystCandidate extends HybridResult { reasoning: string; confidence: "high" | "medium" | "low"; sourceFlags: string[]; }
export interface AnalystOutput { scored: AnalystCandidate[]; durationMs: number; }

export function analyse(candidates: HybridResult[], plan: PlannerOutput): AnalystOutput {
  const t0 = Date.now();
  const scored: AnalystCandidate[] = candidates.map((c) => {
    const parts: string[] = [];
    const flags: string[] = [];
    const hasFaa = c.sourceRegistries.some((s) => s.includes("FAA"));
    const hasEdgar = c.sourceRegistries.some((s) => s.includes("SEC") || s.includes("EDGAR"));
    const hasCH = c.sourceRegistries.some((s) => s.includes("Companies House"));
    const hasBrreg = c.sourceRegistries.some((s) => s.includes("BRREG") || s.includes("Norway"));
    const hasGleif = c.sourceRegistries.some((s) => s.includes("GLEIF"));
    if (hasFaa) { parts.push("FAA aircraft registry — verified individual owner"); flags.push("FAA"); }
    if (hasEdgar) { parts.push("SEC EDGAR filer (SC 13D/G or DEF 14A)"); flags.push("SEC EDGAR"); }
    if (hasCH) { parts.push("UK Companies House officer / PSC"); flags.push("Companies House"); }
    if (hasBrreg) { parts.push("Norwegian company director (BRREG)"); flags.push("BRREG"); }
    if (hasGleif) { parts.push("GLEIF LEI registered entity"); flags.push("GLEIF"); }
    if (c.assetCount > 0) parts.push(`${c.assetCount} verified asset(s): ${c.assetTypes.join(", ")}`);
    else parts.push("No linked assets yet — enrich via additional ingestion runs");
    if (c.isHot) parts.push("🔴 Hot lead (turbine jet / turbofan owner)");
    if ((c.bayesianScore ?? 0) >= 0.80) parts.push("Bayesian score ≥80% — very strong HNWI signal");
    else if ((c.bayesianScore ?? 0) >= 0.65) parts.push("Bayesian score ≥65% — solid HNWI signal");
    if (plan.assetFocus && c.assetTypes.includes(plan.assetFocus)) parts.push(`✓ Matches requested ${plan.assetFocus} filter`);
    if (plan.locations.length > 0) {
      const locMatch = plan.locations.some((l) => c.nationality?.includes(l) || c.knownResidences?.includes(l));
      if (locMatch) parts.push("✓ Geographic location confirmed"); else parts.push("⚠ Location not confirmed in registry data");
    }
    const verified = hasFaa || hasEdgar || hasCH || hasBrreg;
    const confidence: AnalystCandidate["confidence"] = verified && c.assetCount > 0 ? "high" : verified ? "medium" : "low";
    return { ...c, reasoning: parts.join(". ") + ".", confidence, sourceFlags: flags };
  });
  return { scored, durationMs: Date.now() - t0 };
}

export interface CriticOutput { final: AnalystCandidate[]; removed: number; durationMs: number; }

export function critique(scored: AnalystCandidate[], limit = 20): CriticOutput {
  const t0 = Date.now();
  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 20, 1), 100);
  const verified = scored.filter((c) => c.confidence !== "low");
  const pool = verified.length >= Math.min(safeLimit, 3) ? verified : scored;
  const sorted = [...pool].sort((a, b) => {
    const aBoost = (a.isHot ? 0.04 : 0) + (a.confidence === "high" ? 0.02 : 0);
    const bBoost = (b.isHot ? 0.04 : 0) + (b.confidence === "high" ? 0.02 : 0);
    return b.scores.rrf + bBoost - (a.scores.rrf + aBoost);
  });
  const final = sorted.slice(0, safeLimit).map((c, i) => ({ ...c, rank: i + 1 }));
  return { final, removed: pool.length - final.length, durationMs: Date.now() - t0 };
}

export interface OrchestrationResult {
  query: string;
  expandedQuery: string;
  pipeline: { planner: PlannerOutput; retriever: RetrieverMeta; analyst: { candidateCount: number; durationMs: number }; critic: { finalCount: number; removed: number; durationMs: number } };
  results: AnalystCandidate[];
  isEmpty: boolean;
  totalMs: number;
}

export async function orchestrate(query: string, limit = 20): Promise<OrchestrationResult> {
  const t0 = Date.now();
  const plan = planQuery(query);
  const { candidates, meta: retrieverMeta } = await retrieve(query, plan);
  const { scored, durationMs: analystMs } = analyse(candidates, plan);
  const { final, removed, durationMs: criticMs } = critique(scored, limit);
  return {
    query,
    expandedQuery: retrieverMeta.expandedQuery,
    pipeline: { planner: plan, retriever: retrieverMeta, analyst: { candidateCount: scored.length, durationMs: analystMs }, critic: { finalCount: final.length, removed, durationMs: criticMs } },
    results: final,
    isEmpty: final.length === 0,
    totalMs: Date.now() - t0,
  };
}