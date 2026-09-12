import { Router } from "express";

/**
 * Historical Atlas launch compatibility boundary.
 *
 * Research execution belongs exclusively to the canonical Atlas Investigator
 * control plane. Keep this route as an explicit 410 stub so accidental legacy
 * callers fail closed rather than reaching a second research implementation.
 */
export const atlasRouter = Router();

atlasRouter.post("/ingest/atlas-run", (_req, res) => {
  res.status(410).json({
    error: "Legacy Atlas launch route retired.",
    reason: "Canonical Atlas owns research control and Investigator execution; the historical route cannot start research.",
  });
});
