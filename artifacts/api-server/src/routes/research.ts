// Thin compatibility router for durable research-session views and outreach helpers.
// Deterministic MCTS / bulk-hybrid research is intentionally not mounted here.
// Canonical research is entered through the Gemini Boss -> DeepSeek Right-hand ->
// Groq/Mistral Investigator control plane under src/src/routes/research.
import { Router, type IRouter } from "express";
import sessionsRouter from "./research/sessions";
import pitchesRouter from "./research/pitches";

const router: IRouter = Router();

router.use(sessionsRouter);
router.use(pitchesRouter);

export default router;