import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { attachDurableFetchedPageArtifacts, replayInvestigatorTrajectoryEvents } from "./durable-trajectory-replay";

describe("immutable Investigator trajectory replay", () => {
  it("verifies complete short-page observation text and its final source URL on durable read-back", () => {
    const sourceUrl = "https://registry.example/team";
    const observation = "PAGE https://registry.example/team\\nThe captured page names Jane Doe as a director.";
    const observationHash = createHash("sha256").update(observation).digest("hex");
    const records = replayInvestigatorTrajectoryEvents([{
      id: 31,
      eventType: "tool_observation",
      payload: JSON.stringify({
        runId: "run-short-page",
        turn: 1,
        action: "visit",
        args: {
          url: sourceUrl,
          pageContentPersistence: "complete_immutable_observation_event",
          pageObservationSha256: observationHash,
          pageArtifactAvailable: false,
          pageArtifactDurable: false,
        },
        execution: "success",
        observation,
        observedUrls: [sourceUrl],
        findings: [],
      }),
    }]);

    expect(records[0]).toMatchObject({
      action: "visit",
      execution: "success",
      observation,
      observedUrls: [sourceUrl],
      args: {
        pageContentPersistence: "complete_immutable_observation_event",
        pageObservationIntegrity: "verified",
      },
      durableEventId: 31,
    });
  });

  it("downgrades a fetched-page observation when its durable text hash or final URL cannot be verified", () => {
    const observation = "The fetched page text must remain source-bound.";
    const records = replayInvestigatorTrajectoryEvents([
      {
        id: 32,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-hash-mismatch", turn: 1, action: "visit",
          args: { url: "https://registry.example/team", pageContentPersistence: "complete_immutable_observation_event", pageObservationSha256: "0".repeat(64) },
          execution: "success", observation, observedUrls: ["https://registry.example/team"], findings: [],
        }),
      },
      {
        id: 33,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-url-missing", turn: 1, action: "visit",
          args: { url: "https://registry.example/team", pageContentPersistence: "complete_immutable_observation_event", pageObservationSha256: createHash("sha256").update(observation).digest("hex") },
          execution: "success", observation, observedUrls: [], findings: [],
        }),
      },
    ]);

    expect(records[0]).toMatchObject({ execution: "partial", args: { pageObservationIntegrity: "hash_mismatch" } });
    expect(records[1]).toMatchObject({ execution: "partial", args: { pageObservationIntegrity: "source_unverified" } });
    expect(records[0]?.observation).toBe(observation);
    expect(records[1]?.observation).toBe(observation);
  });

  it("marks a durable page artifact missing when its immutable chunks cannot be reattached", () => {
    const observation = "A bounded page window is not the complete retained page.";
    const records = replayInvestigatorTrajectoryEvents([{
      id: 34,
      eventType: "tool_observation",
      payload: JSON.stringify({
        runId: "run-artifact-missing",
        turn: 1,
        action: "visit",
        args: {
          url: "https://registry.example/long-page",
          pageContentPersistence: "new_retained_page_artifact",
          pageArtifactAvailable: true,
          pageArtifactDurable: true,
          pageObservationSha256: createHash("sha256").update(observation).digest("hex"),
        },
        execution: "success",
        observation,
        observedUrls: ["https://registry.example/long-page"],
        findings: [],
      }),
    }]);

    attachDurableFetchedPageArtifacts(records, []);
    expect(records[0]).toMatchObject({
      execution: "partial",
      args: {
        pageObservationIntegrity: "verified",
        pageArtifactIntegrity: "missing",
      },
    });
  });

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

  it("verifies a continuation reference against the earlier durable artifact for the same run and source", () => {
    const sourceUrl = "https://registry.example/long-page";
    const initialObservation = "First window of the retained page.";
    const continuationObservation = "Second window of the retained page.";
    const pageText = initialObservation + continuationObservation;
    const pageHash = createHash("sha256").update(pageText).digest("hex");
    const records = replayInvestigatorTrajectoryEvents([
      {
        id: 40,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-reference",
          turn: 1,
          action: "visit",
          args: {
            url: sourceUrl,
            pageContentPersistence: "new_retained_page_artifact",
            pageArtifactDurable: true,
            pageObservationSha256: createHash("sha256").update(initialObservation).digest("hex"),
          },
          execution: "success",
          observation: initialObservation,
          observedUrls: [sourceUrl],
          findings: [],
        }),
      },
      {
        id: 41,
        eventType: "tool_observation",
        payload: JSON.stringify({
          runId: "run-reference",
          turn: 2,
          action: "visit",
          args: {
            url: sourceUrl,
            pageContentPersistence: "retained_page_artifact_reference",
            pageArtifactDurable: true,
            pageObservationSha256: createHash("sha256").update(continuationObservation).digest("hex"),
          },
          execution: "success",
          observation: continuationObservation,
          observedUrls: [sourceUrl],
          findings: [],
        }),
      },
    ]);
    attachDurableFetchedPageArtifacts(records, [{
      id: 42,
      payload: JSON.stringify({
        kind: "fetched_page_artifact_chunk",
        runId: "run-reference",
        turn: 1,
        sourceUrl,
        sha256: pageHash,
        retrievedAt: "2026-11-21T09:00:00.000Z",
        sourceVerified: true,
        chunkIndex: 0,
        chunkCount: 1,
        text: pageText,
      }),
    }]);

    expect(records[0]).toMatchObject({ execution: "success", args: { pageArtifactIntegrity: "verified" } });
    expect(records[1]).toMatchObject({ execution: "success", args: { pageArtifactIntegrity: "verified_reference", pageObservationIntegrity: "verified" } });
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
