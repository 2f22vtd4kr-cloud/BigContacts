import { Router, type IRouter } from "express";
import { eq, isNotNull } from "drizzle-orm";
import { db, relationshipsTable, entitiesTable, assetsTable } from "@workspace/db";
import {
  ListRelationshipsQueryParams,
  CreateRelationshipBody,
  DeleteRelationshipParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /relationships
router.get("/relationships", async (req, res): Promise<void> => {
  const parsed = ListRelationshipsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId } = parsed.data;

  const rows = entityId
    ? await db.select().from(relationshipsTable).where(eq(relationshipsTable.sourceEntityId, entityId))
    : await db.select().from(relationshipsTable).orderBy(relationshipsTable.createdAt);

  // Resolve names for display
  const allEntityIds = new Set<number>();
  const allAssetIds = new Set<number>();
  for (const r of rows) {
    allEntityIds.add(r.sourceEntityId);
    if (r.targetType === "Entity") allEntityIds.add(r.targetId);
    if (r.targetType === "Asset") allAssetIds.add(r.targetId);
  }

  const entityNames: Record<number, string> = {};
  const assetNames: Record<number, string> = {};

  if (allEntityIds.size > 0) {
    const entityRows = await db.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable);
    for (const e of entityRows) entityNames[e.id] = e.name;
  }
  if (allAssetIds.size > 0) {
    const assetRows = await db.select({ id: assetsTable.id, identifier: assetsTable.identifier, category: assetsTable.category }).from(assetsTable);
    for (const a of assetRows) assetNames[a.id] = `${a.category}: ${a.identifier}`;
  }

  const relationships = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    sourceEntityName: entityNames[r.sourceEntityId] ?? null,
    targetName: r.targetType === "Entity" ? (entityNames[r.targetId] ?? null) : (assetNames[r.targetId] ?? null),
  }));

  res.json(relationships);
});

// POST /relationships
router.post("/relationships", async (req, res): Promise<void> => {
  const parsed = CreateRelationshipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rel] = await db.insert(relationshipsTable).values(parsed.data).returning();
  res.status(201).json({ ...rel!, createdAt: rel!.createdAt.toISOString(), sourceEntityName: null, targetName: null });
});

// DELETE /relationships/:id
router.delete("/relationships/:id", async (req, res): Promise<void> => {
  const params = DeleteRelationshipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(relationshipsTable)
    .where(eq(relationshipsTable.id, params.data.id))
    .returning({ id: relationshipsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Relationship not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /api/relationships/auto-detect — shared-address co-ownership detection
router.post("/relationships/auto-detect", async (_req, res): Promise<void> => {
  // Load entities with known residences
  const entities = await db
    .select({ id: entitiesTable.id, name: entitiesTable.name, knownResidences: entitiesTable.knownResidences })
    .from(entitiesTable)
    .where(isNotNull(entitiesTable.knownResidences));

  // Build address → entityId[] index
  const addressIndex = new Map<string, number[]>();
  for (const e of entities) {
    let addrs: string[] = [];
    try { addrs = JSON.parse(e.knownResidences ?? "[]"); } catch {}
    for (const addr of addrs) {
      const key = addr.toLowerCase().replace(/\s+/g, " ").trim();
      if (!key) continue;
      if (!addressIndex.has(key)) addressIndex.set(key, []);
      addressIndex.get(key)!.push(e.id);
    }
  }

  // Load existing relationships to stay idempotent
  const existing = await db
    .select({ sourceEntityId: relationshipsTable.sourceEntityId, targetId: relationshipsTable.targetId, relationshipType: relationshipsTable.relationshipType })
    .from(relationshipsTable);
  const seen = new Set(existing.map((r) => `${r.sourceEntityId}:${r.targetId}:${r.relationshipType}`));

  let created = 0;
  let skipped = 0;

  for (const [, ids] of addressIndex) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i]!;
        const b = unique[j]!;
        const fwd = `${a}:${b}:KNOWN_ASSOCIATE`;
        const rev = `${b}:${a}:KNOWN_ASSOCIATE`;
        if (seen.has(fwd) || seen.has(rev)) { skipped++; continue; }
        await db.insert(relationshipsTable).values({
          sourceEntityId: a,
          targetId: b,
          targetType: "Entity",
          relationshipType: "KNOWN_ASSOCIATE",
          strength: 0.6,
          notes: "Auto-detected: shared correspondence address",
        });
        seen.add(fwd);
        created++;
      }
    }
  }

  res.json({ created, skipped, message: `Auto-detect complete: ${created} new relationships, ${skipped} already existed.` });
});

export default router;
