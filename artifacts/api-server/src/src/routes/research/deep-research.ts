import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import {
  createJob,
  getActiveJob,
  getJob,
  setActiveJob,
  updateJob,
  clearActiveJob,
} from "../../lib/job-queue";
import { runGeminiDeepResearch } from "../../lib/ai-extractor";

const router = Router();
const JOB_TYPE = "gemini-deep-research";

function buildTargetPrompt(entity: {
  name: string;
  type: string;
  nationality?: string | null;
  knownResidences?: string | null;
  sourceRegistries?: string | null;
  metadata?: string | null;
}, extraPrompt?: unknown): string {
  const additional = typeof extraPrompt === "string" ? extraPrompt.trim().slice(0, 2_000) : "";
  return [
    "Conduct an evidence-led OSINT investigation of the target below.",
    "Return a detailed, cited research report with claim-level source URLs.",
    "Separate confirmed facts, plausible but unconfirmed leads, and negative findings.",
    "Do not infer personal identity, wealth, ownership, access, or contactability from usernames,",
    "organization contacts, repeated provider claims, fame, or social visibility.",
    "Do not invent contact details. This report is review-only and must not authorize outreach.",
    "",
    `Target name: ${entity.name}`,
    `Entity type: ${entity.type}`,
    entity.nationality ? `Nationality hint: ${entity.nationality}` : "",
    entity.knownResidences ? `Known residence evidence: ${entity.knownResidences.slice(0, 1_000)}` : "",
    entity.sourceRegistries ? `Source registry evidence: ${entity.sourceRegistries.slice(0, 1_000)}` : "",
    entity.metadata ? `Existing metadata anchors: ${entity.metadata.slice(0, 1_000)}` : "",
    additional ? `Additional research question: ${additional}` : "",
  ].filter(Boolean).join("\n");
}

// POST /research/deep-research — starts one explicit target-scoped run.
router.post("/research/deep-research", async (req, res): Promise<void> => {
  const entityId = Number((req.body as any)?.entityId);
  if (!Number.isInteger(entityId) || entityId <= 0) {
    res.status(400).json({ error: "A positive entityId is required." });
    return;
  }

  const [entity] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, entityId));
  if (!entity) {
    res.status(404).json({ error: "Entity not found." });
    return;
  }

  const existingId = await getActiveJob(JOB_TYPE);
  if (existingId) {
    const existing = await getJob(existingId);
    if (existing?.status === "queued" || existing?.status === "running") {
      res.status(409).json({
        error: "A Gemini Deep Research run is already in progress.",
        jobId: existingId,
        pollUrl: `/api/ingest/job/${existingId}`,
      });
      return;
    }
    await clearActiveJob(JOB_TYPE);
  }

  const jobId = await createJob(JOB_TYPE);
  await setActiveJob(JOB_TYPE, jobId);
  res.status(202).json({
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    entityId,
    message: "Gemini Deep Research started. Poll the job URL for the review-only report.",
  });

  void (async () => {
    try {
      await updateJob(jobId, {
        status: "running",
        progress: 5,
        total: 1,
        message: `Running Gemini Deep Research for ${entity.name}…`,
      });
      const result = await runGeminiDeepResearch(
        buildTargetPrompt(entity, (req.body as any)?.prompt),
      );
      await updateJob(jobId, {
        status: result.status === "completed" ? "done" : "failed",
        progress: 100,
        total: 1,
        inserted: result.status === "completed" ? 1 : 0,
        errors: result.status === "completed" ? 0 : 1,
        outcome: result.status === "completed" ? "complete" : "incomplete",
        message: result.status === "completed"
          ? `Deep Research complete — ${result.citations.length} cited URLs. Review-only; no contacts promoted.`
          : `Deep Research ${result.status}: ${result.error ?? "no report returned"}`,
        result: JSON.stringify({ entityId, entityName: entity.name, ...result }),
        finishedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      await updateJob(jobId, {
        status: "failed",
        progress: 100,
        errors: 1,
        outcome: "incomplete",
        message: `Deep Research crashed: ${error?.message ?? "unknown error"}`,
        finishedAt: new Date().toISOString(),
      });
    } finally {
      await clearActiveJob(JOB_TYPE);
    }
  })();
});

export default router;