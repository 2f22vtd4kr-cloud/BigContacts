import type { NextFunction, Request, Response } from "express";

/**
 * Defense-in-depth quarantine for the retired Atlas launch handler.
 *
 * Canonical Atlas is mounted before this boundary. If the canonical router ever
 * declines a POST /ingest/atlas-run request (for example after a future route
 * refactor), the historical orchestrator must still be impossible to reach.
 * This middleware intentionally does not call next().
 */
export function legacyAtlasLaunchQuarantine(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "POST" && req.path === "/ingest/atlas-run") {
    res.status(410).json({
      error: "Legacy Atlas launch route retired.",
      reason: "Canonical Atlas owns launch and research control; the historical orchestrator is permanently quarantined.",
      path: req.path,
    });
    return;
  }
  next();
}
