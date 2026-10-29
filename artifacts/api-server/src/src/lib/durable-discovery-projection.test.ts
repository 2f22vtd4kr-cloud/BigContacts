import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildStepPrompt, type AgenticTrajectoryRecord } from "./agentic-web-research-core";
import {
  buildDurableUrlInventoryFromEventPayloads,
  compactDurableDiscoveryRecords,
  extractSearchResultSnippetForLead,
  hasDurableUrlProjectionOmissions,
  mergeSourceCardTrajectoryRecords,
  rehydrateDurableDiscoveryTrajectoryRecords,
} from "./durable-discovery-projection";

const bureauAgenticPassSource = readFileSync(resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");

function recordWithUrl(url: string): AgenticTrajectoryRecord {
  return {
    turn: 1,
    model: "test-model",
    action: "visit",
    args: { url },
    execution: "success",
    observation: "Observed source page text for an organization.",
    observedUrls: [url],
    leadUrls: [url],
    findings: [{
      vectorType: "other",
      value: "Example Organization",
      personName: null,
      role: null,
      scope: "organization",
      sourceUrls: [url],
      note: "Review-only source-backed organization lead.",
    }],
    sourceBindings: [{
      findingValue: "Example Organization",
      sourceUrl: url,
      sourceTurn: 1,
      spanStart: 0,
      spanEnd: 22,
      pageNumber: null,
    }],
  };
}

describe("durable Investigator trajectory rehydration", () => {
  it("restores append-only history across continuations, normalizes reset turns, and preserves source bindings", () => {
    const event = (id: number, runId: string, turn: number, action: string, sourceBindings: unknown[] = []) => ({
      id,
      iteration: id,
      actorRole: "head_investigator",
      eventType: "tool_observation",
      status: "success",
      payload: JSON.stringify({
        jobId: "job-" + runId,
        runId,
        runModel: "test-model",
        turn,
        action,
        args: action.includes("search") ? { query: "public organization evidence" } : { url: "https://registry.example.test/record/" + id },
        thought: null,
        pivotScopeKey: "scope-a",
        leadUrls: ["https://registry.example.test/record/" + id],
        execution: "success",
        observation: "Observed record " + id,
        observedUrls: ["https://registry.example.test/record/" + id],
        findings: [],
        sourceBindings,
        providerFallback: [],
        stopReason: null,
      }),
    });
    const binding = (sourceTurn: number) => ({
      findingValue: "Example Organization",
      sourceUrl: "https://registry.example.test/record/1",
      sourceTurn,
      spanStart: 0,
      spanEnd: 19,
      pageNumber: null,
    });
    const rows = [
      event(1, "run-a", 1, "web_search"),
      event(2, "run-a", 2, "visit", [binding(1)]),
      event(3, "run-b", 1, "web_search"),
      event(4, "run-b", 2, "visit", [binding(1)]),
      event(5, "run-c", 3, "visit", [binding(2)]),
      {
        id: 6,
        iteration: 6,
        actorRole: "specialist",
        eventType: "tool_observation",
        status: "success",
        payload: JSON.stringify({ action: "visit", execution: "success", turn: 6 }),
      },
      {
        id: 7,
        iteration: 7,
        actorRole: "head_investigator",
        eventType: "claim",
        status: "recorded",
        payload: JSON.stringify({ action: "claim", execution: "success", turn: 7 }),
      },
    ];

    const records = rehydrateDurableDiscoveryTrajectoryRecords([...rows].reverse());

    expect(records.map((record) => record.turn)).toEqual([1, 2, 3, 4, 5]);
    expect(records.map((record) => record.durableEventId)).toEqual([1, 2, 3, 4, 5]);
    expect(records[1]?.sourceBindings?.[0]?.sourceTurn).toBe(1);
    // The same-run legacy turn 1 was normalized from 1 to 3.
    expect(records[3]?.sourceBindings?.[0]?.sourceTurn).toBe(3);
    // Newer runs already use globally offset turns for cross-run bindings.
    expect(records[4]?.sourceBindings?.[0]?.sourceTurn).toBe(2);
    expect(records[0]).toMatchObject({
      action: "web_search",
      model: "test-model",
      execution: "success",
      args: { query: "public organization evidence" },
      observedUrls: ["https://registry.example.test/record/1"],
    });
  });

  it("fails closed when a durable Investigator event cannot be restored", () => {
    expect(() => rehydrateDurableDiscoveryTrajectoryRecords([{
      id: 42,
      iteration: 42,
      actorRole: "head_investigator",
      eventType: "tool_observation",
      status: "success",
      payload: "{not valid json",
    }])).toThrow("event 42: payload is not valid JSON");
  });

  it("wires event-ledger rehydration into standalone discovery continuations, not only in-memory episodes", () => {
    expect(bureauAgenticPassSource).toContain("loadDurableDiscoveryTrajectoryRecords(durableCaseId)");
    expect(bureauAgenticPassSource).toContain("priorTrajectoryRecords:effectivePriorTrajectoryRecords");
    expect(bureauAgenticPassSource).toContain('inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision", "provider_error"])');
  });
});

describe("durable discovery projection URL integrity", () => {
  it("keeps sticky URL omission state after its original trajectory record rolls out", () => {
    expect(hasDurableUrlProjectionOmissions(true, [])).toBe(true);
    expect(hasDurableUrlProjectionOmissions(false, [{
      durableProjectionOmissions: { leadUrls: 1, reason: "whole URL omitted from bounded projection" },
    }])).toBe(true);
    expect(hasDurableUrlProjectionOmissions(false, [{
      durableProjectionOmissions: { leadUrls: 0, reason: "nothing omitted" },
    }])).toBe(false);
    expect(hasDurableUrlProjectionOmissions(false, [])).toBe(false);
  });

  it("rehydrates an over-budget source URL from immutable events into a resumed Investigator prompt", () => {
    const longUrl = "https://registry.example.org/acquisitions/" + "a".repeat(435) + "?record=ACQ-2026-0198.pdf";
    expect(longUrl.length).toBeGreaterThan(500);
    expect(longUrl.length).toBeLessThanOrEqual(512);

    const [projected] = compactDurableDiscoveryRecords([recordWithUrl(longUrl)]);
    expect(projected.leadUrls).toEqual([]);
    expect(projected.durableProjectionOmissions?.leadUrls).toBe(1);

    const immutableEventPayload = JSON.stringify({
      action: "visit",
      execution: "success",
      args: { url: longUrl },
      leadUrls: [longUrl],
      observedUrls: [longUrl],
      findings: [{ sourceUrls: [longUrl] }],
    });
    const inventory = buildDurableUrlInventoryFromEventPayloads([immutableEventPayload]);

    expect(inventory.urls).toEqual([longUrl]);
    expect(inventory.text.split("\n")).toContain("- " + longUrl);
    expect(inventory.text).not.toContain(longUrl.slice(0, 500) + "…");

    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Research public acquisition records within the accepted scope.",
      history: [],
      trajectoryRecords: [],
      lastObservation: "An earlier search found a potential acquisition source.",
      findings: [],
      // Match production: only the dedicated inventory input is trusted as an exact route list.
      priorContext: "Previously compacted case context; no authoritative route is embedded here.",
      durableUrlInventory: inventory.text,
      mode: "discovery",
    });
    expect(prompt).toContain(longUrl);
    expect(prompt).not.toContain(longUrl.slice(0, 500) + "…");

    // The production resume path appends this exact bounded inventory only when
    // the case-file projection has recorded an omitted URL.
    expect(bureauAgenticPassSource).toContain("if (!hasUrlOmissions) return { document };");
    expect(bureauAgenticPassSource).toContain("hasDurableUrlProjectionOmissions,");
    expect(bureauAgenticPassSource).toContain("hasDurableUrlProjectionOmissionsHelper(");
    expect(bureauAgenticPassSource).toContain("parsed.hasDurableUrlProjectionOmissions,");
    expect(bureauAgenticPassSource).toContain("buildDurableUrlInventoryFromEventPayloads(payloadRows.map((entry) => entry.payload), {");
  });
  it("rehydrates only exact-scope URLs after an accepted pivot and excludes legacy unscoped events", () => {
    const activeScopeKey = "purchase majority shares in sample manufacturing";
    const activeUrl = "https://registry.example.org/current-pivot";
    const olderScopeUrl = "https://registry.example.org/previous-pivot";
    const legacyUrl = "https://registry.example.org/unscoped-legacy";
    const inventory = buildDurableUrlInventoryFromEventPayloads([
      JSON.stringify({ pivotScopeKey: activeScopeKey, leadUrls: [activeUrl] }),
      JSON.stringify({ pivotScopeKey: "research unrelated jurisdiction", leadUrls: [olderScopeUrl] }),
      JSON.stringify({ leadUrls: [legacyUrl] }),
    ], { activeScopeKey, requireExactScope: true });

    expect(inventory.urls).toEqual([activeUrl]);
    expect(inventory.text).toContain(activeUrl);
    expect(inventory.text).not.toContain(olderScopeUrl);
    expect(inventory.text).not.toContain(legacyUrl);
  });

  it("passes the active accepted scope into resumed discovery URL rehydration", () => {
    expect(bureauAgenticPassSource).toContain(
      'const activeScopeKey = mode === "discovery" ? discoveryPivotScopeKey(objective) : null;',
    );
    expect(bureauAgenticPassSource).toContain(
      'requireExactScope: mode === "discovery" && activeScopeKey !== null,',
    );
    expect(bureauAgenticPassSource).toContain(
      "payloadRows.map((entry) => entry.payload), {",
    );
  });

  it("rehydrates the immutable URL inventory after the last-64 trajectory projection evicts older records", () => {
    // The projection's size limit can drop an otherwise complete older source.
    // The durable case flag must stay true so resume never mistakes that eviction
    // for a complete working set and skips ledger rehydration.
    expect(bureauAgenticPassSource).toContain(
      "accumulatedRecords.length > durableProjectionRecords.length",
    );
    expect(bureauAgenticPassSource).toContain(
      "current.hasDurableUrlProjectionOmissions === true",
    );
    expect(bureauAgenticPassSource).toContain(
      "if (!hasUrlOmissions) return { document };",
    );
  });

  it("omits over-budget URLs atomically and records the omission instead of persisting a truncated URL", () => {
    const longUrl = `https://registry.example.org/acquisitions/${"transaction-segment/".repeat(35)}?record=ACQ-2026-0198.pdf&view=full`;
    expect(longUrl.length).toBeGreaterThan(500);

    const [projected] = compactDurableDiscoveryRecords([recordWithUrl(longUrl)]);

    expect(projected.args.url).toMatch(/^\[URL omitted from bounded case-file projection/);
    expect(projected.leadUrls).toEqual([]);
    expect(projected.observedUrls).toEqual([]);
    expect(projected.findings[0]?.sourceUrls).toEqual([]);
    expect(projected.sourceBindings).toEqual([]);
    expect(projected.durableProjectionOmissions).toMatchObject({
      argumentUrls: 1,
      leadUrls: 1,
      observedUrls: 1,
      findingSourceUrls: 1,
      sourceBindingUrls: 1,
    });
    expect(JSON.stringify(projected)).not.toContain(longUrl.slice(0, 500));

    // Re-compaction must retain the explicit omission status without counting
    // the same missing value repeatedly or progressively truncating its marker.
    const [recompacted] = compactDurableDiscoveryRecords([projected]);
    expect(recompacted.args.url).toBe(projected.args.url);
    expect(recompacted.durableProjectionOmissions?.argumentUrls).toBe(1);
    expect(recompacted.durableProjectionOmissions?.leadUrls).toBe(1);
  });

  it("preserves a URL that fits the projection budget as one complete value", () => {
    const url = "https://registry.example.org/company/123?source=filing&year=2026";
    const [projected] = compactDurableDiscoveryRecords([recordWithUrl(url)]);

    expect(projected.args.url).toBe(url);
    expect(projected.leadUrls).toEqual([url]);
    expect(projected.observedUrls).toEqual([url]);
    expect(projected.findings[0]?.sourceUrls).toEqual([url]);
    expect(projected.sourceBindings?.[0]?.sourceUrl).toBe(url);
    expect(projected.durableProjectionOmissions).toBeUndefined();
  });

  it("omits already-redacted signed URLs instead of treating them as authoritative routes", () => {
    const redactedUrl = "https://registry.example.org/record?X-Amz-Signature=%5BREDACTED%5D&view=full";
    const [projected] = compactDurableDiscoveryRecords([recordWithUrl(redactedUrl)]);

    expect(projected.args.url).toMatch(/^\[URL omitted from bounded case-file projection/);
    expect(projected.observedUrls).toEqual([]);
    expect(projected.leadUrls).toEqual([]);
    expect(projected.findings[0]?.sourceUrls).toEqual([]);
    expect(projected.sourceBindings).toEqual([]);
    expect(projected.durableProjectionOmissions).toMatchObject({
      argumentUrls: 1,
      observedUrls: 1,
      leadUrls: 1,
      findingSourceUrls: 1,
      sourceBindingUrls: 1,
    });
    expect(JSON.stringify(projected)).not.toContain("X-Amz-Signature=%5BREDACTED%5D");
  });

  it("prefers the complete immutable event over an old truncated projection", () => {
    const originalUrl = `https://registry.example.org/acquisitions/${"document-segment/".repeat(40)}?record=ACQ-2026-0198.pdf`;
    const legacyPrefix = originalUrl.slice(0, 500);
    const projection = [{ turn: 7, action: "visit", args: { url: legacyPrefix }, execution: "success" }];
    const durable = [{ turn: 7, action: "visit", args: { url: originalUrl }, execution: "success" }];

    const merged = mergeSourceCardTrajectoryRecords(projection, durable);

    expect(merged).toHaveLength(1);
    expect((merged[0].args as Record<string, unknown>).url).toBe(originalUrl);
  });

  it("does not cut through a URL embedded in an overlong argument string", () => {
    const longUrl = `https://registry.example.org/acquisitions/${"document-segment/".repeat(40)}?id=full-record`;
    const base = recordWithUrl("https://registry.example.org/company/123");
    base.args = { query: "research terms ".repeat(50) + longUrl + " trailing context" };

    const [projected] = compactDurableDiscoveryRecords([base]);

    expect(String(projected.args.query)).toContain("[URL omitted from bounded case-file projection");
    expect(String(projected.args.query)).not.toContain(longUrl);
    expect(projected.durableProjectionOmissions?.argumentTextsWithUrls).toBe(1);
    expect(projected.durableProjectionOmissions?.textUrls).toBe(1);
  });

  it("prioritizes URL fields and reports URLs omitted beyond the projection argument cap", () => {
    const base = recordWithUrl("https://registry.example.org/company/123");
    const args: Record<string, unknown> = {};
    for (let index = 0; index < 30; index += 1) args["optional" + index] = "low-priority-value";
    for (let index = 0; index < 26; index += 1) {
      args["source" + index + "Url"] = "https://registry.example.org/source/" + index;
    }
    base.args = args;

    const [projected] = compactDurableDiscoveryRecords([base]);

    expect(Object.keys(projected.args)).toHaveLength(24);
    expect(projected.args.source0Url).toBe("https://registry.example.org/source/0");
    expect(projected.args.source23Url).toBe("https://registry.example.org/source/23");
    expect(projected.args.optional0).toBeUndefined();
    expect(projected.durableProjectionOmissions?.argumentUrls).toBe(2);
  });

  it("retains the matching search snippet as explicitly unverified context and redacts contact data", () => {
    const url = "https://registry.example.org/acquisitions/record-17";
    const observation = [
      "WEB_SEARCH provider=serper",
      "https://registry.example.org/acquisitions/record-17",
      "",
      "Example Acquisition Notice",
      "URL: https://registry.example.org/acquisitions/record-17#details",
      "The filing names Example Holdings as buyer. Contact person@example.org at +1 (415) 555-0100.",
      "Next Result Title",
      "URL: https://registry.example.org/other-record",
      "This belongs to a different result and must not leak into the first snippet.",
      "INVESTIGATOR QUERY GUIDANCE: continue with the best lead.",
    ].join("\n");

    expect(extractSearchResultSnippetForLead(observation, url)).toBe(
      "The filing names Example Holdings as buyer. Contact [public email omitted] at [phone omitted].",
    );
    expect(extractSearchResultSnippetForLead(observation, "https://registry.example.org/missing")).toBeNull();
    expect(extractSearchResultSnippetForLead(observation, "https://registry.example.org/acquisitions/record-17", 10)?.length).toBeLessThanOrEqual(10);
  });

});
