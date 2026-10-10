import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyActiveJobLaneStatus } from "../lib/job-queue-terminal-policy";

const launchSource = readFileSync(
  resolve(process.cwd(), "src/src/routes/research/canonical-atlas-launch.ts"),
  "utf8",
);
const stopRouteStart = launchSource.indexOf('router.post("/ingest/atlas-stop"');
const stopRouteSource = stopRouteStart >= 0 ? launchSource.slice(stopRouteStart) : "";

describe("canonical Atlas stop-route terminal truth", () => {
  it("does not treat a stale active-job key as authority to cancel a terminal job", () => {
    for (const status of ["done", "failed", "cancelled"]) {
      expect(classifyActiveJobLaneStatus(status)).toBe("terminal");
    }

    const statusCheck = stopRouteSource.indexOf("classifyActiveJobLaneStatus(activeJob.status)");
    const durableCaseFence = stopRouteSource.indexOf("await db.update(researchCasesTable)");

    expect(stopRouteStart).toBeGreaterThanOrEqual(0);
    expect(statusCheck).toBeGreaterThan(-1);
    expect(durableCaseFence).toBeGreaterThan(statusCheck);
    expect(stopRouteSource).toContain("status: activeJob.status");
    expect(stopRouteSource).toContain("Atlas job is already terminal; no stop was applied.");
  });

  it("only acknowledges cancellation after a strict read confirms the persisted job is cancelled", () => {
    const cancelWrite = stopRouteSource.indexOf('await updateJob(activeJobId, {');
    const strictReadBack = stopRouteSource.indexOf("await getJobStrict(activeJobId)", cancelWrite + 1);
    const successResponse = stopRouteSource.indexOf(
      'res.json({ ok: true, jobId: activeJobId, status: "cancelled", message: "Atlas stopped." });',
    );

    expect(cancelWrite).toBeGreaterThan(-1);
    expect(strictReadBack).toBeGreaterThan(cancelWrite);
    expect(successResponse).toBeGreaterThan(strictReadBack);
    expect(stopRouteSource).toContain('confirmedJob.status !== "cancelled"');
    expect(stopRouteSource).toContain("CANCELLATION_STATE_UNCONFIRMED");
  });
});
