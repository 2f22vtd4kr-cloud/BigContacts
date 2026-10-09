import { describe, expect, it } from "vitest";
import { parseCanonicalActiveJobProjection } from "../../../../apex-finder/src/lib/reactor-live-model";

describe("Reactor canonical active-job response contract", () => {
  it("accepts explicit idle, active, and terminal response shapes", () => {
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: null, job: null, active: false }))
      .toEqual({ runStatus: "idle", jobId: null });
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "running" }, active: true }))
      .toEqual({ runStatus: "running", jobId: "job-1" });
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "failed" }, active: false, jobStatus: "failed" }))
      .toEqual({ runStatus: "failed", jobId: "job-1" });
  });

  it("rejects malformed 200 JSON bodies instead of fabricating run state", () => {
    expect(parseCanonicalActiveJobProjection({})).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: false })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: null })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: { jobId: "other", status: "running" } })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: { jobId: "job-1", status: "done" } })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: false, jobId: "job-1", job: { jobId: "job-1", status: "running" }, jobStatus: "running" })).toBeNull();
  });
});
