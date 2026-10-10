import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseAtlasRunSnapshot } from "./atlas-run-status-contract";

const hookSource = readFileSync(new URL("./use-atlas-run.ts", import.meta.url), "utf8");

describe("canonical Atlas run polling contract", () => {
  it("accepts only the explicit idle response", () => {
    expect(parseAtlasRunSnapshot({
      type: "atlas-run",
      jobId: null,
      job: null,
      active: false,
    })).toEqual({ active: false });
  });

  it("accepts active states only when the durable job identity and status agree", () => {
    expect(parseAtlasRunSnapshot({
      type: "atlas-run",
      jobId: "job-1",
      job: {
        jobId: "job-1",
        status: "running",
        message: "Investigating",
        targetName: "Example Target",
        atlasPhase: 2,
        atlasPhaseTotal: 6,
      },
      active: true,
    })).toEqual({
      active: true,
      status: "running",
      jobId: "job-1",
      message: "Investigating",
      targetName: "Example Target",
      phase: 2,
      phaseTotal: 6,
    });
  });

  it.each(["done", "failed", "cancelled"])("accepts a matching %s terminal state", (status) => {
    expect(parseAtlasRunSnapshot({
      type: "atlas-run",
      jobId: "job-1",
      job: { jobId: "job-1", status, message: "Terminal result" },
      active: false,
      jobStatus: status,
    })).toMatchObject({ active: false, status, jobId: "job-1", message: "Terminal result" });
  });

  it.each([
    null,
    [],
    {},
    { active: false },
    { active: false, jobId: null, job: { jobId: "stale" } },
    { active: true, jobId: "job-1", job: null },
    { active: true, jobId: "job-1", job: { jobId: "other", status: "running" } },
    { active: true, jobId: "job-1", job: { jobId: "job-1", status: "done" } },
    { active: false, jobId: "job-1", job: { jobId: "job-1", status: "failed" }, jobStatus: "done" },
    { active: false, jobId: "job-1", job: { jobId: "job-1", status: "completed" }, jobStatus: "completed" },
  ])("rejects malformed or contradictory successful payloads: %j", (payload) => {
    expect(parseAtlasRunSnapshot(payload)).toBeNull();
  });

  it("validates a snapshot before allowing the hook to replace the last known state", () => {
    const validation = hookSource.indexOf("const snapshot = parseAtlasRunSnapshot(data);");
    const invalidGuard = hookSource.indexOf("if (!snapshot) return;", validation);
    const stateUpdate = hookSource.indexOf("setRun(snapshot);", validation);

    expect(validation).toBeGreaterThanOrEqual(0);
    expect(invalidGuard).toBeGreaterThan(validation);
    expect(stateUpdate).toBeGreaterThan(invalidGuard);
    expect(hookSource.slice(invalidGuard, stateUpdate)).not.toContain("setRun(");
  });
});
