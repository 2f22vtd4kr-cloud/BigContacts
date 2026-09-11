import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, setActiveJob, clearActiveJobIfOwned } from "../../lib/job-queue";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { resolveResearchDepth } from "../../lib/research-depth";

const router = Router();

function parseFile(raw: string | null): Record<string, any> | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

/**
 * HTTP adapter only. Canonical discovery execution, Boss/Right-hand coordination,
 * Investigator execution, admission, and durable discovery state live in the
 * canonical Atlas control plane.
 */
router.post("/research/bureau/cases/:caseId/run-discovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    res.status(400).json({ error: "Invalid bureau case ID" });
    return;
  }
  const [current] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const file = parseFile(current.caseFile);
  if (!file || file.caseType !== "discovery") {
    res.status(409).json({ error: "Only a discovery case can run the canonical discovery investigation" });
    return;
  }
  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing?.status === "running" || existing?.status === "queued") {
      res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: existingJobId });
      return;
    }
  }
  const jobId = await createJob("case-bureau-discovery");
  await setActiveJob("case-bureau-discovery", jobId);
  const depth = resolveResearchDepth({ explicit: typeof file.researchDepth === "string" ? file.researchDepth : undefined });
  void (async () => {
    try {
      await runCanonicalAtlasPipeline(jobId, {
        targetCount: 20,
        researchDepth: depth.researchDepth,
        targetTimeoutMs: depth.agenticHardTimeoutMs,
        discoveryCaseId: caseId,
        discoveryOnly: true,
        discoveryObjective: [
          String(file.humanBrief?.objective ?? ""),
          String(file.humanBrief?.motivation ?? ""),
          file.humanBrief?.geography ? `Geography: ${file.humanBrief.geography}` : "",
          "Discover exact named people only when the observed public source supports the identity. You own every search/tool choice and stopping point. Emit promotionDecision=promote only for an exact named-person admission candidate. Never invent.",
        ].filter(Boolean).join("\n"),
        discoveryMotivation: String(file.humanBrief?.motivation ?? ""),
        discoveryGeography: String(file.humanBrief?.geography ?? ""),
        discoveryExclusions: Array.isArray(file.humanBrief?.exclusions) ? file.humanBrief.exclusions : [],
        lockKey: "case-bureau-discovery",
      });
    } catch {
      await clearActiveJobIfOwned("case-bureau-discovery", jobId);
    }
  })();
  res.status(202).json({ jobId, caseId, status: "running", mode: "canonical-model-owned-discovery" });
});

export default router;
