import type { NextFunction, Request, Response } from "express";

/**
 * Defense-in-depth quarantine for retired Atlas control/status handlers.
 *
 * Canonical Atlas owns launch and Reactor telemetry consumes the active-job
 * projection plus forensic trace. The historical launch/status endpoints must
 * remain impossible to reach even if future route refactors expose them.
 * This middleware intentionally does not call next() for retired paths.
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

  if (req.method === "GET" && req.path === "/ingest/atlas-status") {
    res.status(410).json({
      error: "Legacy Atlas status route retired.",
      reason: "Reactor telemetry uses the canonical active-job projection and forensic trace; the historical status projection is permanently quarantined.",
      path: req.path,
    });
    return;
  }

  next();
}
