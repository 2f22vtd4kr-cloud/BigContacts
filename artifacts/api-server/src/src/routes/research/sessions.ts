import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, entitiesTable, researchEvidenceTable, researchRunEventsTable, researchSessionsTable } from "@workspace/db";
import {
  ListResearchSessionsQueryParams,
  GetResearchSessionParams,
  UpdateResearchStatusParams,
  UpdateResearchStatusBody,
} from "@workspace/api-zod";
import { canApproveForManualOutreach, getSafeUseDecision, type SafeUseStatus } from "../../lib/safe-use";

const router = Router();

function candidateFunnelFromMetadata(metadata: string | null | undefined): unknown {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return parsed.deepWebCandidateFunnel ?? null;
  } catch {
    return null;
  }
}

// GET /research/sessions
router.get("/research/sessions", async (req, res): Promise<void> => {
  const parsed = ListResearchSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId, status, limit = 50 } = parsed.data;

  const rows = await db
    .select({ session: researchSessionsTable, entityName: entitiesTable.name, entityMetadata: entitiesTable.metadata })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .orderBy(desc(researchSessionsTable.createdAt))
    .limit(limit);

  const sessions = rows
    .filter((r) => {
      if (entityId && r.session.targetEntityId !== entityId) return false;
      if (status && r.session.crmStatus !== status) return false;
      return true;
    })
    .map(({ session, entityName, entityMetadata }) => ({
      ...session,
      targetEntityName: entityName ?? null,
      candidateFunnel: candidateFunnelFromMetadata(entityMetadata),
      createdAt: session.createdAt.toISOString(),
    }));

  res.json(sessions);
});

// GET /research/sessions/:id
router.get("/research/sessions/:id", async (req, res): Promise<void> => {
  const params = GetResearchSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ session: researchSessionsTable, entityName: entitiesTable.name, entityMetadata: entitiesTable.metadata })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .where(eq(researchSessionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  res.json({
    ...row.session,
    targetEntityName: row.entityName ?? null,
    candidateFunnel: candidateFunnelFromMetadata(row.entityMetadata),
    createdAt: row.session.createdAt.toISOString(),
    safeUse: getSafeUseDecision(row.session.safeUseStatus),
  });
});

// GET /research/sessions/:id/evidence
router.get("/research/sessions/:id/evidence", async (req, res): Promise<void> => {
  const params = GetResearchSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select({ id: researchSessionsTable.id })
    .from(researchSessionsTable)
    .where(eq(researchSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  const rows = await db
    .select()
    .from(researchEvidenceTable)
    .where(eq(researchEvidenceTable.sessionId, params.data.id))
    .orderBy(desc(researchEvidenceTable.createdAt));

  res.json(rows.map((row) => ({
    ...row,
    observedAt: row.observedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    validFrom: row.validFrom?.toISOString() ?? null,
    validTo: row.validTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  })));
});

// GET /research/sessions/:id/audit
router.get("/research/sessions/:id/audit", async (req, res): Promise<void> => {
  const params = GetResearchSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .select({ id: researchSessionsTable.id })
    .from(researchSessionsTable)
    .where(eq(researchSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }
  const rows = await db
    .select()
    .from(researchRunEventsTable)
    .where(eq(researchRunEventsTable.sessionId, params.data.id))
    .orderBy(desc(researchRunEventsTable.createdAt));
  res.json(rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  })));
});

// PATCH /research/sessions/:id/safety
// This approves a draft for manual review only; it never sends or schedules contact.
router.patch("/research/sessions/:id/safety", async (req, res): Promise<void> => {
  const params = GetResearchSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const status = req.body?.status as SafeUseStatus;
  const reviewerNote = typeof req.body?.reviewerNote === "string" ? req.body.reviewerNote.trim() : "";
  if (!["manual_review", "approved_for_manual_outreach", "blocked"].includes(status)) {
    res.status(400).json({ error: "status must be manual_review, approved_for_manual_outreach, or blocked." });
    return;
  }
  const [existing] = await db
    .select()
    .from(researchSessionsTable)
    .where(eq(researchSessionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }
  if (
    status === "approved_for_manual_outreach" &&
    !canApproveForManualOutreach({
      reviewerNote,
      identityScore: existing.identityScore,
      accessScore: existing.accessScore,
    })
  ) {
    res.status(422).json({
      error: "Manual approval requires a reviewer note, identity score ≥ 0.65, and access score ≥ 0.35.",
    });
    return;
  }
  const [updated] = await db
    .update(researchSessionsTable)
    .set({
      safeUseStatus: status,
      safeUseReviewedAt: status === "manual_review" ? null : new Date(),
      safeUseNote: reviewerNote || null,
      updatedAt: new Date(),
    })
    .where(eq(researchSessionsTable.id, params.data.id))
    .returning();
  res.json({
    ...updated,
    safeUse: getSafeUseDecision(updated!.safeUseStatus),
  });
});

// PATCH /research/sessions/:id/status
router.patch("/research/sessions/:id/status", async (req, res): Promise<void> => {
  const params = UpdateResearchStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateResearchStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {
    crmStatus: body.data.crmStatus,
    updatedAt: new Date(),
  };
  if (body.data.lastContactDate) updateData.lastContactDate = body.data.lastContactDate;
  // Accept notes and followUpDate from request body even if not in Zod schema
  const extra = req.body as Record<string, unknown>;
  if (typeof extra.notes === "string" || extra.notes === null) updateData.notes = extra.notes;
  if (typeof extra.followUpDate === "string" || extra.followUpDate === null) updateData.followUpDate = extra.followUpDate;

  const [session] = await db
    .update(researchSessionsTable)
    .set(updateData)
    .where(eq(researchSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  const [entityRow] = await db
    .select({ name: entitiesTable.name })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, session.targetEntityId));

  res.json({
    ...session,
    targetEntityName: entityRow?.name ?? null,
    createdAt: session.createdAt.toISOString(),
    safeUse: getSafeUseDecision(session.safeUseStatus),
  });
});

export default router;
