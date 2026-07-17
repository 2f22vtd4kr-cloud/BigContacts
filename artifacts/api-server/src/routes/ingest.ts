/**
 * Data Ingest Routes — admin-only endpoints for triggering registry data refresh.
 *
 * All routes require Authorization: Bearer <ADMIN_TOKEN> header.
 * ADMIN_TOKEN defaults to SESSION_SECRET if ADMIN_TOKEN is not set explicitly.
 *
 * POST /ingest/faa     — Seed FAA-registry-pattern aviation entities (mock implementation;
 *                        a live version would download ReleasableAircraft.zip and parse
 *                        MASTER.txt + ACFTREF.txt via streaming CSV)
 * POST /ingest/extend  — Trigger extended mock dataset seed (idempotent)
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, assetsTable, entitiesTable, relationshipsTable } from "@workspace/db";
import { seedExtendedData } from "../lib/mock-data";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Admin authorization middleware ────────────────────────────────────────────
// Requires Authorization: Bearer <token> where token matches ADMIN_TOKEN env var
// (falls back to SESSION_SECRET if ADMIN_TOKEN is not explicitly set).

function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env["ADMIN_TOKEN"] ?? process.env["SESSION_SECRET"];

  if (!adminToken) {
    // No token configured — block all access to ingest routes
    res.status(503).json({
      error: "Ingest routes unavailable: ADMIN_TOKEN or SESSION_SECRET must be set.",
    });
    return;
  }

  const authHeader = req.headers["authorization"] ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || token !== adminToken) {
    res.status(403).json({
      error: "Forbidden. Ingest routes require Authorization: Bearer <ADMIN_TOKEN>.",
    });
    return;
  }

  next();
}

// Apply admin guard to all routes in this router
router.use("/ingest", adminOnly);

// POST /ingest/faa
router.post("/ingest/faa", async (_req, res): Promise<void> => {
  try {
    // Trigger the extended seed (includes all Aviation assets — idempotent)
    await seedExtendedData();

    // Return current aviation asset count
    const aviation = await db
      .select({
        id: assetsTable.id,
        identifier: assetsTable.identifier,
        jurisdiction: assetsTable.jurisdiction,
        description: assetsTable.description,
        ownerEntityId: assetsTable.ownerEntityId,
      })
      .from(assetsTable)
      .where(eq(assetsTable.category, "Aviation"));

    res.json({
      status: "ok",
      message: `FAA ingest complete. ${aviation.length} aircraft records now in registry.`,
      aircraftCount: aviation.length,
      records: aviation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Ingest failed" });
  }
});

// POST /ingest/extend — trigger the full extended mock dataset seed
router.post("/ingest/extend", async (_req, res): Promise<void> => {
  try {
    await seedExtendedData();

    const [entityCount, assetCount, relCount] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable).then(r => r[0]?.cnt ?? 0),
      db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable).then(r => r[0]?.cnt ?? 0),
      db.select({ cnt: sql<number>`count(*)::int` }).from(relationshipsTable).then(r => r[0]?.cnt ?? 0),
    ]);

    res.json({
      status: "ok",
      message: "Extended seed complete.",
      totals: { entities: entityCount, assets: assetCount, relationships: relCount },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Extended seed failed" });
  }
});

export default router;
