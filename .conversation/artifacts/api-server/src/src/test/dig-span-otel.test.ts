import { describe, expect, it } from "vitest";
import { publishDigSpan, toOtelGenAiAttributes, clearDigSpansForJob } from "../lib/dig-span";

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
});
