import { Router } from "express";

const router = Router();
const RETIRED_MESSAGE =
  "This legacy case execution endpoint is retired. Research decisions belong to the canonical Gemini Boss + DeepSeek Right-hand + selected Groq/Mistral Investigator control plane.";

// These endpoints previously exposed deterministic or operator-driven execution paths.
// Keep an explicit 410 instead of silently falling through to a different control plane.
for (const path of [
  "/research/bureau/cases/:caseId/initial-research",
  "/research/bureau/cases/:caseId/admit-candidate",
  "/research/bureau/cases/:caseId/promote-target",
  "/research/bureau/cases/:caseId/run-boss-review",
]) {
  router.post(path, (_req, res): void => {
    res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
  });
}

export default router;
