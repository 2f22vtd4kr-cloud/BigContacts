import { describe, expect, it } from "vitest";
import { replayInvestigatorTrajectoryEvents } from "./durable-trajectory-replay";

describe("immutable Investigator trajectory replay", () => {
  it("reconstructs ordered observations with exact provenance and failure state", () => {
    const records = replayInvestigatorTrajectoryEvents([
      {
        id: 12,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-a",
          runModel: "investigator-model",
          turn: 2,
          action: "visit",
          args: { url: "https://registry.example/record/2" },
          execution: "blocked",
          observation: "Fetch was blocked by the runtime policy; no source conclusion was reached.",
          observedUrls: [],
          leadUrls: ["https://registry.example/record/2"],
          findings: [],
          sourceBindings: [],
          failureDomain: "tool_execution",
          failureKind: "request_failure",
        }),
      },
      {
        id: 10,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-a",
          runModel: "investigator-model",
          turn: 1,
          action: "web_search",
          args: { query: "Example Registry" },
          execution: "success",
          observation: "Search results returned a candidate record.",
          observedUrls: [],
          leadUrls: ["https://registry.example/record/2"],
          findings: [],
          sourceBindings: [],
        }),
      },
      {
        id: 13,
        eventType: "claim",
        payload: JSON.stringify({ turn: 3, action: "done", execution: "success" }),
      },
    ]);

    expect(records.map((record) => record.turn)).toEqual([1, 2]);
    expect(records[0]).toMatchObject({
      action: "web_search",
      execution: "success",
      args: { query: "Example Registry" },
      leadUrls: ["https://registry.example/record/2"],
      durableEventId: 10,
    });
    expect(records[1]).toMatchObject({
      action: "visit",
      execution: "blocked",
      observedUrls: [],
      leadUrls: ["https://registry.example/record/2"],
      failureDomain: "tool_execution",
      failureKind: "request_failure",
      durableEventId: 12,
    });
    expect(records[1].observation).toContain("no source conclusion");
  });

  it("ignores malformed payloads and duplicate run/turn event projections without inventing findings", () => {
    const records = replayInvestigatorTrajectoryEvents([
      { id: 1, eventType: "tool_observation", payload: "not-json" },
      { id: 2, eventType: "tool_observation", payload: JSON.stringify({ runId: "r", turn: 1, action: "web_search", execution: "success" }) },
      { id: 3, eventType: "tool_observation", payload: JSON.stringify({ runId: "r", turn: 1, action: "visit", execution: "success", observation: "duplicate" }) },
      { id: 4, eventType: "status", payload: JSON.stringify({ runId: "r", turn: 2, action: "done", execution: "success" }) },
      { id: 5, eventType: "decision", payload: JSON.stringify({ runId: "r", turn: 2, action: "done", execution: "success", findings: [] }) },
    ]);

    expect(records).toHaveLength(2);
    expect(records[0].action).toBe("web_search");
    expect(records[0].findings).toEqual([]);
    expect(records[1].action).toBe("done");
  });
});


  it("reassembles retained fetched-page text chunks across Investigator continuations", () => {
    const records = replayInvestigatorTrajectoryEvents([
      {
        id: 21,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-page", turn: 4, action: "visit", execution: "success",
          args: { url: "https://example.com/source" },
          observation: "PAGE https://example.com/source [PAGE TEXT RETAINED FOR READ_PAGE]",
          observedUrls: ["https://example.com/source"], leadUrls: [], findings: [], sourceBindings: [],
          pageContentChunkCount: 2, pageContentChars: 43,
          pageContentTruncated: false, pageContentCharsOmitted: 0,
        }),
      },
      {
        id: 22,
        eventType: "tool_observation",
        payload: JSON.stringify({ runId: "run-page", turn: 4, parentEventId: 21, pageTextChunk: true, chunkIndex: 0, chunkCount: 2, pageContentChunk: "section one\\n" }),
      },
      {
        id: 23,
        eventType: "tool_observation",
        payload: JSON.stringify({ runId: "run-page", turn: 4, parentEventId: 21, pageTextChunk: true, chunkIndex: 1, chunkCount: 2, pageContentChunk: "Jane Example, Managing Director" }),
      },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.pageContent).toContain("Jane Example, Managing Director");
    expect(records[0]?.pageContentCharsOmitted).toBe(0);
  });
