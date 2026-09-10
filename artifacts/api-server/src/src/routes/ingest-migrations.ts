/**
 * Ingest Migration Routes
 *
 * One-time and repeatable backfill/sync operations that keep existing data clean.
 * Apex person identity and access-state mutations are deliberately excluded from
 * deterministic migrations: those decisions belong to the canonical model-owned
 * research/adjudication path.
 *
 * POST /ingest/sync-faa-coordinates     — backfill lat/lng for FAA assets
 * POST /ingest/reclassify-entity-types  — re-run classifyEntityType() on non-Apex entities
 * POST /ingest/fix-faa-names            — normalize FAA "LAST FIRST" → "First Last"
 * POST /ingest/fix-edgar-names          — retired for Apex identity safety
 * POST /ingest/sync-hot-flags           — retired; isHot is not a heuristic research selector
 */

import { Router, type Request, type Response } from "express";
import { db, assetsTable, entitiesTable } from "@workspace/db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { classifyEntityType } from "../lib/western-hnwi-ingestion";
import { US_STATE_CENTROIDS, normalizeFaaName } from "../lib/faa-ingestor";

const router = Router();

// ── POST /ingest/sync-faa-coordinates ────────────────────────────────────────
router.post("/ingest/sync-faa-coordinates", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({ id: assetsTable.id, jurisdiction: assetsTable.jurisdiction })
      .from(assetsTable)
      .where(and(
        eq(assetsTable.category, "Aviation"),
        sql`${assetsTable.latitude} IS NULL`,
      ));

    let updated = 0;
    const byState = new Map<string, number[]>();
    for (const row of rows) {
      const stateCode = row.jurisdiction?.split(",")[0]?.trim().toUpperCase() ?? "";
      if (!US_STATE_CENTROIDS[stateCode]) continue;
      const arr = byState.get(stateCode) ?? [];
      arr.push(row.id);
      byState.set(stateCode, arr);
    }
    for (const [stateCode, ids] of byState.entries()) {
      const c = US_STATE_CENTROIDS[stateCode]!;
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await db.update(assetsTable)
          .set({ latitude: c[0], longitude: c[1] })
          .where(inArray(assetsTable.id, ids.slice(i, i + CHUNK)));
      }
      updated += ids.length;
    }
    res.json({ total: rows.length, updated, message: `${updated}/${rows.length} FAA assets now have coordinates.` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Coordinate sync failed" });
  }
});

// ── POST /ingest/reclassify-entity-types ─────────────────────────────────────
router.post("/ingest/reclassify-entity-types", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Never let a deterministic name classifier rewrite canonical Apex person
    // or Gatekeeper identity. Those entity types require the canonical model-
    // owned adjudication path.
    const rows = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name })
      .from(entitiesTable)
      .where(sql`${entitiesTable.type} NOT IN ('HNWI', 'Gatekeeper')`);

    const corps: number[] = [];
    const trusts: number[] = [];

    for (const row of rows) {
      const t = classifyEntityType(row.name);
      if (t === "Corporation") corps.push(row.id);
      else if (t === "Trust") trusts.push(row.id);
    }

    const CHUNK = 500;
    let corpUpdated = 0;
    let trustUpdated = 0;

    for (let i = 0; i < corps.length; i += CHUNK) {
      const chunk = corps.slice(i, i + CHUNK);
      await db.update(entitiesTable)
        .set({ type: "Corporation", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, chunk));
      corpUpdated += chunk.length;
    }
    for (let i = 0; i < trusts.length; i += CHUNK) {
      const chunk = trusts.slice(i, i + CHUNK);
      await db.update(entitiesTable)
        .set({ type: "Trust", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, chunk));
      trustUpdated += chunk.length;
    }

    res.json({
      total: rows.length,
      corporations: corpUpdated,
      trusts: trustUpdated,
      excludedApexEntities: "HNWI/Gatekeeper",
      message: `Reclassified ${corpUpdated} → Corporation, ${trustUpdated} → Trust; HNWI/Gatekeeper entities were excluded.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Reclassification failed" });
  }
});

// ── POST /ingest/fix-faa-names ────────────────────────────────────────────────
router.post("/ingest/fix-faa-names", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata })
      .from(entitiesTable)
      .where(sql`${entitiesTable.sourceRegistries}::text LIKE '%FAA%'`);

    const updates: { id: number; name: string }[] = [];

    for (const row of rows) {
      const meta = (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) as Record<string, unknown> ?? {};
      if (meta["nameMigrated"] === true) continue;
      const typeReg = (meta["typeRegistrant"] as string) ?? "";
      const newName = normalizeFaaName(row.name, typeReg);
      if (newName !== row.name) {
        updates.push({ id: row.id, name: newName });
      }
    }

    const CHUNK = 100;
    let updated = 0;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await Promise.all(chunk.map(u =>
        db.update(entitiesTable)
          .set({
            name: u.name,
            metadata: sql`jsonb_set(COALESCE(${entitiesTable.metadata}::jsonb, '{}'::jsonb), '{nameMigrated}', 'true'::jsonb)`,
            updatedAt: new Date(),
          })
          .where(eq(entitiesTable.id, u.id))
      ));
      updated += chunk.length;
    }

    await db.execute(
      sql`UPDATE entities SET metadata = jsonb_set(COALESCE(metadata::jsonb, '{}'::jsonb), '{nameMigrated}', 'true'::jsonb) WHERE metadata::text LIKE '%FAA%' AND (metadata::jsonb->>'nameMigrated') IS NULL`
    );

    res.json({
      total: rows.length,
      renamed: updated,
      skipped: rows.length - updated,
      message: `FAA name migration: ${updated} entities renamed to First Last order.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "FAA name migration failed" });
  }
});

// ── Retired Apex identity migration ──────────────────────────────────────────
router.post("/ingest/fix-edgar-names", (_req: Request, res: Response): void => {
  res.status(410).json({
    error: "Retired migration",
    message: "EDGAR name normalization for HNWI/Gatekeeper entities is retired; canonical model-owned adjudication owns Apex identity.",
  });
});

// ── Retired heuristic access-state migration ─────────────────────────────────
router.post("/ingest/sync-hot-flags", (_req: Request, res: Response): void => {
  res.status(410).json({
    error: "Retired migration",
    message: "Hot-flag heuristics are retired; isHot is not a deterministic research selector. Use explicit validated contact outcomes through the canonical path.",
  });
});

export default router;
