import { describe, expect, it } from "vitest";
import { parseReactorAtlasPoll } from "./reactor-page-atlas-poll";

describe("Reactor page canonical Atlas poll contract", () => {
  it("projects nested job fields only after validating the active wrapper", () => {
    const job = { jobId: "job-1", status: "running", message: "Investigating", progress: 2 };
    expect(parseReactorAtlasPoll({ type: "atlas-run", jobId: "job-1", job, active: true }))
      .toEqual({ runStatus: "running", jobId: "job-1", job });
  });

  it("keeps queued distinct from actual research activity", () => {
    const job = { jobId: "job-2", status: "queued", message: "Queued" };
    expect(parseReactorAtlasPoll({ type: "atlas-run", jobId: "job-2", job, active: true }))
      .toEqual({ runStatus: "queued", jobId: "job-2", job });
  });

  it.each(["done", "failed", "cancelled"])("accepts matching %s terminal wrapper", (status) => {
    const job = { jobId: "job-terminal", status, message: "Terminal result" };
    expect(parseReactorAtlasPoll({ type: "atlas-run", jobId: "job-terminal", job, active: false, jobStatus: status }))
      .toEqual({ runStatus: status, jobId: "job-terminal", job });
  });

  it("recognizes only explicit canonical idle", () => {
    expect(parseReactorAtlasPoll({ type: "atlas-run", jobId: null, job: null, active: false }))
      .toEqual({ runStatus: "idle", jobId: null, job: null });
  });

  it.each([
    null,
    {},
    { type: "atlas-run", jobId: null, job: null, active: true },
    { type: "atlas-run", jobId: "job-1", job: { jobId: "other", status: "running" }, active: true },
    { type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "done" }, active: true },
    { type: "another-lane", jobId: "job-1", job: { jobId: "job-1", status: "running" }, active: true },
    { type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "failed" }, active: false, jobStatus: "done" },
  ])("returns unknown for malformed or contradictory snapshots: %j", (value) => {
    expect(parseReactorAtlasPoll(value)).toBeNull();
  });
});
