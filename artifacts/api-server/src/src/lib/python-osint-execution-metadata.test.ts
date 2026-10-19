import { describe, expect, it } from "vitest";
import { applyPythonToolExecutionMetadata, type AgenticTrajectoryRecord } from "./agentic-web-research-core";

function record(): AgenticTrajectoryRecord {
  return {
    turn: 1, model: "unit-test", action: "footprint_username_maigret",
    args: { username: "alice" }, execution: "selected", observedUrls: [], findings: [],
  };
}
function response(status: string, available: boolean) {
  return {
    available,
    execution: {
      requestId: "00000000-0000-4000-8000-000000000001",
      tool: "maigret", status, toolVersion: "0.6.6",
      startedAt: "2026-10-19T10:00:00.000Z", finishedAt: "2026-10-19T10:00:01.000Z",
      executorId: "unit-test-worker", workerImageDigest: "sha256:" + "a".repeat(64),
      egressProxyImageDigest: "sha256:" + "b".repeat(64),
      isolationProofIssuedAt: "2026-10-19T09:00:00.000Z",
      isolationProofExpiresAt: "2026-10-19T15:00:00.000Z",
      correlation: { jobId: "job-123", caseId: 4, investigatorTurn: 1 },
      remoteCancellationConfirmed: false,
    },
  };
}
describe("canonical OSINT trajectory status", () => {
  it("records completed operations as success regardless of result count", () => {
    const item = record();
    applyPythonToolExecutionMetadata(item, response("completed", true), new AbortController().signal);
    expect(item.execution).toBe("success");
    expect(item.args.toolExecution).toMatchObject({ status: "completed", workerImageDigest: "sha256:" + "a".repeat(64) });
  });
  it("never upgrades a usable partial result to complete success", () => {
    const item = record();
    applyPythonToolExecutionMetadata(item, response("partial", true), new AbortController().signal);
    expect(item.execution).toBe("partial");
    expect(item.failureDomain).toBe("tool_execution");
    expect(item.args.toolExecution).toMatchObject({ status: "partial", correlation: { jobId: "job-123", caseId: 4, investigatorTurn: 1 } });
  });
  it("preserves timeout and cancelled terminal meanings", () => {
    const timeout = record();
    applyPythonToolExecutionMetadata(timeout, response("timeout", false), new AbortController().signal);
    expect(timeout.execution).toBe("timeout");
    const controller = new AbortController(); controller.abort();
    const cancelled = record();
    applyPythonToolExecutionMetadata(cancelled, response("completed", true), controller.signal);
    expect(cancelled.execution).toBe("cancelled");
  });
  it("does not classify an unavailable or malformed execution as success", () => {
    const item = record();
    applyPythonToolExecutionMetadata(item, { available: true }, new AbortController().signal);
    expect(item.execution).toBe("error");
  });
});
