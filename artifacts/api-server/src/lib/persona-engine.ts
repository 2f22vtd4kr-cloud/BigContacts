/**
 * Persona Improvement Engine — Phase 7
 *
 * Six specialist personas each analyse an entity and produce concrete
 * improvement suggestions. All logic is deterministic TypeScript; no
 * external AI APIs are used.
 *
 * Personas:
 *  1. Data Engineer   — data completeness & source quality
 *  2. Data Analyst    — Bayesian score accuracy & financial signals
 *  3. MCTS Expert     — outreach path quality & research coverage
 *  4. Business Engineer — corporate structure & relationship depth
 *  5. UX Designer     — profile display completeness
 *  6. Architect       — entity classification & deduplication
 */

import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import type { Entity } from "@workspace/db";
import { logger } from "./logger";

export type PersonaId =
  | "data_engineer"
  | "data_analyst"
  | "mcts_expert"
  | "business_engineer"
  | "ux_designer"
  | "architect";

export type ImprovementCategory =
  | "data_quality"
  | "scoring"
  | "outreach"
  | "structure"
  | "display"
  | "classification";

export type Priority = "high" | "medium" | "low";
export type ImprovementStatus = "pending" | "applied" | "dismissed";

export interface ImprovementSuggestion {
  entityId: number;
  persona: PersonaId;
  category: ImprovementCategory;
  priority: Priority;
  title: string;
  description: string;
  actionTaken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonSafe<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function ageInDays(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 86_400_000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 1 — Data Engineer
// Focuses on field completeness and source quality
// ─────────────────────────────────────────────────────────────────────────────

async function runDataEngineer(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];
  const sources: string[] = parseJsonSafe(entity.sourceRegistries, []);

  if (!entity.phone && !entity.email && !entity.linkedinUrl) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "high",
      title: "No direct contact vectors found",
      description:
        "Entity has no phone, email, or LinkedIn on record. Proximity-to-body score is critically low. " +
        "Suggested sources: SEC DEF 14A director filings, UK Companies House officer submissions, " +
        "yacht club membership records, aviation FBO logs.",
      actionTaken: "Flagged for enrichment from SEC, Companies House, and club registers.",
    });
  } else if (!entity.phone) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "medium",
      title: "Direct phone number missing",
      description:
        "No direct phone on record. Personal WhatsApp/Signal numbers are the highest-value contact vector. " +
        "Sources to try: aviation FBO client sheets, yacht marina records, private club rosters.",
      actionTaken: "Queued for phone enrichment sweep.",
    });
  }

  if (!entity.nationality) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "medium",
      title: "Nationality / jurisdiction unknown",
      description:
        "Nationality is unset. This limits tax-residency inference, sanctions screening, and jurisdiction-specific " +
        "outreach strategy. Cross-reference with asset jurisdictions and registry addresses to infer.",
      actionTaken: "Recommended cross-reference against asset jurisdictions.",
    });
  }

  if (sources.length === 0) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "high",
      title: "No source registries linked",
      description:
        "No provenance chain for this entity. Every data point must trace to a validated public registry. " +
        "Without sources, confidence scores default to minimum and the record cannot be exported for compliance use.",
      actionTaken: "Marked sourceRegistries as empty — manual source attribution required.",
    });
  } else if (sources.length === 1) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "low",
      title: "Single source — corroboration needed",
      description: `Only one registry (${sources[0]}) links to this entity. A second independent source increases ` +
        "confidence and reduces false-positive risk. Try cross-referencing with GLEIF, BRREG, or SEC.",
      actionTaken: "Single-source flag applied to confidence metadata.",
    });
  }

  if (!entity.knownResidences || entity.knownResidences === "[]") {
    suggestions.push({
      entityId: entity.id,
      persona: "data_engineer",
      category: "data_quality",
      priority: "low",
      title: "Known residences not populated",
      description:
        "No residential addresses on record. Residences help model seasonal presence and preferred meeting jurisdictions. " +
        "Sources: UK Land Registry, county assessor records, yacht club home port data.",
      actionTaken: "Residence gap logged for future enrichment pass.",
    });
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 2 — Data Analyst
// Focuses on Bayesian score accuracy and financial signal consistency
// ─────────────────────────────────────────────────────────────────────────────

async function runDataAnalyst(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];

  const [assetRow] = await db
    .select({ count: count(), totalValue: sql<number>`coalesce(sum(${assetsTable.estimatedValue}),0)` })
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entity.id));

  const assetCount = Number(assetRow?.count ?? 0);
  const totalAssetValue = Number(assetRow?.totalValue ?? 0);
  const score = entity.bayesianScore;

  // Score too low given asset footprint
  if (assetCount >= 3 && score < 0.3) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_analyst",
      category: "scoring",
      priority: "high",
      title: "Bayesian score underestimates asset-backed wealth",
      description:
        `Entity holds ${assetCount} registered assets totalling ~$${(totalAssetValue / 1_000_000).toFixed(1)}M, ` +
        `yet Bayesian score is ${score.toFixed(3)}. Multi-asset HNWI footprint strongly indicates higher investable capital. ` +
        "Recommend upward score revision to reflect tangible asset evidence.",
      actionTaken: `Score flagged for recalibration. Asset-to-score ratio: ${assetCount}:${score.toFixed(2)}.`,
    });
  }

  // Score inconsistent with HNWI type
  if (entity.type === "HNWI" && score < 0.15) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_analyst",
      category: "scoring",
      priority: "medium",
      title: "HNWI classification with sub-threshold score",
      description:
        `Entity is classified as HNWI but has a Bayesian score of ${score.toFixed(3)}, ` +
        "below the 0.15 HNWI floor. Either the classification is premature or the score has not been updated " +
        "after recent asset/registry ingestion. Re-run Bayesian update with current asset evidence.",
      actionTaken: "Score-vs-type inconsistency logged for analyst review.",
    });
  }

  // Net worth not set but assets suggest significant value
  if (!entity.estimatedNetWorth && totalAssetValue > 1_000_000) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_analyst",
      category: "scoring",
      priority: "medium",
      title: "Net worth unset despite significant asset holdings",
      description:
        `Asset register shows ~$${(totalAssetValue / 1_000_000).toFixed(1)}M in registered assets, but ` +
        "estimatedNetWorth is null. Net worth is a key signal for prospect prioritisation and MCTS path scoring. " +
        "Minimum estimate: set to 3× total registered asset value as a conservative floor.",
      actionTaken: `Recommended estimatedNetWorth floor: $${(totalAssetValue * 3 / 1_000_000).toFixed(1)}M.`,
    });
  }

  // Hot flag missing for high-scoring entity
  if (score >= 0.7 && !entity.isHot) {
    suggestions.push({
      entityId: entity.id,
      persona: "data_analyst",
      category: "scoring",
      priority: "high",
      title: "High Bayesian score not reflected in hot-leads queue",
      description:
        `Score ${score.toFixed(3)} exceeds the 0.70 hot-lead threshold but isHot is false. ` +
        "This entity is invisible in the hot-leads sidebar and dashboard priority stack.",
      actionTaken: `isHot should be set to true — score ${score.toFixed(3)} ≥ 0.70 threshold.`,
    });
  }

  // Low entity value — no assets
  if (assetCount === 0 && entity.type === "HNWI") {
    suggestions.push({
      entityId: entity.id,
      persona: "data_analyst",
      category: "data_quality",
      priority: "medium",
      title: "HNWI with zero registered assets",
      description:
        "No asset records linked to this HNWI. Either assets haven't been ingested yet, " +
        "or the individual holds assets exclusively through corporate vehicles. " +
        "Run FAA ingestor and check SEC Schedule 13D for nominee holdings.",
      actionTaken: "Zero-asset HNWI flagged — recommend cross-reference with corporate subsidiaries.",
    });
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 3 — MCTS Expert
// Focuses on outreach path quality and research session coverage
// ─────────────────────────────────────────────────────────────────────────────

async function runMctsExpert(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];

  const sessions = await db
    .select()
    .from(researchSessionsTable)
    .where(eq(researchSessionsTable.targetEntityId, entity.id))
    .orderBy(sql`${researchSessionsTable.createdAt} desc`)
    .limit(5);

  if (sessions.length === 0) {
    suggestions.push({
      entityId: entity.id,
      persona: "mcts_expert",
      category: "outreach",
      priority: "high",
      title: "No MCTS research session run — outreach path unknown",
      description:
        "This entity has never been through an MCTS path-finding simulation. Without a research session, " +
        "optimal introduction routes, warm-contact vectors, and UCT-ranked paths are unavailable. " +
        "The Pipeline CRM card has no path data and pitch generation is blocked.",
      actionTaken: "Queued for MCTS run at next available cycle.",
    });
  } else {
    const latest = sessions[0];
    const ageDays = ageInDays(latest.createdAt.toISOString());

    if (ageDays > 30) {
      suggestions.push({
        entityId: entity.id,
        persona: "mcts_expert",
        category: "outreach",
        priority: "medium",
        title: `MCTS path data is ${Math.floor(ageDays)} days old — refresh recommended`,
        description:
          `Last research session ran ${Math.floor(ageDays)} days ago. Network positions shift as new entities and ` +
          "relationships are ingested. Paths that were optimal may now route through stale intermediaries. " +
          "A fresh MCTS run will incorporate new registry data and recalculate UCT-optimal approach vectors.",
        actionTaken: `Session age: ${Math.floor(ageDays)}d. Flagged for re-run.`,
      });
    }

    const pathScore = latest.pathScore ?? 0;
    if (pathScore < 0.3 && sessions.length < 3) {
      suggestions.push({
        entityId: entity.id,
        persona: "mcts_expert",
        category: "outreach",
        priority: "medium",
        title: "Winning path score is low — deeper simulation needed",
        description:
          `Best path UCT score is ${pathScore.toFixed(3)}, indicating no strong warm-introduction route has been found. ` +
          `Only ${sessions.length} simulation(s) run. Increasing MCTS iterations and graph depth may surface ` +
          "a higher-confidence path through shared board memberships, club affiliations, or aviation/marina contacts.",
        actionTaken: `Low UCT score (${pathScore.toFixed(3)}) logged — recommend depth-first re-run.`,
      });
    }

    const noGeneratedPitch = sessions.every(s => !s.generatedPitch);
    if (noGeneratedPitch) {
      suggestions.push({
        entityId: entity.id,
        persona: "mcts_expert",
        category: "outreach",
        priority: "low",
        title: "Outreach pitch not yet generated",
        description:
          "MCTS sessions exist but no personalised pitch has been generated. " +
          "The pitch synthesises winning path context, mutual-interest signals, and contact preferences into a " +
          "ready-to-deploy opening message. Generate via the MCTS Terminal.",
        actionTaken: "Pitch generation flagged as next step.",
      });
    }
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 4 — Business Engineer
// Focuses on corporate structure and relationship network depth
// ─────────────────────────────────────────────────────────────────────────────

async function runBusinessEngineer(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];

  const [relRow] = await db
    .select({ count: count() })
    .from(relationshipsTable)
    .where(eq(relationshipsTable.sourceEntityId, entity.id));

  const relCount = Number(relRow?.count ?? 0);
  const metadata = parseJsonSafe<Record<string, unknown>>(entity.metadata, {});

  if (relCount === 0) {
    suggestions.push({
      entityId: entity.id,
      persona: "business_engineer",
      category: "structure",
      priority: "high",
      title: "Isolated node — no relationships mapped",
      description:
        "Entity has no relationship edges in the graph. Isolated nodes cannot benefit from MCTS path-finding " +
        "and are invisible in the Network Graph view. " +
        "Immediate actions: link to known employers/directorships (SEC DEF 14A, Companies House); " +
        "map to private-club memberships; connect to asset-management vehicles (trusts, SPVs).",
      actionTaken: "Zero-relationship flag set — graph integration required.",
    });
  } else if (relCount < 3) {
    suggestions.push({
      entityId: entity.id,
      persona: "business_engineer",
      category: "structure",
      priority: "medium",
      title: `Thin network — only ${relCount} relationship(s) mapped`,
      description:
        `Entity has only ${relCount} relationship edge(s). Wealthy individuals typically sit on 3–8 boards ` +
        "and participate in multiple club/investment networks. " +
        "Enrich via: directorship filings (SEC, Companies House), co-investment disclosures, alumni networks.",
      actionTaken: `Relationship depth score: ${relCount}/5 (sparse).`,
    });
  }

  // Check for corporate vehicle relationships
  const corporateKeys = ["employer", "board", "directorship", "trustee", "nominee"];
  const hasCorporateHint = corporateKeys.some(
    k => JSON.stringify(metadata).toLowerCase().includes(k)
  );
  if (entity.type === "HNWI" && relCount < 2 && !hasCorporateHint) {
    suggestions.push({
      entityId: entity.id,
      persona: "business_engineer",
      category: "structure",
      priority: "medium",
      title: "No corporate vehicle linkage detected",
      description:
        "HNWI with no visible corporate structure. Ultra-HNW individuals almost always hold assets through " +
        "offshore trusts, family offices, or SPV holding companies. " +
        "Check: BVI company registers, Cayman Islands filings, UK LLP disclosure registers, " +
        "SEC Schedule 13G nominee block-holder filings.",
      actionTaken: "Corporate-vehicle gap noted — offshore structure search recommended.",
    });
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 5 — UX Designer
// Focuses on profile display completeness and visual data richness
// ─────────────────────────────────────────────────────────────────────────────

async function runUxDesigner(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];

  const mappableAssets = await db
    .select({ id: assetsTable.id })
    .from(assetsTable)
    .where(
      sql`${assetsTable.ownerEntityId} = ${entity.id} AND ${assetsTable.latitude} IS NOT NULL`
    )
    .limit(1);

  if (mappableAssets.length === 0) {
    suggestions.push({
      entityId: entity.id,
      persona: "ux_designer",
      category: "display",
      priority: "medium",
      title: "No geolocated assets — profile map is empty",
      description:
        "The Apex Profile mini-map needs at least one asset with GPS coordinates. " +
        "Without it, the profile shows a blank grey tile. " +
        "Geotag registered assets using known addresses: mansion postcodes → lat/lon via geocoding, " +
        "marina berth locations, airport ICAO codes for aircraft.",
      actionTaken: "Geo-missing flag set — coordinate enrichment recommended for map display.",
    });
  }

  if (!entity.notes || entity.notes.trim().length < 50) {
    suggestions.push({
      entityId: entity.id,
      persona: "ux_designer",
      category: "display",
      priority: "low",
      title: "Profile notes too sparse for effective operator briefing",
      description:
        "The notes field is empty or very short. Operators using the profile during live outreach prep " +
        "need a quick situational brief: background, known interests, sporting affiliations, known associates, " +
        "public personality traits. A 100–300 word brief significantly improves outreach personalisation.",
      actionTaken: "Notes quality flag: < 50 chars. Briefing notes recommended.",
    });
  }

  const name = entity.name.trim();
  if (name.split(" ").length < 2) {
    suggestions.push({
      entityId: entity.id,
      persona: "ux_designer",
      category: "display",
      priority: "low",
      title: "Single-word name — may cause display and matching ambiguity",
      description:
        `Entity name "${name}" has only one word. Full names (given + family) are required for ` +
        "disambiguation in search results and personalised pitch generation. " +
        "Cross-check source filings for the full registered name.",
      actionTaken: "Single-word name logged — full name lookup recommended.",
    });
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persona 6 — Architect
// Focuses on classification accuracy and deduplication
// ─────────────────────────────────────────────────────────────────────────────

async function runArchitect(entity: Entity): Promise<ImprovementSuggestion[]> {
  const suggestions: ImprovementSuggestion[] = [];

  // Type-vs-name heuristic checks
  const nameLower = entity.name.toLowerCase();
  const corpTerms = [" ltd", " llc", " inc", " corp", " plc", " gmbh", " sa ", " ag ", " bv", " holding", " group", " fund", " trust", " capital", " asset"];
  const looksLikeCorp = corpTerms.some(t => nameLower.includes(t));

  if (entity.type === "HNWI" && looksLikeCorp) {
    suggestions.push({
      entityId: entity.id,
      persona: "architect",
      category: "classification",
      priority: "high",
      title: "HNWI classification may be incorrect — name suggests corporate entity",
      description:
        `Entity name "${entity.name}" contains corporate/legal suffixes but is typed as HNWI. ` +
        "Misclassification affects MCTS weighting, graph clustering, and CRM track assignment. " +
        "Review the original registry filing to determine whether this is an individual or a legal vehicle.",
      actionTaken: "Classification anomaly flag: name pattern inconsistent with HNWI type.",
    });
  }

  const personTerms = ["mr ", "ms ", "mrs ", "dr ", "sir ", "lord ", "baron", "count"];
  const looksLikePerson = personTerms.some(t => nameLower.startsWith(t));
  if (entity.type === "Corporation" && looksLikePerson) {
    suggestions.push({
      entityId: entity.id,
      persona: "architect",
      category: "classification",
      priority: "medium",
      title: "Corporation classification may be incorrect — name suggests an individual",
      description:
        `Entity name "${entity.name}" appears to be a personal name (title prefix detected) but is classified ` +
        "as Corporation. If this is an individual, reclassify to HNWI or Gatekeeper for correct graph placement.",
      actionTaken: "Classification anomaly flag: personal-name pattern in Corporation entity.",
    });
  }

  // Check for potential near-duplicate by name fragment
  const firstWord = entity.name.split(" ")[0];
  if (firstWord && firstWord.length > 3) {
    const potentialDuplicates = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name })
      .from(entitiesTable)
      .where(
        sql`${entitiesTable.id} != ${entity.id} AND lower(${entitiesTable.name}) LIKE ${`%${firstWord.toLowerCase()}%`}`
      )
      .limit(3);

    if (potentialDuplicates.length > 0) {
      const dupNames = potentialDuplicates.map(d => `"${d.name}" (id:${d.id})`).join(", ");
      suggestions.push({
        entityId: entity.id,
        persona: "architect",
        category: "classification",
        priority: "medium",
        title: "Potential duplicate entity detected",
        description:
          `Name fragment "${firstWord}" matches ${potentialDuplicates.length} other entity record(s): ${dupNames}. ` +
          "Duplicate entities fragment the graph, split asset ownership, and dilute Bayesian scores. " +
          "Review each match and merge if they refer to the same individual/corporation.",
        actionTaken: `Potential duplicate candidates flagged: ${potentialDuplicates.map(d => d.id).join(", ")}.`,
      });
    }
  }

  // Metadata structure check
  const metadataStr = entity.metadata ?? "{}";
  const hasMetadata = metadataStr !== "{}" && metadataStr.trim().length > 10;
  if (!hasMetadata) {
    suggestions.push({
      entityId: entity.id,
      persona: "architect",
      category: "classification",
      priority: "low",
      title: "Metadata payload is empty — enrichment context missing",
      description:
        "The metadata JSON blob is empty or minimal. Metadata carries structured enrichment: " +
        "source registry filing IDs, jurisdiction codes, company numbers, title/prefix, SEC CIK, " +
        "GLEIF LEI, and other machine-readable identifiers used by search and graph ranking.",
      actionTaken: "Empty-metadata flag logged — structured enrichment recommended.",
    });
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public — run all personas for one entity
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA_RUNNERS: Record<PersonaId, (e: Entity) => Promise<ImprovementSuggestion[]>> = {
  data_engineer: runDataEngineer,
  data_analyst: runDataAnalyst,
  mcts_expert: runMctsExpert,
  business_engineer: runBusinessEngineer,
  ux_designer: runUxDesigner,
  architect: runArchitect,
};

export const ALL_PERSONAS: PersonaId[] = Object.keys(PERSONA_RUNNERS) as PersonaId[];

export async function runPersonasForEntity(entity: Entity): Promise<ImprovementSuggestion[]> {
  const results: ImprovementSuggestion[] = [];
  for (const personaId of ALL_PERSONAS) {
    try {
      const suggestions = await PERSONA_RUNNERS[personaId](entity);
      results.push(...suggestions);
    } catch (err: any) {
      logger.warn({ err: err.message, persona: personaId, entityId: entity.id }, "Persona run failed");
    }
  }
  return results;
}

export const PERSONA_META: Record<PersonaId, { label: string; icon: string; color: string }> = {
  data_engineer:    { label: "Data Engineer",    icon: "Database",      color: "#3B82F6" },
  data_analyst:     { label: "Data Analyst",     icon: "TrendingUp",    color: "#10B981" },
  mcts_expert:      { label: "MCTS Expert",      icon: "GitBranch",     color: "#A855F7" },
  business_engineer:{ label: "Business Engineer",icon: "Briefcase",     color: "#F59E0B" },
  ux_designer:      { label: "UX Designer",      icon: "Palette",       color: "#EC4899" },
  architect:        { label: "Architect",         icon: "Layers",        color: "#06B6D4" },
};
