import { Router } from "express";
import { and, eq, sql, desc } from "drizzle-orm";
import { db, researchCasesTable, researchCaseEventsTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, setActiveJob, updateJob, clearActiveJobIfOwned } from "../../lib/job-queue";
import { claimCanonicalJob, releaseCanonicalJob, isCanonicalJobOwner } from "../../lib/canonical-job-lock";
import { runCanonicalSingleTargetInvestigation } from "../../lib/canonical-single-target-runner";
import { decideTargetNextAction } from "../../lib/target-control-decision";
import { enablePermanentRedis } from "../../lib/redis";
import { withProviderScope } from "../../lib/provider-gate";
const router = Router();
const cancellationFenceSql = (caseId: number) => sql`NOT (status = 'cancelled' OR (status = 'review' AND current_action IN ('canonical-atlas-cancelled','canonical-lease-lost','canonical-continuation-cancelled'))) AND id = ${caseId}`;
function parseFile(raw: string | null): Record<string, any> | null { try { const value = raw ? JSON.parse(raw) : null; return value && typeof value === "object" ? value : null; } catch { return null; } }
const CONTROL_CONTEXT_BOUND_MARKER = "\n\n[CONTROL CONTEXT BOUND: middle detail omitted; durable case state remains authoritative]\n\n";
async function releaseContinuationLane(jobId: string): Promise<void> {
  // Clear only our active-job pointer, then stop this process's lease timer even
  // if a cancellation/lease fence has already removed the active-job pointer.
  await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined);
  await releaseCanonicalJob("atlas-run", jobId).catch(() => undefined);
}
async function transitionClaimedTargetCase(input: { caseId: number; jobId: string; currentAction: string }): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [locked] = await tx.select({
      caseFile: researchCasesTable.caseFile,
      caseType: researchCasesTable.caseType,
      targetEntityId: researchCasesTable.targetEntityId,
      status: researchCasesTable.status,
      currentAction: researchCasesTable.currentAction,
    }).from(researchCasesTable).where(eq(researchCasesTable.id, input.caseId)).for("update").limit(1);
    if (!locked || locked.caseType !== "target" || !locked.targetEntityId
      || locked.status === "complete" || locked.status === "cancelled"
      || ["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"].includes(String(locked.currentAction ?? ""))) return false;
    const latestFile = parseFile(locked.caseFile);
    if (!latestFile || String(latestFile.atlasJobId ?? latestFile.jobId ?? "") !== input.jobId) return false;
    if (!(await isCanonicalJobOwner("atlas-run", input.jobId))) return false;
    const [updated] = await tx.update(researchCasesTable)
      .set({ status: "review", currentAction: input.currentAction, lastDecisionAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(researchCasesTable.id, input.caseId),
        eq(researchCasesTable.caseType, "target"),
        eq(researchCasesTable.targetEntityId, locked.targetEntityId),
        cancellationFenceSql(input.caseId),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${input.jobId}`,
      ))
      .returning({ id: researchCasesTable.id });
    if (!updated) return false;
    if (!(await isCanonicalJobOwner("atlas-run", input.jobId))) throw new Error("Canonical Atlas lease was lost while committing target-control state; transaction rolled back.");
    return true;
  }, { isolationLevel: "serializable" });
}
function contextOf(file: Record<string, any>): string {
  const context = typeof file.contextDocument === "string" ? file.contextDocument.trim() : "";
  if (!context) throw new Error("Target case has no durable context document; refusing context-free continuation.");
  if (context.length <= 28000) return context;
  const available = Math.max(0, 28000 - CONTROL_CONTEXT_BOUND_MARKER.length);
  const head = Math.floor(available / 2);
  const tail = available - head;
  return context.slice(0, head) + CONTROL_CONTEXT_BOUND_MARKER + context.slice(-tail);
}
router.post("/research/bureau/target-cases/:caseId/run-next-pass", async (req, res): Promise<void> => {
  try { await enablePermanentRedis(); } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Permanent Redis is unavailable for canonical target continuation." }); return; }
  const caseId = Number(req.params.caseId); if (!Number.isInteger(caseId) || caseId <= 0) { res.status(400).json({ error: "Invalid target case ID" }); return; }
  const [current] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1); if (!current) { res.status(404).json({ error: "Target case not found" }); return; }
  const file = parseFile(current.caseFile); if (!file || file.target == null || current.caseType !== "target") { res.status(409).json({ error: "Only a canonical target case can run target continuation" }); return; }
  if (!Number.isInteger(Number(current.targetEntityId)) || Number(current.targetEntityId) <= 0) { res.status(409).json({ error: "Target case has no durable target entity" }); return; }
  const targetEntityId = Number(current.targetEntityId);
  const active = await getActiveJob("atlas-run"); if (active) { const existing = await getJob(active); if (existing?.status === "running" || existing?.status === "queued") { res.status(409).json({ error: "An Atlas investigation is already running.", jobId: active }); return; } }
  let contextDocument: string; try { contextDocument = contextOf(file); } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "Durable target context is missing." }); return; }
  let jobId: string | null = null;
  try { jobId = await createJob("atlas-run"); const claimed = await claimCanonicalJob("atlas-run", jobId); if (!claimed) { await updateJob(jobId, { status: "failed", outcome: "incomplete", message: "Another canonical Atlas job owns the distributed execution lock.", finishedAt: new Date().toISOString() }); res.status(409).json({ error: "Another canonical Atlas investigation owns the execution lock.", jobId }); return; } await setActiveJob("atlas-run", jobId); } catch (error) { if (jobId) { await updateJob(jobId, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Canonical Atlas lock acquisition failed.", finishedAt: new Date().toISOString() }).catch(() => undefined); await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined); await releaseCanonicalJob("atlas-run", jobId).catch(() => undefined); } res.status(503).json({ error: error instanceof Error ? error.message : "Canonical Atlas lock acquisition failed.", jobId }); return; }
  const targetName = typeof file.target.name === "string" ? file.target.name : ""; const targetType = typeof file.target.type === "string" ? file.target.type : "unknown"; const objective = typeof current.objective === "string" && current.objective ? current.objective : `Investigate the exact named target ${targetName} for realistic public contact routes.`; const priorInvestigator = Array.isArray(file.investigatorReports) ? file.investigatorReports.slice(-8) : []; const trajectoryRecords = Array.isArray(file.investigatorTrajectoryRecords) ? file.investigatorTrajectoryRecords.slice(-40) : []; const latestReport = priorInvestigator.length ? priorInvestigator[priorInvestigator.length - 1] : null; const controlHistory = Array.isArray(file.targetControlDecisions) ? file.targetControlDecisions : []; const latestControlTurn = controlHistory.reduce((max, item) => item && typeof item === "object" ? Math.max(max, Number((item as Record<string, unknown>).controlTurn ?? 0)) : max, 0); const [latestControlEvent] = await db.select({ payload: researchCaseEventsTable.payload }).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId, caseId), eq(researchCaseEventsTable.eventType, "control_decision"))).orderBy(desc(researchCaseEventsTable.id)).limit(1); let durableControlTurn = 0; if (typeof latestControlEvent?.payload === "string") { try { durableControlTurn = Number((JSON.parse(latestControlEvent.payload) as Record<string, unknown>).controlTurn ?? 0); } catch {} } const controlTurn = Math.max(Number(current.iteration ?? 0), latestControlTurn, durableControlTurn) + 1;
  try {
    await updateJob(jobId, { status: "running", progress: 0, total: 5, message: `Groq Boss reviewing continuation options for ${targetName}…` });
    if (!(await isCanonicalJobOwner("atlas-run", jobId))) throw new Error("Canonical Atlas lease was lost before target continuation control; refusing provider work.");

    // Claim the DB case before asking Boss to persist a decision. The control
    // component verifies caseFile.atlasJobId === jobId; rebinding only after the
    // model call made each continuation reject its own decision as stale.
    await db.transaction(async (tx) => {
      const [locked] = await tx.select({
        caseFile: researchCasesTable.caseFile,
        caseType: researchCasesTable.caseType,
        targetEntityId: researchCasesTable.targetEntityId,
        status: researchCasesTable.status,
        currentAction: researchCasesTable.currentAction,
      }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
      if (!locked || locked.caseType !== "target" || locked.targetEntityId !== targetEntityId) {
        throw Object.assign(new Error("Target continuation case binding changed before control authorization."), { statusCode: 409 });
      }
      if (locked.caseFile !== current.caseFile) {
        throw Object.assign(new Error("Target continuation case changed after it was read; refusing a stale projection."), { statusCode: 409 });
      }
      if (locked.status === "complete" || locked.status === "cancelled"
        || (locked.status === "review" && ["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"].includes(String(locked.currentAction ?? "")))) {
        throw Object.assign(new Error("Target continuation case is durably complete or cancelled and cannot be resumed."), { statusCode: 409, cancellationFence: true });
      }
      const latestFile = parseFile(locked.caseFile);
      if (!latestFile || latestFile.target == null) {
        throw Object.assign(new Error("Target continuation case state is unreadable or not target-scoped."), { statusCode: 409 });
      }
      if (!(await isCanonicalJobOwner("atlas-run", jobId))) {
        throw Object.assign(new Error("Canonical Atlas lease was lost while claiming target continuation."), { statusCode: 409 });
      }
      const claimedFile = { ...latestFile, atlasJobId: jobId, jobId, lastUpdatedBy: "groq-boss-target-control-claim" };
      const [claimed] = await tx.update(researchCasesTable)
        .set({ caseFile: JSON.stringify(claimedFile), status: "review", currentAction: "groq-target-control-pending", updatedAt: new Date() })
        .where(and(
          eq(researchCasesTable.id, caseId),
          eq(researchCasesTable.caseType, "target"),
          eq(researchCasesTable.targetEntityId, targetEntityId),
          cancellationFenceSql(caseId),
        ))
        .returning({ id: researchCasesTable.id });
      if (!claimed) {
        throw Object.assign(new Error("Target continuation case could not be claimed because its durable fence changed."), { statusCode: 409, cancellationFence: true });
      }
      if (!(await isCanonicalJobOwner("atlas-run", jobId))) {
        throw Object.assign(new Error("Canonical Atlas lease was lost while claiming target continuation."), { statusCode: 409 });
      }
    }, { isolationLevel: "serializable" });

    const decision = await withProviderScope(`atlas-run:${jobId}`, () => decideTargetNextAction({
      caseId, controlTurn, jobId, targetName, targetType, objective, contextDocument, trajectoryRecords,
      investigatorStatus: typeof latestReport?.status === "string" ? latestReport.status : current.status,
      investigatorStopReason: typeof file.investigatorStopReason === "string" ? file.investigatorStopReason : null,
    }));
    if (!(await isCanonicalJobOwner("atlas-run", jobId))) {
      throw Object.assign(new Error("Canonical Atlas lease was lost while Groq target control was running."), { statusCode: 409 });
    }

    // Unavailability is not an AI-selected successful stop. Keep the case
    // reviewable, but terminalize this job as failed/incomplete.
    if (decision.status !== "completed") {
      const [failedCase] = await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "target-control-error", lastDecisionAt: new Date(), updatedAt: new Date() })
        .where(and(
          cancellationFenceSql(caseId),
          eq(researchCasesTable.caseType, "target"),
          sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`,
        ))
        .returning({ id: researchCasesTable.id });
      const message = decision.error ?? decision.reason ?? "Groq target control was unavailable; continuation remains incomplete.";
      await updateJob(jobId, {
        status: failedCase ? "failed" : "cancelled", outcome: "incomplete",
        message: failedCase ? message : "Target control was fenced by a concurrent state or ownership change.",
        finishedAt: new Date().toISOString(),
      }).catch(() => undefined);
      await releaseContinuationLane(jobId);
      res.status(failedCase ? 503 : 409).json({ error: failedCase ? message : "Target continuation was fenced by a concurrent state or ownership change.", jobId, status: "incomplete" });
      return;
    }

    if (decision.action === "stop") {
      const [stopped] = await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "groq-target-stop", lastDecisionAt: new Date(), updatedAt: new Date() })
        .where(and(
          cancellationFenceSql(caseId),
          eq(researchCasesTable.caseType, "target"),
          sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`,
        ))
        .returning({ id: researchCasesTable.id });
      if (!stopped) {
        await updateJob(jobId, {
          status: "cancelled", outcome: "incomplete",
          message: "Target stop was not committed because the durable case or ownership fence changed.",
          finishedAt: new Date().toISOString(),
        }).catch(() => undefined);
        await releaseContinuationLane(jobId);
        res.status(409).json({ error: "Target stop was not committed; case state or ownership changed.", jobId });
        return;
      }
      await updateJob(jobId, {
        status: "done", progress: 5, total: 5, outcome: "complete",
        message: `Groq target control closed continuation for ${targetName}; case remains in review.`,
        result: JSON.stringify({ caseId, decision }), finishedAt: new Date().toISOString(),
      });
      await releaseContinuationLane(jobId);
      res.status(200).json({ caseId, jobId, status: "review", decision });
      return;
    }
    const direction = decision.direction?.trim() || "Reassess the strongest unresolved evidence question within the exact target scope.";
    const nextContextRaw = `${contextDocument}\n\n## Groq Boss — explicit continuation decision\nAction: ${decision.action}\nResearch direction: ${direction}\nReason: ${decision.reason ?? "not supplied"}\nConfidence: ${decision.confidence ?? "unknown"}\nThis direction is a research objective, not a prescribed tool sequence. Investigator retains control of every search, visit, pivot, evidence judgment, and stopping decision.`;
    const nextContext = nextContextRaw.length <= 32_000
      ? nextContextRaw
      : `${nextContextRaw.slice(0, 16_000)}\n\n[CONTINUATION CONTEXT BOUND: middle detail omitted; durable case state remains authoritative]\n\n${nextContextRaw.slice(-16_000)}`;
    const continuationEventKey = `target-continuation:case:${caseId}:job:${jobId}:turn:${controlTurn}`;
    await db.transaction(async (tx) => {
      const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, currentAction: researchCasesTable.currentAction }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
      if (!locked || locked.caseType !== "target" || locked.targetEntityId !== current.targetEntityId) throw Object.assign(new Error("Target continuation case binding changed before authorization projection."), { statusCode: 409 });
      if (locked.status === "complete" || locked.status === "cancelled" || (locked.status === "review" && ["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"].includes(String(locked.currentAction ?? "")))) throw Object.assign(new Error(locked.status === "complete" ? "Target continuation case is durably complete and cannot be resumed." : "Target continuation case is durably cancelled and cannot be resumed."), { statusCode: 409, cancellationFence: true });
      if (locked.status === "complete") throw Object.assign(new Error("Target continuation refused to reopen a completed canonical case from a stale continuation request."), { statusCode: 409 });
      const lockedFile = parseFile(locked.caseFile); if (!lockedFile) throw Object.assign(new Error("Target continuation case state became unreadable before authorization projection."), { statusCode: 409 });
      if (String(lockedFile.atlasJobId ?? lockedFile.jobId ?? "") !== jobId) throw Object.assign(new Error("Target continuation case is owned by another Atlas job."), { statusCode: 409 });
      if (!(await isCanonicalJobOwner("atlas-run", jobId))) throw Object.assign(new Error("Canonical Atlas lease was lost before continuation authorization projection."), { statusCode: 409 });
      const nextFile = { ...lockedFile, atlasJobId: jobId, jobId, contextDocument: nextContext, nextInvestigation: { ...(lockedFile.nextInvestigation ?? {}), targetControl: { action: decision.action, direction, reason: decision.reason, confidence: decision.confidence, rightHand: decision.rightHand, bossModel: decision.bossModel, jobId, controlTurn, recordedAt: new Date().toISOString() } }, lastUpdatedBy: "groq-boss-target-control" };
      const [authorized] = await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), status: "active", currentAction: `groq-${decision.action}`, iteration: controlTurn, updatedAt: new Date() }).where(and(
        eq(researchCasesTable.id, caseId),
        cancellationFenceSql(caseId),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`,
      )).returning({ id: researchCasesTable.id });
      if (!authorized) throw Object.assign(new Error("Target continuation authorization lost its durable ownership fence."), { statusCode: 409, cancellationFence: true });
      if (!(await isCanonicalJobOwner("atlas-run", jobId))) throw Object.assign(new Error("Canonical Atlas lease was lost while committing continuation authorization."), { statusCode: 409 });
      await tx.insert(researchCaseEventsTable).values({ caseId, iteration: controlTurn, actorRole: "groq_boss", eventType: "assignment", status: "recorded", summary: `Groq Boss authorized ${decision.action} for target continuation.`, correlationKey: continuationEventKey, payload: JSON.stringify({ direction, reason: decision.reason, confidence: decision.confidence, bossModel: decision.bossModel, jobId, controlTurn, targetEntityId: current.targetEntityId }) }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
    }, { isolationLevel: "serializable" });
    await updateJob(jobId, { progress: 1, message: `Groq Boss authorized ${decision.action}; remounting target context for ${targetName}…`, result: JSON.stringify({ caseId, decision }) });
    void (async () => { try { await withProviderScope(`atlas-run:${jobId}`, () => runCanonicalSingleTargetInvestigation(jobId!, Number(current.targetEntityId), { existingCaseId: caseId, initialDirection: direction })); } catch (error) { const message = error instanceof Error ? error.message : "Target continuation failed."; await db.update(researchCasesTable).set({ status: "review", currentAction: "target-continuation-error", updatedAt: new Date() }).where(and(cancellationFenceSql(caseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`)); await updateJob(jobId!, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() }); } finally { await clearActiveJobIfOwned("atlas-run", jobId!); await releaseCanonicalJob("atlas-run", jobId!).catch(() => undefined); } })();
    res.status(202).json({ caseId, jobId, status: "running", decision, mode: "canonical-model-owned-target-continuation" });
  } catch (error) {
    const statusCode = Number((error as { statusCode?: unknown })?.statusCode ?? 503);
    const cancellationFence = Boolean((error as { cancellationFence?: unknown })?.cancellationFence);
    if (cancellationFence) { await updateJob(jobId, { status: "cancelled", outcome: "incomplete", message: "Continuation rejected by the durable cancellation fence.", finishedAt: new Date().toISOString() }).catch(() => undefined); await releaseContinuationLane(jobId); res.status(409).json({ error: "This canonical target case is durably cancelled and cannot be resumed." }); return; }
    const message = error instanceof Error ? error.message : "Target control decision failed.";
    const [updated] = await db.update(researchCasesTable).set({ status: "review", currentAction: "target-control-error", updatedAt: new Date() }).where(and(cancellationFenceSql(caseId), eq(researchCasesTable.caseType, "target"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${jobId}`)).returning({ id: researchCasesTable.id });
    const [latestCase] = await db.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
    const latestFile = parseFile(latestCase?.caseFile ?? null);
    const durableFence = !latestCase || latestCase.status === "complete" || latestCase.status === "cancelled"
      || (latestCase.status === "review" && ["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"].includes(String(latestCase.currentAction ?? "")))
      || String(latestFile?.atlasJobId ?? latestFile?.jobId ?? "") !== jobId;
    await updateJob(jobId, { status: updated ? "failed" : durableFence ? "cancelled" : "failed", outcome: "incomplete", message: updated ? message : durableFence ? "Target control failed after durable case/ownership fencing." : message, finishedAt: new Date().toISOString() }).catch(() => undefined);
    await releaseContinuationLane(jobId);
    res.status(updated ? (statusCode >= 400 && statusCode < 600 ? statusCode : 503) : durableFence ? 409 : 503).json({ error: updated ? message : durableFence ? "This canonical target case is fenced or owned by another Atlas job." : message, jobId });
  }
});
export default router;
