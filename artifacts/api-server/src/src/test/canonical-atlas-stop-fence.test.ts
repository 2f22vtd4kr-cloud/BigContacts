import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { classifyActiveJobLaneStatus } from "../lib/job-queue-terminal-policy";

const routePath = path.resolve(process.cwd(), "src/src/routes/research/canonical-atlas-launch.ts");

describe("canonical Atlas stop fence", () => {
  it("only transitions active durable cases to review so a late stop cannot downgrade completion", () => {
    const source = fs.readFileSync(routePath, "utf8");
    const stopBlock = source.slice(source.indexOf('router.post("/ingest/atlas-stop"'));
    expect(stopBlock).toContain('eq(researchCasesTable.status, "active")');
    expect(stopBlock).toContain('currentAction: "canonical-atlas-cancelled"');
    expect(stopBlock).toContain("researchCasesTable.caseFile");
  });

  it("fences discovery-case creation and opening-event append against stop races", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
    expect(source).toContain("reconcileDiscoveryCaseCancellation");
    expect(source).toMatch(/currentAction:\s*cancelled\s*\?\s*"canonical-atlas-cancelled"/);
    expect(source).toContain('eq(researchCasesTable.status, "active")');
    expect(source).toContain(".for(\"update\")");
    expect(source).toContain("refusing assignment event after cancellation");
  });

  it("fences active cases left behind by an expired canonical lease before a new launch", () => {
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain("fenceStaleCanonicalCases");
    expect(source).toContain('currentAction: "canonical-lease-lost"');
    expect(source).toContain("lockClaimed = true;");
    expect(source).toContain("await fenceStaleCanonicalCases(atlasJobId);");
    expect(source).toContain("'atlasJobId'");
    expect(source).toContain("'jobId'");
    expect(source).toContain("'caseType'");
    expect(source).not.toContain("caseFile: sql`jsonb_set(jsonb_set");
  });

  it("reconciles a target case created across the cancellation check-before-create race", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");
    expect(source).toContain("reconcileTargetCaseCancellation");
    expect(source).toMatch(/currentAction:\s*cancelled\s*\?\s*"canonical-atlas-cancelled"/);
    expect(source).toContain("await reconcileTargetCaseCancellation(atlasJobId, caseRow.id);");
  });

  it("checks affected-row fences before target opening provider/event transitions", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");
    expect(source).toContain("openingFence");
    expect(source).toContain("openingProjection");
    expect(source).toContain("refusing Boss opening event after cancellation");
    expect(source).toContain("refusing Right-hand opening event after cancellation");
  });

  it("keeps discovery lock cleanup inside the claim-owned failure boundary", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-case-discovery.ts"), "utf8");
    expect(source).toContain('await setActiveJob("case-bureau-discovery", jobId!);');
    expect(source).toContain('await releaseCanonicalJob("atlas-run", jobId!).catch');
    expect(source).toContain("try {");
    expect(source).toContain('safeThrownErrorSummary("Canonical discovery lock acquisition failed", error)');
  });

  it("releases the target continuation lock if active-job binding fails", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-target-continuation.ts"), "utf8");
    expect(source).toContain('await setActiveJob("atlas-run", jobId);');
    expect(source).toContain('await releaseCanonicalJob("atlas-run", jobId).catch');
  });

  it("propagates live lease ownership into canonical control and Investigator cancellation fences", () => {
    const lock = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-job-lock.ts"), "utf8");
    const discovery = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
    const agentic = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
    expect(lock).toContain("isCanonicalJobOwner");
    expect(discovery).toContain('isCanonicalJobOwner("atlas-run", jobId)');
    expect(agentic).toContain("isCanonicalJobOwner(lockType, input.jobId)");
  });
  it("transient renewal errors retry without falsely fencing a current owner", () => {
    const lock = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-job-lock.ts"), "utf8");
    expect(lock).toContain("local owner=redis.call(\'get\',KEYS[1]); if owner==ARGV[1] then return 0 end;");
    expect(lock).toContain("if not status or status==\'done\' or status==\'failed\' or status==\'cancelled\' then return 0 end");
    expect(lock).toContain("const [redisResult, databaseResult] = await Promise.allSettled([redisFence, dbFence]);");
    expect(lock).toContain('if (redisResult.status === "rejected" || databaseResult.status === "rejected")');
    expect(lock).toContain("Canonical lease-loss fencing incomplete: redis=");
    const timer = lock.slice(lock.indexOf("const timer = setInterval"));
    expect(timer).toContain("Canonical lease renewal failed; retrying before fencing");
    expect(timer).toContain("if (!renewed)");
    expect(timer).not.toContain("catch(() => { const current = leaseTimers.get(timerKey)");
  });

  it("does not treat a stale active-job key as authority to cancel a terminal job", () => {
    const source = fs.readFileSync(routePath, "utf8");
    const stopBlock = source.slice(source.indexOf('router.post("/ingest/atlas-stop"'));
    for (const status of ["done", "failed", "cancelled"]) {
      expect(classifyActiveJobLaneStatus(status)).toBe("terminal");
    }
    expect(classifyActiveJobLaneStatus("running")).toBe("active");
    expect(classifyActiveJobLaneStatus("unrecognized")).toBe("unknown");

    const statusCheck = stopBlock.indexOf("classifyActiveJobLaneStatus(activeJob.status)");
    const durableCaseFence = stopBlock.indexOf("await db.update(researchCasesTable)");
    expect(statusCheck).toBeGreaterThan(-1);
    expect(durableCaseFence).toBeGreaterThan(statusCheck);
    expect(stopBlock).toContain("status: activeJob.status");
    expect(stopBlock).toContain("Atlas job is already terminal; no stop was applied.");
    expect(stopBlock).toContain("Persisted Atlas job status is unrecognized; no stop was claimed.");
  });

  it("only acknowledges operator cancellation after strict persisted-state confirmation", () => {
    const source = fs.readFileSync(routePath, "utf8");
    const stopBlock = source.slice(source.indexOf('router.post("/ingest/atlas-stop"'));
    const cancelWrite = stopBlock.indexOf("await updateJob(activeJobId, {");
    const strictReadBack = stopBlock.indexOf("await getJobStrict(activeJobId)", cancelWrite + 1);
    const losingRaceGuard = stopBlock.indexOf('if (confirmedJob.status !== "cancelled")', strictReadBack);
    const durableCaseFence = stopBlock.indexOf("await db.update(researchCasesTable)", strictReadBack);
    const successResponse = stopBlock.indexOf(
      'res.json({ ok: true, jobId: activeJobId, status: "cancelled", message: "Atlas stopped." });',
    );

    expect(cancelWrite).toBeGreaterThan(-1);
    expect(strictReadBack).toBeGreaterThan(cancelWrite);
    expect(losingRaceGuard).toBeGreaterThan(strictReadBack);
    expect(durableCaseFence).toBeGreaterThan(losingRaceGuard);
    expect(successResponse).toBeGreaterThan(durableCaseFence);
    expect(stopBlock).toContain('confirmedJob.status !== "cancelled"');
    expect(stopBlock).toContain("CANCELLATION_STATE_UNCONFIRMED");
    expect(stopBlock).toContain("CANCELLATION_FENCE_UNCONFIRMED");
  });

});
