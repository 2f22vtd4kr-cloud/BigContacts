/**
 * Retired legacy enrichment control plane.
 *
 * The former module exposed deterministic bulk OSINT/enrichment jobs,
 * including broad discovery and fixed source sequences. Research trajectory
 * now belongs to the canonical Investigator/ReAct control plane.
 *
 * Keep the mount temporarily as an explicit 410 quarantine so old clients get
 * a truthful retirement signal instead of silently starting research.
 */
import { Router } from "express";

const router = Router();

router.use((_req, res) => {
  res.status(410).json({
    error: "Legacy enrichment control plane retired",
    message: "Research must be started through the canonical Atlas/Investigator control plane.",
  });
});

export default router;
