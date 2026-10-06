import { describe, expect, it } from "vitest";
import { buildActEvidenceGraphs } from "../lib/target-act-oversight";

describe("target act evidence graph provenance", () => {
  it("rejects search-result records as claim-grade evidence", () => {
    const act = {
      turn: 1, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "search summary", observedUrls: ["https://example.com/team/jane"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: ["https://example.com/team/jane"] }],
      sourceRecords: [{ turn: 1, action: "web_search", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["https://example.com/team/jane"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 1, "run-search-only")).toHaveLength(0);
  });

  it("accepts the same claim when grounded in a retrieved source record", () => {
    const act = {
      turn: 2, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "retrieved source", observedUrls: ["https://example.com/team/jane"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: ["https://example.com/team/jane"] }],
      sourceRecords: [{ turn: 2, action: "visit", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["https://example.com/team/jane"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 2, "run-visited")).toHaveLength(1);
  });
});
