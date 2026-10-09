import { describe, expect, it } from "vitest";
import { normalizeLiveActivityStatus, normalizeReactorStatus, parseCanonicalActiveJobProjection, sceneStatusLabel } from "./reactor-live-model";
import fs from "node:fs";
import path from "node:path";

const storePath = path.resolve(process.cwd(), "src/lib/reactor-live-store.ts");
const opsStagePath = path.resolve(process.cwd(), "src/components/bureau-ops-stage.tsx");

function readStore(): string {
  return fs.readFileSync(storePath, "utf8");
}

describe("Reactor status truth boundary", () => {
  it("preserves explicit success, cancellation, queue, failure, and unknown states", () => {
    expect(normalizeReactorStatus("ok")).toBe("done");
    expect(normalizeReactorStatus("completed")).toBe("done");
    expect(normalizeReactorStatus("cancelled")).toBe("cancelled");
    expect(normalizeReactorStatus("queued")).toBe("queued");
    expect(normalizeReactorStatus("failed")).toBe("failed");
    expect(normalizeReactorStatus("")).toBe("unknown");
    expect(normalizeReactorStatus("future-status")).toBe("unknown");
    expect(normalizeLiveActivityStatus("ok")).toBe("completed");
    expect(normalizeLiveActivityStatus("cancelled")).toBe("cancelled");
    expect(normalizeLiveActivityStatus("queued")).toBe("queued");
    expect(normalizeLiveActivityStatus("failed")).toBe("failed");
    expect(normalizeLiveActivityStatus(undefined)).toBe("unknown");
  });
});

describe("Bureau Ops terminal-label truth boundary", () => {
  it("does not render unknown or cancelled activity as done", () => {
    expect(sceneStatusLabel(true, null)).toBe("Now");
    expect(sceneStatusLabel(false, "done")).toBe("Done");
    expect(sceneStatusLabel(false, "failed")).toBe("Fail");
    expect(sceneStatusLabel(false, "cancelled")).toBe("Stopped");
    expect(sceneStatusLabel(false, "queued")).toBe("Queued");
    expect(sceneStatusLabel(false, "unknown")).toBe("Unknown");
    expect(sceneStatusLabel(false, null)).toBe("Unknown");

    const source = fs.readFileSync(opsStagePath, "utf8");
    expect(source).toContain("sceneStatusLabel(scene.live, scene.terminal)");
    expect(source).toContain('terminal: capped[i].terminal ?? "unknown"');
    expect(source).not.toContain('terminal: capped[i].terminal ?? "done"');
  });
});

describe("canonical Reactor active-job projection", () => {
  it("accepts only explicit idle, active, and internally consistent terminal states", () => {
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: null, job: null, active: false }))
      .toEqual({ runStatus: "idle", jobId: null });
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "running" }, active: true }))
      .toEqual({ runStatus: "running", jobId: "job-1" });
    expect(parseCanonicalActiveJobProjection({ type: "atlas-run", jobId: "job-1", job: { jobId: "job-1", status: "failed" }, active: false, jobStatus: "failed" }))
      .toEqual({ runStatus: "failed", jobId: "job-1" });
  });

  it("rejects malformed successful responses instead of manufacturing idle or running", () => {
    expect(parseCanonicalActiveJobProjection({})).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: false })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: null })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: { jobId: "other", status: "running" } })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: true, jobId: "job-1", job: { jobId: "job-1", status: "done" } })).toBeNull();
    expect(parseCanonicalActiveJobProjection({ active: false, jobId: "job-1", job: { jobId: "job-1", status: "running" }, jobStatus: "running" })).toBeNull();
  });
});

describe("Reactor live telemetry source boundary", () => {
  it("uses canonical active-job status and trace, never the retired status route", () => {
    const source = readStore();

    expect(source).toContain("/api/ingest/job/active/atlas-run");
    expect(source).toContain("/api/ingest/atlas-trace/");
    expect(source).not.toContain("/api/ingest/atlas-status");
    expect(source).toContain('import { readApiJson } from "./api-json"');
    expect(source).not.toContain("activeResponse.json()");
    expect(source).not.toContain("traceResponse.json()");
    expect(source).not.toContain("emit(EMPTY)");
    expect(source).toContain("function sameActivity(a: LiveActivity, b: LiveActivity): boolean");
    expect(source).toContain("a.inputSummary === b.inputSummary");
    expect(source).toContain("a.tool === b.tool");
    expect(source).toContain("sameOptionalStrings(a.sourceUrls, b.sourceUrls)");
    expect(source).toContain("parseCanonicalActiveJobProjection(activeData)");
    expect(source).toContain("if (!activeProjection) return;");
  });
});
