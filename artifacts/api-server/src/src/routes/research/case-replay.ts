import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db, researchCaseEventsTable, researchCasesTable } from "@workspace/db";
import { replayResearchCaseEvents } from "../../lib/research-case-replay";

const router = Router();
const MAX_REPLAY_EVENTS = 5_000;

/**
 * Reconstruct operator-visible case state from append-only events.
 * This endpoint is read-only: it never executes research and never mutates caseFile.
 * Event id is the immutable ledger sequence; wall-clock time is metadata only.
 */
router.get("/research/bureau/cases/:caseId/replay", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    res.status(400).json({ error: "Invalid bureau case ID" });
    return;
  }

  const [current] = await db.select({ id: researchCasesTable.id })
    .from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }

  const rows = await db.select().from(researchCaseEventsTable)
    .where(eq(researchCaseEventsTable.caseId, caseId))
    .orderBy(asc(researchCaseEventsTable.id))
    .limit(MAX_REPLAY_EVENTS);

  const replay = replayResearchCaseEvents(rows.map((row) => ({
    id: row.id,
    caseId: row.caseId,
    iteration: row.iteration,
    actorRole: row.actorRole,
    eventType: row.eventType,
    status: row.status,
    summary: row.summary,
    payload: row.payload,
    createdAt: row.createdAt,
  })));

  res.json({
    caseId,
    replay,
    eventLimit: MAX_REPLAY_EVENTS,
    truncated: rows.length >= MAX_REPLAY_EVENTS,
    source: "research_case_events",
  });
});

export default router;
