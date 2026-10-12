import { describe, expect, it } from "vitest";
import type { AgenticTrajectoryRecord } from "../lib/agentic-web-research-core";
import { ResearchIntelligenceEngine } from "../lib/research-intelligence-engine";
import { investigatorRecordsFromEvents, replayInvestigatorIntelligence } from "../lib/research-intelligence-replay";

describe("durable Investigator intelligence replay", () => {
  it("reconstructs evidence beyond the compact last-24-item snapshot from immutable act events", () => {
    const events = Array.from({ length: 30 }, (_, index) => {
      const value = `Fact ${index + 1}`;
      const url = `https://source-${index + 1}.example.test/profile`;
      return {
        id: index + 1, actorRole: "head_investigator", eventType: "tool_observation", status: "success",
        payload: JSON.stringify({
          turn: index + 1, model: "test-model", action: "visit", args: { purpose: `verify ${value}` },
          execution: "success", observation: `Alex Example is associated with ${value}.`, observedUrls: [url],
          findings: [{ vectorType: "other", value, personName: "Alex Example", role: null, scope: "candidate", sourceUrls: [url], note: "Observed in public source." }],
        }),
      };
    });
    const records = investigatorRecordsFromEvents(events);
    expect(records.map((record) => record.durableEventId)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    const engine = new ResearchIntelligenceEngine({ executionId: "event-replay", target: "Alex Example", objective: "verify public facts" });
    replayInvestigatorIntelligence(engine, records);
    const state = engine.buildContext();
    expect(records).toHaveLength(30);
    expect(state.evidenceCount).toBe(30);
    expect(state.facts.length).toBe(30);
    expect(state.atomicEvidence).toHaveLength(24);
  });

  it("replays pivot scope identity and unvisited lead URLs from durable events", () => {
    const scopeKey = "explore mid-market fitness franchise owners in texas";
    const leadUrl = "https://registry.example.test/company/fitnation";
    const records = investigatorRecordsFromEvents([{
      id: 42, actorRole: "head_investigator", eventType: "tool_observation", status: "success",
      payload: JSON.stringify({
        action: "registry_search", execution: "success", observation: "Registry lead: FitNation; record is unvisited.",
        args: { query: "fitness franchise owners Texas", registry: "companies-house" },
        pivotScopeKey: scopeKey, leadUrls: [leadUrl, leadUrl], observedUrls: [], findings: [],
      }),
    }]);
    expect(records).toHaveLength(1);
    expect(records[0]?.pivotScopeKey).toBe(scopeKey);
    expect(records[0]?.leadUrls).toEqual([leadUrl]);
  });
  it("retains split identity/contact observations as review-only evidence during replay", () => {
    const identityUrl = "https://example.test/team", contactUrl = "https://example.test/contact";
    const records: AgenticTrajectoryRecord[] = [
      { turn: 1, model: "test", action: "visit", args: {}, execution: "success", observation: "Alex Example is a director at Example Labs.", observedUrls: [identityUrl], findings: [] },
      { turn: 2, model: "test", action: "visit", args: {}, execution: "success", observation: "Public contact: alex@example.test", observedUrls: [contactUrl], findings: [{
        vectorType: "email", value: "alex@example.test", personName: "Alex Example", role: "director", scope: "candidate",
        sourceUrls: [identityUrl, contactUrl], note: "Identity and contact are suggested across two observed pages.",
      }] },
    ];
    const engine = new ResearchIntelligenceEngine({ executionId: "cross-page-replay", target: "Alex Example", objective: "verify public contact" });
    replayInvestigatorIntelligence(engine, records);
    const state = engine.buildContext();
    const identity = state.atomicEvidence.find((item) => item.sourceUrl === identityUrl && item.spanBindingKind === "identity");
    const value = state.atomicEvidence.find((item) => item.sourceUrl === contactUrl && item.spanBindingKind === "value");
    expect(identity?.kind).toBe("observation");
    expect(identity?.claim).not.toContain("alex@example.test");
    expect(value?.kind).toBe("observation");
    expect(value?.claim).not.toContain("Alex Example email");
    expect(state.facts.some((fact) => fact.claim === "Alex Example email alex@example.test")).toBe(false);
    expect(state.contacts).toContainEqual(expect.objectContaining({ personName: "Alex Example", value: "alex@example.test", state: "DISCOVERED", sourceUrls: expect.arrayContaining([identityUrl, contactUrl]) }));
  });

  it("refuses partial replay when a selected durable Investigator event has a valid JSON payload without an action", () => {
    const events = [
      {
        id: 1, actorRole: "head_investigator", eventType: "tool_observation", status: "success",
        payload: JSON.stringify({ action: "visit", execution: "success", observation: "first observed page", observedUrls: ["https://one.example.test/"], findings: [] }),
      },
      {
        id: 2, actorRole: "head_investigator", eventType: "tool_observation", status: "success",
        payload: JSON.stringify({ execution: "success", observation: "corrupt but valid JSON event" }),
      },
      {
        id: 3, actorRole: "head_investigator", eventType: "tool_observation", status: "success",
        payload: JSON.stringify({ action: "visit", execution: "success", observation: "later observed page", observedUrls: ["https://three.example.test/"], findings: [] }),
      },
    ];

    expect(() => investigatorRecordsFromEvents(events)).toThrow(
      "Durable Investigator event 2 has an invalid payload/action; refusing partial evidence replay.",
    );
  });

  it("ignores search snippets and non-Investigator events", () => {
    const records = investigatorRecordsFromEvents([
      { id: 1, actorRole: "head_investigator", eventType: "tool_observation", status: "success", payload: JSON.stringify({ action: "web_search", execution: "success", observation: "Alex Example email alex@example.test", observedUrls: ["https://search.example.test"], findings: [] }) },
      { id: 2, actorRole: "groq_boss", eventType: "tool_observation", status: "success", payload: JSON.stringify({ action: "visit", execution: "success", observation: "not an Investigator act" }) },
    ]);
    const engine = new ResearchIntelligenceEngine({ executionId: "no-search-promotion", target: "Alex Example", objective: "verify contact" });
    replayInvestigatorIntelligence(engine, records);
    expect(engine.buildContext().evidenceCount).toBe(0);
    expect(engine.buildContext().atomicEvidence).toHaveLength(0);
  });
});
