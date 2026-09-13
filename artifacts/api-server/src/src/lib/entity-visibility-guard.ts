import type { Request, Response, NextFunction } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";

/**
 * Hidden entities are an application-level visibility boundary, not merely a
 * list filter. Entity-specific reads must not disclose their metadata, contact
 * evidence, graph neighborhood, assets, or relationships.
 */
export async function entityVisibilityGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const entityIds: number[] = [];
  if (req.method === "GET") {
    const path = req.path;
    if (/^\/entities\/\d+(?:\/|$)/.test(path)) {
      const match = path.match(/^\/entities\/(\d+)/);
      if (match) entityIds.push(Number(match[1]));
    }
    if (path === "/assets" || path.startsWith("/assets/")) {
      for (const key of ["entityId", "ownerEntityId"]) {
        const value = req.query[key];
        if (typeof value === "string" && /^\d+$/.test(value)) entityIds.push(Number(value));
      }
    }
    if (path === "/relationships" || path.startsWith("/relationships/")) {
      for (const key of ["sourceEntityId", "targetId", "entityId"]) {
        const value = req.query[key];
        if (typeof value === "string" && /^\d+$/.test(value)) entityIds.push(Number(value));
      }
    }
  } else if (req.method === "POST" && /\/entities\/\d+\/refresh-surface\/?$/.test(req.path)) {
    const match = req.path.match(/^\/entities\/(\d+)/);
    if (match) entityIds.push(Number(match[1]));
  }

  const uniqueIds = [...new Set(entityIds)].filter((id) => Number.isSafeInteger(id) && id > 0);
  if (uniqueIds.length === 0) {
    next();
    return;
  }

  const visible = await db
    .select({ id: entitiesTable.id })
    .from(entitiesTable)
    .where(and(inArray(entitiesTable.id, uniqueIds), eq(entitiesTable.isHidden, false)));
  const visibleIds = new Set(visible.map((entity) => entity.id));
  if (uniqueIds.some((id) => !visibleIds.has(id))) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  next();
}
