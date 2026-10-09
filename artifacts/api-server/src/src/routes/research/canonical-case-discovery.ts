import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, setActiveJob, clearActiveJobIfOwned, updateJob } from "../../lib/job-queue";
import { claimCanonicalJob, releaseCanonicalJob } from "../../lib/canonical-job-lock";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { resolveResearchDepth } from "../../lib/research-depth";
import { enablePermanentRedis } from "../../lib/redis";
import { withProviderScope } from "../../lib/provider-gate";

const router = Router();

function parseFile(raw: string | null): Record<string, any> | null {
  try { const value = raw ? JSON.parse(raw) : null; return value && typeof value === "object" ? value : null; } catch { return null; }
}

router.post("/research/bureau/cases/:caseId/run-discovery", async (req, res): Promise<void> => {
  // Manual Launch mode intentionally skips permanent Redis at boot, but this endpoint owns a durable job lane.
  // Enable the permanent clients at the execution boundary rather than falling back to in-memory state.
  try { await enablePermanentRedis(); } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Permanent Redis is unavailable for canonical discovery." }); return; }
  const caseId = Number(req.params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) { res.status(400).json({ error: "Invalid bureau case ID" }); return; }
  const [current] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
  if (!current) { res.status(404).json({ error: "Bureau case not found" }); return; }
  const file = parseFile(current.caseFile);
  if (!file || file.caseType !== "discovery") { res.status(409).json({ error: "Only a discovery case can run the canonical discovery investigation" }); return; }
  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (!existing) {
      res.status(503).json({ error: "The existing discovery-lane owner has no durable job state; refusing to replace it.", jobId: existingJobId });
      return;
    }
    const terminal = existing.status === "done" || existing.status === "failed" || existing.status === "cancelled";
    if (!terminal) {
      res.status(409).json({ error: "A bureau discovery investigation owns the active lane; refusing to supersede a non-terminal or unknown job.", jobId: existingJobId, status: existing.status });
      return;
    }
    const cleared = await clearActiveJobIfOwned("case-bureau-discovery", existingJobId);
    if (!cleared && await getActiveJob("case-bureau-discovery") === existingJobId) {
      res.status(503).json({ error: "The terminal discovery-lane owner could not be safely released; refusing a new launch.", jobId: existingJobId });
      return;
    }
  }
  const activeAtlasJobId = await getActiveJob("atlas-run");
  if (activeAtlasJobId) {
    const activeAtlasJob = await getJob(activeAtlasJobId);
    if (!activeAtlasJob) {
      res.status(503).json({ error: "The canonical Atlas lock owner has no durable job state; refusing to replace it.", jobId: activeAtlasJobId });
      return;
    }
    const terminal = activeAtlasJob.status === "done" || activeAtlasJob.status === "failed" || activeAtlasJob.status === "cancelled";
    if (!terminal) {
      res.status(409).json({ error: "A canonical Atlas investigation owns the execution lock; refusing to supersede a non-terminal or unknown job.", jobId: activeAtlasJobId, status: activeAtlasJob.status });
      return;
    }
    await releaseCanonicalJob("atlas-run", activeAtlasJobId);
    const remainingOwner = await getActiveJob("atlas-run");
    if (remainingOwner) {
      res.status(503).json({ error: "The terminal canonical Atlas lock could not be cleared safely; refusing a new discovery launch.", jobId: remainingOwner });
      return;
    }
  }
  let jobId: string | null = null;
  let atlasClaimed = false;
  try {
    jobId = await createJob("case-bureau-discovery");
    atlasClaimed = await claimCanonicalJob("atlas-run", jobId!);
    if (!atlasClaimed) {
      await updateJob(jobId!, { status: "failed", outcome: "incomplete", message: "Canonical discovery launch rejected: another Atlas instance owns the distributed execution lock.", finishedAt: new Date().toISOString() });
      res.status(409).json({ error: "Another canonical Atlas investigation owns the execution lock.", jobId });
      return;
    }
    await setActiveJob("case-bureau-discovery", jobId!);
  } catch (error) {
    if (jobId) {
      await updateJob(jobId!, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Canonical discovery lock acquisition failed.", finishedAt: new Date().toISOString() }).catch(() => undefined);
      await clearActiveJobIfOwned("case-bureau-discovery", jobId!).catch(() => undefined);
      if (atlasClaimed || jobId) await releaseCanonicalJob("atlas-run", jobId!).catch(() => undefined);
    }
    res.status(503).json({ error: error instanceof Error ? error.message : "Canonical discovery lock acquisition failed.", jobId });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType, status: researchCasesTable.status, currentAction: researchCasesTable.currentAction }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
      if (!locked || locked.caseType !== "discovery") throw new Error("Discovery case disappeared or changed type before job binding.");
      if (locked.status === "complete" || locked.status === "cancelled" || (locked.status === "review" && ["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"].includes(String(locked.currentAction ?? "")))) throw new Error("Discovery case is durably terminal or cancelled; refusing to reopen it.");
      const currentFile = parseFile(locked.caseFile); if (!currentFile) throw new Error("Discovery case state is unreadable before job binding.");
      const priorJobs = Array.isArray(currentFile.jobIds) ? currentFile.jobIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];
      const nextFile = { ...currentFile, jobId, jobIds: [...new Set([...priorJobs, jobId!])] };
      await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), status: "active", currentAction: "canonical-investigator-discovery", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
    }, { isolationLevel: "serializable" });
  } catch (error) {
    await updateJob(jobId!, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Discovery case job binding failed.", finishedAt: new Date().toISOString() }).catch(() => undefined);
    await clearActiveJobIfOwned("case-bureau-discovery", jobId!).catch(() => undefined);
    await releaseCanonicalJob("atlas-run", jobId!).catch(() => undefined);
    res.status(409).json({ error: error instanceof Error ? error.message : "Discovery case job binding failed.", jobId }); return;
  }
  const depth = resolveResearchDepth({ explicit: typeof file.researchDepth === "string" ? file.researchDepth : undefined });
  void (async () => {
    try {
      await withProviderScope(`atlas-run:${jobId!}`, () => runCanonicalAtlasPipeline(jobId!, {
        researchDepth: depth.depth,
        targetTimeoutMs: depth.agenticHardTimeoutMs,
        discoveryCaseId: caseId,
        discoveryOnly: true,
        discoveryObjective: [String(file.humanBrief?.objective ?? ""), String(file.humanBrief?.motivation ?? ""), file.humanBrief?.geography ? `Geography: ${file.humanBrief.geography}` : "", "Discover exact named people only when the observed public source supports the identity. You own every search/tool choice and stopping point. Emit promotionDecision=promote only for an exact named-person admission candidate. Never invent."].filter(Boolean).join("\n"),
        discoveryMotivation: String(file.humanBrief?.motivation ?? ""),
        discoveryGeography: String(file.humanBrief?.geography ?? ""),
        discoveryExclusions: Array.isArray(file.humanBrief?.exclusions) ? file.humanBrief.exclusions : [],
        lockKey: "case-bureau-discovery",
      }));
    } catch {
      await db.update(researchCasesTable).set({ status: "review", currentAction: "canonical-discovery-error", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`));
      await clearActiveJobIfOwned("case-bureau-discovery", jobId!);
    } finally {
      await releaseCanonicalJob("atlas-run", jobId!).catch(() => undefined);
    }
  })();
  res.status(202).json({ jobId, caseId, status: "running", mode: "canonical-model-owned-discovery" });
});

export default router;
