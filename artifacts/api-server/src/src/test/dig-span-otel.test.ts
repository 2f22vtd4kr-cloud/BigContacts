import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { digSpanStatusFromExecutionStatus, publishDigSpan, spanFromLiveStep, toOtelGenAiAttributes, clearDigSpansForJob, getRecentDigSpans } from "../lib/dig-span";

describe("live execution status mapping", () => {
  it("does not convert failed target-stage results into successful spans", () => {
    expect(digSpanStatusFromExecutionStatus("completed")).toBe("ok");
    expect(digSpanStatusFromExecutionStatus("timeout")).toBe("error");
    expect(digSpanStatusFromExecutionStatus("unavailable")).toBe("error");
    expect(digSpanStatusFromExecutionStatus("error")).toBe("error");
    expect(digSpanStatusFromExecutionStatus("cancelled")).toBe("cancelled");
    expect(digSpanStatusFromExecutionStatus("skipped")).toBe("unknown");
    expect(digSpanStatusFromExecutionStatus(undefined)).toBe("unknown");

    const targetSource = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-contact-agent.ts"), "utf8");
    const passSource = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");
    expect(targetSource).toContain("digSpanStatusFromExecutionStatus(agentic.status)");
    expect(targetSource).not.toContain('status: agentic.status === "timeout" ? "error" : agentic.status === "cancelled" ? "cancelled" : "ok"');
    expect(targetSource).toContain('step.status ?? (step.action === "provider_error" || step.action === "parse_failure_terminal" ? "error" : undefined)');
    expect(passSource).toContain('step.status??(step.action==="provider_error"||step.action==="parse_failure_terminal"?"error":undefined)');
    expect(passSource).not.toContain('step.status??(step.action==="provider_error"||step.action==="parse_failure_terminal"?"error":"ok")');
  });


  it("does not turn failed, unresolved, or merely selected tool steps into successful spans", () => {
    for (const status of ["error", "http_error", "blocked", "timeout", "failed", "unavailable"]) {
      const span = spanFromLiveStep({ jobId: "status-" + status, tool: "web_search", status });
      expect(span?.status).toBe("error");
    }
    for (const status of ["selected", "unknown", "future-status", ""]) {
      const span = spanFromLiveStep({ jobId: "status-unknown-" + status, tool: "web_search", status });
      expect(span?.status).toBe("unknown");
    }
    const missing = spanFromLiveStep({ jobId: "status-missing", tool: "web_search" });
    expect(missing?.status).toBe("unknown");
    const active = spanFromLiveStep({ jobId: "status-active", tool: "web_search", status: "active" });
    expect(active?.status).toBe("active");
    const cancelled = spanFromLiveStep({ jobId: "status-cancelled", tool: "web_search", status: "cancelled" });
    expect(cancelled?.status).toBe("cancelled");
    for (const status of ["ok", "success", "completed", "done", "succeeded", "empty"]) {
      const span = spanFromLiveStep({ jobId: "status-success-" + status, tool: "web_search", status });
      expect(span?.status).toBe("ok");
    }
  });
});

describe("dig-span otel mapping", () => {
  it("maps tool span to execute_tool + tool.name + conversation.id", () => {
    clearDigSpansForJob("job-test-otel");
    const span = publishDigSpan({
      jobId: "job-test-otel",
      spanType: "tool",
      name: "web_search",
      status: "ok",
      agentName: "investigator",
      inputSummary: "Gordon Gund Princeton",
      resultSummary: "8 hits",
    });
    const attrs = toOtelGenAiAttributes(span);
    expect(attrs["gen_ai.operation.name"]).toBe("execute_tool");
    expect(attrs["gen_ai.tool.name"]).toBe("web_search");
    expect(attrs["gen_ai.conversation.id"]).toBe("job-test-otel");
    expect(attrs["gen_ai.agent.name"]).toBe("investigator");
  });

  it("retires active spans into the global terminal trail when a job stops", () => {
    const jobId = "job-test-stop";
    clearDigSpansForJob(jobId);
    const active = publishDigSpan({
      jobId,
      spanType: "tool",
      name: "visit",
      status: "active",
      agentName: "investigator",
      inputSummary: "https://example.com/person",
    });

    clearDigSpansForJob(jobId);

    expect(getRecentDigSpans(jobId, 10)).toHaveLength(0);
    const global = getRecentDigSpans(null, 20).find((span) => span.id === active.id);
    expect(global?.status).toBe("error");
    expect(global?.endedAt).toBeTruthy();
    expect(global?.resultSummary).toBe("job stopped before tool completed");
  });
});
