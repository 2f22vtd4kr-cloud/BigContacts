import type { NextFunction, Request, Response } from "express";
import { db, entitiesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const RETIRED_MUTATING_ENRICHMENT_PATHS = new Set([
  "/ingest/web-osint-enrich",
  "/ingest/in-house-enrich",
  "/ingest/social-discovery",
  "/ingest/messenger-discovery",
  "/ingest/foundation-filings",
  "/ingest/companies-house-enrich",
  "/ingest/occrp",
  "/ingest/deep-web-osint",
]);
const APEX_TYPES = new Set(["HNWI", "Gatekeeper"]);

function isRetiredEnrichmentPath(path: string): boolean {
  return RETIRED_MUTATING_ENRICHMENT_PATHS.has(path);
}

function isLegacyScopedEnrichmentPath(path: string): boolean {
  return path.startsWith("/enrich/");
}

/**
 * Legacy/deterministic enrichment is not a second research control plane.
 * Canonical Atlas owns research strategy through the Investigator ReAct loop.
 *
 * Known legacy enrichment endpoints are therefore retired unconditionally,
 * including from internal cold-start callers. This prevents old scheduled jobs
 * from silently re-entering the research system around the canonical boundary.
 * The generic /enrich/* compatibility surface remains scope-checked for
 * explicitly non-Apex maintenance callers until each endpoint is retired.
 */
export async function legacyApexMutationGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method !== "POST") {
    next();
    return;
  }

  if (isRetiredEnrichmentPath(req.path)) {
    res.status(410).json({
      error: "Legacy enrichment route retired.",
      reason: "Canonical Atlas Investigator research is the only supported research control plane.",
      path: req.path,
    });
    return;
  }

  if (!isLegacyScopedEnrichmentPath(req.path)) {
    next();
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const entityType = typeof body.entityType === "string" ? body.entityType : undefined;
  const rawIds = Array.isArray(body.entityIds) ? body.entityIds : [];
  const entityIds = rawIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 1_000);
  const singularEntityId = Number(body.entityId);
  if (Number.isInteger(singularEntityId) && singularEntityId > 0) entityIds.push(singularEntityId);

  if (entityType && APEX_TYPES.has(entityType)) {
    res.status(409).json({
      error: "Legacy enrichment cannot mutate Apex HNWI/Gatekeeper cards.",
      reason: "Use the canonical Investigator research path; only explicit model promotion may cross the card boundary.",
    });
    return;
  }

  if (entityIds.length === 0) {
    if (!entityType) {
      res.status(409).json({
        error: "Legacy enrichment requires an explicit non-Apex target scope.",
        reason: "Unscoped enrichment cannot be allowed to mutate HNWI/Gatekeeper cards.",
      });
      return;
    }
    next();
    return;
  }

  const rows = await db
    .select({ id: entitiesTable.id, type: entitiesTable.type })
    .from(entitiesTable)
    .where(inArray(entitiesTable.id, entityIds));

  const apexRows = rows.filter((row) => APEX_TYPES.has(row.type));
  if (apexRows.length > 0) {
    res.status(409).json({
      error: "Legacy enrichment cannot mutate Apex HNWI/Gatekeeper cards.",
      reason: "Use the canonical Investigator research path; only explicit model promotion may cross the card boundary.",
      entityIds: apexRows.map((row) => row.id),
    });
    return;
  }

  next();
}