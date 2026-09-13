import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";

/**
 * Hidden entities are an application-level visibility boundary, not merely a
 * list filter. Entity-specific read endpoints must not disclose their names,
 * metadata, contact evidence, graph neighborhood, or enrichment payloads.
 */
export async function entityVisibilityGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== "GET" && !(req.method === "POST" && /\/entities\/\d+\/refresh-surface\/?$/.test(req.path))) {
    next();
    return;
  }
  const match = req.path.match(/^\/entities\/(\d+)(?:\/|$)/);
  if (!match) {
    next();
    return;
  }
  const entityId = Number(match[1]);
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    res.status(400).json({ error: "Invalid entity ID" });
    return;
  }
  const [entity] = await db
    .select({ id: entitiesTable.id, isHidden: entitiesTable.isHidden })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, entityId))
    .limit(1);
  if (!entity || entity.isHidden) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  next();
}
