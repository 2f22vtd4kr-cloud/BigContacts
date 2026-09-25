import { Router, type Request, type Response } from "express";
import {
  getActiveJob,
  getJob,
  getLatestJob,
} from "../lib/job-queue";
import { CONTACT_RESEARCH_JOB_TYPE } from "../lib/contact-research-orchestrator";

const router = Router();

const RETIRED_MESSAGE =
  "The legacy contact-research control plane is retired. Use the canonical Atlas Investigator path; research strategy is model-owned.";

// Kept as an explicit retirement response so old UI/operator clients cannot
// silently invoke the former deterministic coordinator.
router.post("/ingest/contact-research", (_req: Request, res: Response): void => {
  res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
});

router.get("/ingest/contact-research/status", (_req: Request, res: Response): void => {
  // The legacy control-plane status projection is retired too. Returning its old
  // live job state would keep an obsolete coordinator observable and implicitly
  // advertise it as a supported control plane.
  res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
});

router.post("/ingest/contact-research/cancel", (_req: Request, res: Response): void => {
  res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
});

export default router;
