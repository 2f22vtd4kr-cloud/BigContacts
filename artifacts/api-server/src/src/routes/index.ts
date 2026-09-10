import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entitiesRouter from "./entities";
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
import extendedOsintRouter from "./extended-osint";
import canonicalAtlasLaunchRouter from "./research/canonical-atlas-launch";
import atlasRouter from "./atlas";
import bureauStreamRouter from "./bureau-stream";
import systemStatusRouter from "./system-status";
import investigatorTraceRouter from "./investigator-trace";
import { legacyApexMutationGuard } from "../lib/legacy-apex-mutation-guard";

const router: IRouter = Router();
router.use(healthRouter);
// The legacy Apex mutation boundary must wrap every legacy enrichment router,
// including /enrich/* routes mounted outside the ingest router. Health remains
// public above; all mutating legacy enrichment traffic reaches this guard first.
router.use(legacyApexMutationGuard);
router.use(entitiesRouter);
router.use(assetsRouter);
router.use(relationshipsRouter);
router.use(researchRouter);
router.use(dashboardRouter);
router.use(graphRouter);
router.use(ingestRouter);
router.use(searchRouter);
router.use(improveRouter);
router.use(osintToolsRouter);
router.use(identityRouter);
router.use(contactResearchRouter);
router.use(extendedOsintRouter);
// The canonical launch handler owns POST /ingest/atlas-run. The legacy Atlas
// router remains mounted for status/lock compatibility, but its launch handler
// is unreachable because this route is registered first and terminates the
// request after scheduling the canonical control plane.
router.use(canonicalAtlasLaunchRouter);
router.use(atlasRouter);
router.use(bureauStreamRouter);
router.use(systemStatusRouter);
router.use(investigatorTraceRouter);
export default router;
