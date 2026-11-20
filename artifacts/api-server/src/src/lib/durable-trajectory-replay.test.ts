import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { attachDurableFetchedPageArtifacts, replayInvestigatorTrajectoryEvents } from "./durable-trajectory-replay";

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
      runId: "run-a",
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

  it("keeps equal turn numbers from different durable runs distinct", () => {
    const records = replayInvestigatorTrajectoryEvents([
      { id: 20, eventType: "tool_observation", payload: JSON.stringify({ runId: "run-a", turn: 1, action: "visit", execution: "success", observedUrls: ["https://a.example/"], findings: [] }) },
      { id: 21, eventType: "tool_observation", payload: JSON.stringify({ runId: "run-b", turn: 1, action: "visit", execution: "partial", observedUrls: [], findings: [] }) },
    ]);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.runId)).toEqual(["run-a", "run-b"]);
    expect(records.map((record) => record.execution)).toEqual(["success", "partial"]);
  });

  it("rehydrates page artifacts only onto the matching run and preserves source verification", () => {
    const records = replayInvestigatorTrajectoryEvents([
      { id: 10, eventType: "tool_observation", payload: JSON.stringify({ runId: "run-a", turn: 1, action: "visit", args: { url: "https://a.example/team" }, execution: "success", observedUrls: ["https://a.example/team"], findings: [] }) },
      { id: 11, eventType: "tool_observation", payload: JSON.stringify({ runId: "run-b", turn: 1, action: "browser_fetch", args: { url: "https://b.example/team" }, execution: "partial", observedUrls: [], findings: [] }) },
    ]);
    const verifiedText = "Jane Doe is the managing director of Example A.";
    const unverifiedText = "John Roe is mentioned on Example B.";
    const verifiedHash = createHash("sha256").update(verifiedText).digest("hex");
    const unverifiedHash = createHash("sha256").update(unverifiedText).digest("hex");
    const chunk = (id: number, runId: string, sourceUrl: string, sha256: string, sourceVerified: boolean, chunkIndex: number, chunkCount: number, text: string) => ({
      id,
      payload: JSON.stringify({
        kind: "fetched_page_artifact_chunk", runId, turn: 1, sourceUrl, sha256,
        retrievedAt: "2026-11-19T12:00:00.000Z", sourceVerified, chunkIndex, chunkCount, text,
      }),
    });
    attachDurableFetchedPageArtifacts(records, [
      chunk(20, "run-a", "https://a.example/team", verifiedHash, true, 0, 2, "Jane Doe is the "),
      chunk(21, "run-a", "https://a.example/team", verifiedHash, true, 1, 2, "managing director of Example A."),
      chunk(22, "run-b", "https://b.example/team", unverifiedHash, false, 0, 1, unverifiedText),
    ]);
    expect(records[0].pageArtifact).toMatchObject({
      sourceUrl: "https://a.example/team", text: verifiedText, sourceVerified: true, artifactEventId: 20,
    });
    expect(records[1].pageArtifact).toMatchObject({
      sourceUrl: "https://b.example/team", text: unverifiedText, sourceVerified: false, artifactEventId: 22,
    });
  });

  it("rejects a complete hash-valid page artifact from an unrelated source URL", () => {
    const records = replayInvestigatorTrajectoryEvents([
      { id: 10, eventType: "tool_observation", payload: JSON.stringify({
        runId: "run-a", turn: 1, action: "visit", args: { url: "https://a.example/team" },
        execution: "success", observedUrls: ["https://a.example/team"], findings: [],
      }) },
    ]);
    const unrelatedText = "An unrelated page that shares the run and turn but not the source URL.";
    attachDurableFetchedPageArtifacts(records, [{
      id: 20,
      payload: JSON.stringify({
        kind: "fetched_page_artifact_chunk", runId: "run-a", turn: 1,
        sourceUrl: "https://b.example/team",
        sha256: createHash("sha256").update(unrelatedText).digest("hex"),
        retrievedAt: "2026-11-19T12:00:00.000Z", sourceVerified: true,
        chunkIndex: 0, chunkCount: 1, text: unrelatedText,
      }),
    }]);
    expect(records[0]?.pageArtifact).toBeUndefined();
  });

  it("does not attach incomplete or hash-mismatched fetched-page artifacts", () => {
    const records = replayInvestigatorTrajectoryEvents([
      { id: 10, eventType: "tool_observation", payload: JSON.stringify({ runId: "run-a", turn: 1, action: "visit", execution: "success", observedUrls: ["https://a.example/team"], findings: [] }) },
    ]);
    attachDurableFetchedPageArtifacts(records, [{
      id: 20,
      payload: JSON.stringify({
        kind: "fetched_page_artifact_chunk", runId: "run-a", turn: 1,
        sourceUrl: "https://a.example/team", sha256: "not-the-real-hash",
        retrievedAt: "2026-11-19T12:00:00.000Z", sourceVerified: true,
        chunkIndex: 0, chunkCount: 1, text: "A complete page that must not be trusted.",
      }),
    }]);
    expect(records[0].pageArtifact).toBeUndefined();
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
