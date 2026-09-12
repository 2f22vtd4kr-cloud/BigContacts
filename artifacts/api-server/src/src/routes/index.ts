import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
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
import canonicalAtlasLaunchRouter from "./research/canonical-atlas-launch";
import { atlasRouter } from "./atlas";
import bureauStreamRouter from "./bureau-stream";
import systemStatusRouter from "./system-status";
import investigatorTraceRouter from "./investigator-trace";
import { legacyApexMutationGuard } from "../lib/legacy-apex-mutation-guard";
import { legacyAtlasLaunchQuarantine } from "../lib/legacy-atlas-launch-quarantine";
import { normalizeAtlasLaunchBody } from "../middlewares/normalize-atlas-launch-body";

const router: IRouter = Router();
router.use(healthRouter);
// Browser login/session bootstrap is public; all other API routes remain behind
// apiAuth at the application boundary.
router.use(authRouter);
// Normalize the canonical launch contract before any launcher reads Boolean(...)
// from operator/form input. This is intentionally narrow, not a generic coercer.
router.use(normalizeAtlasLaunchBody);
// The legacy Apex mutation boundary wraps remaining compatibility/mutation routes.
// Direct deterministic extended-OSINT execution is intentionally NOT mounted here:
// research capabilities must be selected and executed by the canonical Investigator.
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
// The canonical launch handler owns POST /ingest/atlas-run.
router.use(canonicalAtlasLaunchRouter);
// Defense in depth: even if the canonical router ever declines the launch
// request, the historical orchestrator remains unreachable.
router.use(legacyAtlasLaunchQuarantine);
// Keep the legacy Atlas router mounted only for status/lock compatibility.
router.use(atlasRouter);
router.use(bureauStreamRouter);
router.use(systemStatusRouter);
router.use(investigatorTraceRouter);
export default router;
