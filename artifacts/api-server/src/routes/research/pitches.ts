import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, entitiesTable, assetsTable, researchSessionsTable } from "@workspace/db";
import { GeneratePitchParams } from "@workspace/api-zod";
import { generateOutreachSequence } from "../../lib/pitch-generator";

const router = Router();

// POST /research/sessions/:id/pitch
router.post("/research/sessions/:id/pitch", async (req, res): Promise<void> => {
  const params = GeneratePitchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ session: researchSessionsTable, entity: entitiesTable })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .where(eq(researchSessionsTable.id, params.data.id));

  if (!row || !row.entity) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  const { session, entity } = row;

  const targetAssets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entity.id));

  let winningPath: any[] = [];
  try {
    winningPath = session.winningPath ? JSON.parse(session.winningPath) : [];
  } catch {
    winningPath = [];
  }

  const gatekeeper = winningPath.find(
    (p: { role: string }) => p.role === "GATEKEEPER",
  ) ?? null;

  const safeGatekeeper =
    gatekeeper &&
    typeof gatekeeper === "object" &&
    typeof (gatekeeper as any).label === "string"
      ? gatekeeper
      : null;

  let sequence: ReturnType<typeof generateOutreachSequence>;
  try {
    sequence = generateOutreachSequence({
      targetEntity: {
        name: entity.name,
        type: entity.type,
        nationality: entity.nationality,
        estimatedNetWorth: entity.estimatedNetWorth,
        knownResidences: entity.knownResidences,
        notes: entity.notes,
        contactEmail: entity.contactEmail ?? null,
        contactPhone: entity.contactPhone ?? null,
      },
      gatekeeper: safeGatekeeper,
      assets: targetAssets.map((a) => ({
        category: a.category,
        identifier: a.identifier,
        jurisdiction: a.jurisdiction,
        estimatedValue: a.estimatedValue,
        address: a.address,
      })),
      winningPath,
      pathScore: session.pathScore ?? 0,
    });
  } catch (pitchErr: any) {
    console.error("[pitch-generator] Uncaught error:", pitchErr?.message ?? pitchErr);
    res.status(500).json({
      error:
        `Pitch generation failed: ${pitchErr?.message ?? "Unknown error"}. ` +
        "Check gatekeeper type and winning path data.",
    });
    return;
  }

  const [updated] = await db
    .update(researchSessionsTable)
    .set({
      generatedPitch: JSON.stringify(sequence),
      crmStatus: "Pitch Generated",
      updatedAt: new Date(),
    })
    .where(eq(researchSessionsTable.id, params.data.id))
    .returning();

  res.json({
    ...updated!,
    targetEntityName: entity.name,
    createdAt: updated!.createdAt.toISOString(),
  });
});

// POST /research/backfill-pitches — generate pitches for all sessions that lack one
router.post("/research/backfill-pitches", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(researchSessionsTable)
    .where(sql`${researchSessionsTable.generatedPitch} IS NULL`);

  let updated = 0;
  let errors = 0;

  for (const s of sessions) {
    try {
      const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, s.targetEntityId));
      if (!entity) { errors++; continue; }

      const entityAssets = await db.select().from(assetsTable).where(eq(assetsTable.ownerEntityId, s.targetEntityId));
      const winningPath = (() => { try { return JSON.parse(s.winningPath ?? "[]"); } catch { return []; } })();
      const gatekeeper = winningPath.find((p: { role: string }) => p.role === "GATEKEEPER") ?? null;

      const outreach = generateOutreachSequence({
        targetEntity: {
          name: entity.name, type: entity.type, nationality: entity.nationality,
          estimatedNetWorth: entity.estimatedNetWorth, knownResidences: entity.knownResidences,
          notes: entity.notes, contactEmail: entity.email, contactPhone: entity.phone,
        },
        gatekeeper,
        assets: entityAssets.map((a) => ({
          category: a.category, identifier: a.identifier, jurisdiction: a.jurisdiction,
          estimatedValue: a.estimatedValue, address: a.address,
        })),
        winningPath,
        pathScore: s.pathScore ?? 0,
      });

      const pitchText = [
        outreach.initial,
        "---\n**7-day follow-up:**",
        outreach.followUp,
        "---\n**Intro script for gatekeeper:**",
        outreach.introScript,
      ].join("\n\n");

      await db.update(researchSessionsTable)
        .set({ generatedPitch: pitchText, crmStatus: "Pitch Generated", updatedAt: new Date() })
        .where(eq(researchSessionsTable.id, s.id));
      updated++;
    } catch {
      errors++;
    }
  }

  res.json({ updated, errors, message: `Backfilled pitches for ${updated} sessions (${errors} errors).` });
});

export default router;
