import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, setActiveJob, clearActiveJobIfOwned, updateJob } from "../../lib/job-queue";
import { enablePermanentRedis } from "../../lib/redis";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { resolveResearchDepth } from "../../lib/research-depth";

const router = Router();

function parseFile(raw: string | null): Record<string, any> | null {
  try { const value = raw ? JSON.parse(raw) : null; return value && typeof value === "object" ? value : null; } catch { return null; }
}

router.post("/research/bureau/cases/:caseId/run-discovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) { res.status(400).json({ error: "Invalid bureau case ID" }); return; }
  const [current] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
  if (!current) { res.status(404).json({ error: "Bureau case not found" }); return; }
  const file = parseFile(current.caseFile);
  if (!file || file.caseType !== "discovery") { res.status(409).json({ error: "Only a discovery case can run the canonical discovery investigation" }); return; }

  await enablePermanentRedis();

  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) { const existing = await getJob(existingJobId); if (existing?.status === "running" || existing?.status === "queued") { res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: existingJobId }); return; } }
  const jobId = await createJob("case-bureau-discovery"); await setActiveJob("case-bureau-discovery", jobId);
  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
      if (!locked || locked.caseType !== "discovery") throw new Error("Discovery case disappeared or changed type before job binding.");
      const currentFile = parseFile(locked.caseFile); if (!currentFile) throw new Error("Discovery case state is unreadable before job binding.");
      const priorJobs = Array.isArray(currentFile.jobIds) ? currentFile.jobIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];
      const nextFile = { ...currentFile, jobId, jobIds: [...new Set([...priorJobs, jobId])].slice(-32) };
      await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), status: "active", currentAction: "canonical-investigator-discovery", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
    }, { isolationLevel: "serializable" });
  } catch (error) {
    await updateJob(jobId, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Discovery case job binding failed.", finishedAt: new Date().toISOString() }).catch(() => undefined);
    await clearActiveJobIfOwned("case-bureau-discovery", jobId).catch(() => undefined);
    res.status(409).json({ error: error instanceof Error ? error.message : "Discovery case job binding failed.", jobId }); return;
  }
  const depth = resolveResearchDepth({ explicit: typeof file.researchDepth === "string" ? file.researchDepth : undefined });
  void (async () => {
    try {
      await runCanonicalAtlasPipeline(jobId, {
        targetCount: 3,
        researchDepth: depth.depth,
        targetTimeoutMs: depth.agenticHardTimeoutMs,
        discoveryCaseId: caseId,
        discoveryOnly: true,
        discoveryObjective: [String(file.humanBrief?.objective ?? ""), String(file.humanBrief?.motivation ?? ""), file.humanBrief?.geography ? `Geography: ${file.humanBrief.geography}` : "", "Discover exact named people only when the observed public source supports the identity. You own every search/tool choice and stopping point. Emit promotionDecision=promote only for an exact named-person admission candidate. Never invent."].filter(Boolean).join("\n"),
        discoveryMotivation: String(file.humanBrief?.motivation ?? ""),
        discoveryGeography: String(file.humanBrief?.geography ?? ""),
        discoveryExclusions: Array.isArray(file.humanBrief?.exclusions) ? file.humanBrief.exclusions : [],
        lockKey: "case-bureau-discovery",
      });
      const finishedJob = await getJob(jobId);
      let discoveryStatus: string | null = null;
      let discoveryError: string | null = null;
      if (finishedJob?.result) {
        try {
          const result = JSON.parse(finishedJob.result) as { discovery?: { status?: unknown; error?: unknown } };
          discoveryStatus = typeof result.discovery?.status === "string" ? result.discovery.status : null;
          discoveryError = typeof result.discovery?.error === "string" ? result.discovery.error : null;
        } catch { discoveryStatus = null; }
      }
      if (discoveryStatus !== "completed") {
        const message = discoveryError ? `Canonical discovery Investigator pass did not complete: ${discoveryError}` : `Canonical discovery Investigator pass did not complete (status=${discoveryStatus ?? "unknown"}).`;
        await updateJob(jobId, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() }).catch(() => undefined);
        await db.update(researchCasesTable).set({ status: "error", currentAction: "canonical-discovery-error", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId)).catch(() => undefined);
      }
      await clearActiveJobIfOwned("case-bureau-discovery", jobId).catch(() => undefined);
    } catch (error) {
      await db.update(researchCasesTable).set({ status: "error", currentAction: "canonical-discovery-error", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
      await updateJob(jobId, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Canonical discovery failed.", finishedAt: new Date().toISOString() }).catch(() => undefined);
      await clearActiveJobIfOwned("case-bureau-discovery", jobId);
    }
  })();
  res.status(202).json({ jobId, caseId, status: "running", mode: "canonical-model-owned-discovery" });
});

export default router;
