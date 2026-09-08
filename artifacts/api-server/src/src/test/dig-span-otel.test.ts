import { describe, expect, it } from "vitest";
import { publishDigSpan, toOtelGenAiAttributes, clearDigSpansForJob, getRecentDigSpans } from "../lib/dig-span";

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
