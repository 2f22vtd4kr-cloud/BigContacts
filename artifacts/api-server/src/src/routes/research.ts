// Thin router — mounts research sub-modules split by concern.
// Research execution is owned by the canonical model-directed routes; case-data
// and replay are persistence/read projections only.
import { Router, type IRouter } from "express";
import sessionsRouter from "./research/sessions";
import deepResearchRouter from "./research/deep-research";
import canonicalCaseDiscoveryRouter from "./research/canonical-case-discovery";
import canonicalCaseContinuationRouter from "./research/canonical-case-continuation";
import canonicalTargetContinuationRouter from "./research/canonical-target-continuation";
import legacyCaseExecutionRetirementRouter from "./research/legacy-case-execution-retirement";
import caseDataRouter from "./research/case-data";
import caseReplayRouter from "./research/case-replay";

const router: IRouter = Router();

router.use(sessionsRouter);
router.use(deepResearchRouter);
router.use(canonicalCaseDiscoveryRouter);
router.use(canonicalCaseContinuationRouter);
router.use(canonicalTargetContinuationRouter);
router.use(legacyCaseExecutionRetirementRouter);
router.use(caseDataRouter);
router.use(caseReplayRouter);

export default router;
