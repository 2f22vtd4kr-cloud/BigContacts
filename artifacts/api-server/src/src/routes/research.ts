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
import canonicalCaseContinuationRouter from "./research/canonical-case-continuation";
import casesRouter from "./research/cases";

const router: IRouter = Router();

router.use(sessionsRouter);
router.use(deepResearchRouter);
// Canonical model-owned case routes must win over duplicate legacy handlers.
router.use(canonicalCaseDiscoveryRouter);
router.use(canonicalCaseContinuationRouter);
router.use(casesRouter);

export default router;
