/**
 * Admit discovery-agent candidates into the ledger (person entities, review notes).
 * Uses target-fitness fame/shell gates only for the legacy non-model-selected path.
 */
import { db, entitiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isWellFormedPersonCandidate, type DiscoveryCandidate } from "./discovery-agent";
import { logger } from "./logger";
import { evaluateTargetFitness, shouldRejectTarget } from "./target-fitness";

export async function createEntityFromDiscoveryCandidate(
  c: DiscoveryCandidate,
  options: { modelSelected?: boolean } = {},
): Promise<number | null> {
  const name = c.name.trim();
  if (name.length < 3) return null;

  if (options.modelSelected) {
    // Durable admission requires the investigator's explicit promotion decision.
    if (c.promotionDecision !== "promote") {
      logger.info({ name }, "[discovery-agent-admit] rejected: no explicit investigator promotion decision");
      return null;
    }
    // Model-selected discovery is deliberately not ranked, scored, or filtered
    // by target fitness. Only identity/provenance safety is enforced here.
    if (!isWellFormedPersonCandidate(c)) {
      logger.info({ name }, "[discovery-agent-admit] rejected malformed model-selected person candidate");
      return null;
    }
  }

  const fitness = options.modelSelected
    ? null
    : evaluateTargetFitness({
      name,
      notes: [c.basis, c.role, c.company].filter(Boolean).join(" | "),
    });
  if (fitness && shouldRejectTarget(fitness)) {
    logger.info({ name, fit: fitness.fit, reasons: fitness.reasons }, "[discovery-agent-admit] rejected by fitness");
    return null;
  }

  const existing = await db
    .select({ id: entitiesTable.id })
    .from(entitiesTable)
    .where(sql`lower(${entitiesTable.name}) = ${name.toLowerCase()}`)
    .limit(1);
  if (existing[0]?.id) return existing[0].id;

  const notes = [
    `Discovery agent: ${c.basis}`,
    c.role ? `Role: ${c.role}` : null,
    c.company ? `Company: ${c.company}` : null,
    c.sourceUrls?.length ? `Sources: ${c.sourceUrls.slice(0, 4).join(" | ")}` : null,
    fitness ? `Fitness: ${fitness.fit} (${fitness.reasons.slice(0, 2).join("; ")})` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const [row] = await db
    .insert(entitiesTable)
    .values({
      name,
      type: "HNWI",
      // Do not synthesize a discovery score. Model-selected admission preserves
      // model order; the value below is only a neutral seed for legacy list UI.
      bayesianScore: options.modelSelected ? 0.2 : Math.max(0.2, Math.min(0.45, fitness?.score ?? 0.2)),
      notes,
      sourceRegistries: JSON.stringify(["discovery-agent"]),
      metadata: JSON.stringify({
        discoveryAgent: true,
        lane: c.lane,
        sourceUrls: c.sourceUrls?.slice(0, 8) ?? [],
        role: c.role,
        company: c.company,
        promotionDecision: c.promotionDecision,
        promotionReason: c.promotionReason,
        ...(fitness ? { fitness: fitness.fit } : {}),
      }),
      contactConfidence: 0,
      contactOutcome: "evidence_only",
    })
    .returning({ id: entitiesTable.id });

  logger.info({ id: row?.id, name, modelSelected: options.modelSelected === true }, "[discovery-agent-admit] inserted");
  return row?.id ?? null;
}
