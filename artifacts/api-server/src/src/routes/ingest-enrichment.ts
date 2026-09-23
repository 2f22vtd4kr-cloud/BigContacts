/**
 * Retired legacy enrichment control plane.
 *
 * These endpoints are intentionally quarantined, but this router must never
 * behave as a catch-all: it may be mounted beneath the ingest router without
 * intercepting canonical job, trace, bureau, or other live routes.
 */
import { Router } from "express";

const router = Router();

const RETIRED_POSTS = new Set([
  "/ingest/companies-house-enrich",
  "/ingest/ch-company-officers",
  "/ingest/populate-notes",
  "/ingest/create-edgar-stock-assets",
  "/ingest/web-osint-enrich",
  "/ingest/in-house-enrich",
  "/ingest/recompute-contact-confidence",
  "/ingest/sync-livesource-markers",
  "/ingest/backfill-wealth-llm",
  "/ingest/backfill-net-worth",
  "/ingest/backfill-edgar-net-worth",
  "/ingest/hunter-enrich",
  "/ingest/social-discovery",
  "/ingest/messenger-discovery",
  "/ingest/foundation-filings",
  "/ingest/broad-discovery",
  "/ingest/edgar-issuer-backfill",
  "/ingest/restore-contact-cache",
  "/ingest/backfill-contact-outcomes",
  "/ingest/backfill-contact-funnels",
  "/ingest/flag-shared-emails",
  "/ingest/normalize-phones",
]);

const RETIRED_DELETES = new Set([
  "/ingest/web-osint-lock",
  "/ingest/in-house-enrich-lock",
  "/ingest/hunter-enrich-lock",
  "/ingest/social-discovery-lock",
  "/ingest/foundation-filings-lock",
  "/ingest/broad-discovery-lock",
]);

router.use((req, res, next) => {
  const path = req.path;
  const retired =
    (req.method === "POST" && RETIRED_POSTS.has(path)) ||
    (req.method === "DELETE" && RETIRED_DELETES.has(path));

  if (!retired) {
    next();
    return;
  }

  res.status(410).json({
    error: "Legacy enrichment control plane retired",
    message: "Research must be started through the canonical Atlas/Investigator control plane.",
    path,
  });
});

export default router;
