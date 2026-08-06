import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  entitiesTable,
  researchCaseEventsTable,
  researchCasesTable,
} from "@workspace/db";
import {
  AddResearchCaseDirectiveBody,
  AddResearchCaseDirectiveParams,
  AdvanceResearchCaseParams,
  GetResearchCaseParams,
  ListResearchCaseEventsParams,
  ListResearchCaseEventsQueryParams,
  OpenResearchCaseBody,
} from "@workspace/api-zod";
import {
  advanceCaseFile,
  buildInitialCaseFile,
  parseCaseFile,
} from "../../lib/case-bureau";

const router = Router();

function serializeCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  return {
    ...row,
    targetEntityName: entity?.name ?? null,
    targetEntityType: entity?.type ?? null,
    lastDecisionAt: row.lastDecisionAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findCase(entityId: number) {
  const [row] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.targetEntityId, entityId)).limit(1);
  return row ?? null;
}

router.post("/research/cases", async (req, res): Promise<void> => {
  const parsed = OpenResearchCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId, objective, motivation, directorModel } = parsed.data;
  const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, entityId));
  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  const existing = await findCase(entityId);
  if (existing) {
    res.status(200).json(serializeCase(existing, entity));
    return;
  }
  const caseFile = buildInitialCaseFile(entity);
  const [created] = await db.insert(researchCasesTable).values({
    targetEntityId: entityId,
    objective: objective?.trim() || "Find the strongest practical public route to the target and map the surrounding ownership and relationship context.",
    motivation: motivation?.trim() || "Search broadly across public life, organizations, people, venues, digital traces, and relationship paths; return an organized case for human judgment.",
    directorModel: directorModel?.trim() || null,
    caseFile: JSON.stringify(caseFile),
    currentAction: caseFile.nextBestAction?.id ?? null,
    iteration: 0,
    status: "ready",
  }).returning();
  if (!created) {
    res.status(500).json({ error: "Unable to open research case" });
    return;
  }
  await db.insert(researchCaseEventsTable).values({
    caseId: created.id,
    actorRole: "head_investigator",
    eventType: "case_opened",
    summary: "Case opened with a target-scoped bureau roster and initial action queue.",
    payload: JSON.stringify({ actionCount: caseFile.actionQueue.length, specialistCount: caseFile.specialistRoster.length }),
  });
  res.status(201).json(serializeCase(created, entity));
});

router.get("/research/cases/:entityId", async (req, res): Promise<void> => {
  const params = GetResearchCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select({
    case: researchCasesTable,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
  }).from(researchCasesTable)
    .leftJoin(entitiesTable, eq(researchCasesTable.targetEntityId, entitiesTable.id))
    .where(eq(researchCasesTable.targetEntityId, params.data.entityId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  res.json(serializeCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.post("/research/cases/:entityId/advance", async (req, res): Promise<void> => {
  const params = AdvanceResearchCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  const nextIteration = current.iteration + 1;
  const updatedFile = advanceCaseFile(file, nextIteration);
  const now = new Date();
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    currentAction: updatedFile.nextBestAction?.id ?? null,
    iteration: nextIteration,
    status: updatedFile.nextBestAction ? "active" : "review",
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  const action = updatedFile.nextBestAction;
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: nextIteration,
    actorRole: "head_investigator",
    eventType: "decision",
    summary: action ? `Assigned ${action.title} to ${action.specialistId}.` : "No queued action remains; case is ready for review.",
    payload: JSON.stringify({ action, decision: updatedFile.decisionLog.at(-1) }),
  });
  const [entity] = await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId));
  res.json(serializeCase(updated!, entity ?? null));
});

router.post("/research/cases/:entityId/directive", async (req, res): Promise<void> => {
  const params = AddResearchCaseDirectiveParams.safeParse(req.params);
  const body = AddResearchCaseDirectiveBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  const directive = body.data.directive.trim();
  const updatedFile = {
    ...file,
    humanDirectives: [...file.humanDirectives, directive].slice(-30),
    lastUpdatedBy: "human-operator",
  };
  const now = new Date();
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: current.iteration,
    actorRole: "human_operator",
    eventType: "directive",
    summary: directive,
    payload: JSON.stringify({ directive }),
  });
  const [entity] = await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId));
  res.json(serializeCase(updated!, entity ?? null));
});

router.get("/research/cases/:entityId/events", async (req, res): Promise<void> => {
  const params = ListResearchCaseEventsParams.safeParse(req.params);
  const query = ListResearchCaseEventsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: !params.success ? params.error.message : query.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const rows = await db.select().from(researchCaseEventsTable)
    .where(eq(researchCaseEventsTable.caseId, current.id))
    .orderBy(desc(researchCaseEventsTable.createdAt))
    .limit(query.data.limit);
  res.json(rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  })));
});

export default router;