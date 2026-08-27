/**
 * Admit discovery-agent candidates into the ledger (person entities, review notes).
 */
import { db, entitiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { DiscoveryCandidate } from "./discovery-agent";
import { logger } from "./logger";

export async function createEntityFromDiscoveryCandidate(
  c: DiscoveryCandidate,
): Promise<number | null> {
  const name = c.name.trim();
  if (name.length < 3) return null;
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
  ]
    .filter(Boolean)
    .join("\n");

  const [row] = await db
    .insert(entitiesTable)
    .values({
      name,
      type: "HNWI",
      bayesianScore: 0.28,
      notes,
      sourceRegistries: JSON.stringify(["discovery-agent"]),
      metadata: JSON.stringify({
        discoveryAgent: true,
        lane: c.lane,
        sourceUrls: c.sourceUrls?.slice(0, 8) ?? [],
        role: c.role,
        company: c.company,
      }),
      contactConfidence: 0,
      contactOutcome: "evidence_only",
    })
    .returning({ id: entitiesTable.id });

  logger.info({ id: row?.id, name }, "[discovery-agent-admit] inserted");
  return row?.id ?? null;
}
