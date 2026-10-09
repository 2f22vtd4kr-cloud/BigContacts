import { describe, expect, it } from "vitest";
import type { DigSpan } from "../lib/dig-span";
import type { DiscoveryTrace } from "../lib/investigator-trace";
import { buildAtlasTracePayload } from "../routes/investigator-trace";

describe("canonical Atlas live trace contract", () => {
  it("keeps per-action spans separate from durable discovery slots", () => {
    const span: DigSpan = {
      id: "span-1",
      jobId: "job-1",
      spanType: "tool",
      name: "web_search",
      status: "ok",
      startedAt: "2026-10-09T08:00:00.000Z",
      operationName: "execute_tool",
      agentName: "investigator",
      inputSummary: "Gordon Gund",
      resultSummary: "8 recorded URLs",
    };
    const discovery: DiscoveryTrace = {
      jobId: "job-1",
      updatedAt: "2026-10-09T08:00:01.000Z",
      slots: [{
        slot: 1,
        recordedAt: "2026-10-09T08:00:01.000Z",
        searches: 1,
        visits: 1,
        modelFindings: [],
        parsedCandidates: [],
        trajectory: ["step1: web_search execution=success"],
        resultUrls: ["https://example.com/source"],
      }],
    };
    const payload = buildAtlasTracePayload("job-1", [span], discovery);
    expect(payload.trace).toEqual([span]);
    expect(payload.trace[0]?.id).toBe("span-1");
    expect(payload.trace[0]).not.toHaveProperty("slot");
    expect(payload.discoveryTrace).toEqual(discovery.slots);
    expect(payload.updatedAt).toBe(discovery.updatedAt);
  });

  it("returns a valid empty span list rather than adapting summary records into fake spans", () => {
    const payload = buildAtlasTracePayload("job-2", [], null);
    expect(payload.trace).toEqual([]);
    expect(payload.discoveryTrace).toEqual([]);
    expect(payload.updatedAt).toBeNull();
  });
});
