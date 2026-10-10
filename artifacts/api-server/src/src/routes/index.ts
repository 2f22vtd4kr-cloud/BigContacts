import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entitiesRouter from "./entities";
import safeEntityMergeRouter from "./entity-merge-safe";
import assetsRouter from "./assets";
import relationshipsRouter from "./relationships";
import researchRouter from "./research";
import dashboardRouter from "./dashboard";
import graphRouter from "./graph";
import ingestRouter from "./ingest";
import searchRouter from "./search";
import improveRouter from "./improve";
import osintToolsRouter from "./osint-tools";
import identityRouter from "./identity";
import contactResearchRouter from "./contact-research";
import canonicalAtlasLaunchRouter from "./research/canonical-atlas-launch";
import { atlasRouter } from "./atlas";
import bureauStreamRouter from "./bureau-stream";
import systemStatusRouter from "./system-status";
import investigatorTraceRouter from "./investigator-trace";
import { legacyApexMutationGuard } from "../lib/legacy-apex-mutation-guard";
import { entityVisibilityGuard } from "../lib/entity-visibility-guard";
import { legacyAtlasLaunchQuarantine } from "../lib/legacy-atlas-launch-quarantine";
import { normalizeAtlasLaunchBody } from "../middlewares/normalize-atlas-launch-body";
import { canonicalCaseContinuationGuard } from "../middlewares/canonical-case-continuation-guard";

const router: IRouter = Router();

// Operator authentication is intentionally unmounted for the current Replit deployment.
// Canonical launch, provider-role, provenance, admission, and persistence guards remain active.
router.use(healthRouter);
router.use(normalizeAtlasLaunchBody);
router.use(entityVisibilityGuard);
router.use(legacyApexMutationGuard);
router.use(safeEntityMergeRouter);
router.use(entitiesRouter);
router.use(assetsRouter);
router.use(relationshipsRouter);
router.use(canonicalCaseContinuationGuard);
router.use(researchRouter);
router.use(dashboardRouter);
router.use(graphRouter);
router.use(canonicalAtlasLaunchRouter);
router.use(ingestRouter);
router.use(searchRouter);
router.use(improveRouter);
router.use(osintToolsRouter);
router.use(identityRouter);
router.use(contactResearchRouter);
router.use(legacyAtlasLaunchQuarantine);
router.use(atlasRouter);
router.use(bureauStreamRouter);
router.use(systemStatusRouter);
router.use(investigatorTraceRouter);

export default router;
