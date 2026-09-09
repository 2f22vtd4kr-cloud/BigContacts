// Thin router — mounts research sub-modules split by concern.
// Each sub-module handles its own route definitions.
//
// The legacy MCTS and bulk-hybrid research endpoints are intentionally not
// mounted: the canonical Atlas path owns research decisions in the Investigator
// loop. Keeping these modules unmounted prevents an alternate deterministic
// research control plane from remaining externally reachable.
import { Router, type IRouter } from "express";
import sessionsRouter from "./research/sessions";
import deepResearchRouter from "./research/deep-research";
import canonicalCaseDiscoveryRouter from "./research/canonical-case-discovery";
import casesRouter from "./research/cases";

const router: IRouter = Router();

router.use(sessionsRouter);
router.use(deepResearchRouter);
// This route must precede the legacy cases router so its duplicate
// /:caseId/run-discovery path is never reached.
router.use(canonicalCaseDiscoveryRouter);
router.use(casesRouter);

export default router;
