import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entitiesRouter from "./entities";
import assetsRouter from "./assets";
import relationshipsRouter from "./relationships";
import researchRouter from "./research";
import dashboardRouter from "./dashboard";
import graphRouter from "./graph";
import ingestRouter from "./ingest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(entitiesRouter);
router.use(assetsRouter);
router.use(relationshipsRouter);
router.use(researchRouter);
router.use(dashboardRouter);
router.use(graphRouter);
router.use(ingestRouter);

export default router;
