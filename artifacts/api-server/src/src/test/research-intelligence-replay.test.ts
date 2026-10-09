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

  it("binds multi-source findings to each page's own observed text during replay", () => {
    const identityUrl = "https://example.test/team", contactUrl = "https://example.test/contact";
    const records: AgenticTrajectoryRecord[] = [
      { turn: 1, model: "test", action: "visit", args: {}, execution: "success", observation: "Alex Example is a director at Example Labs.", observedUrls: [identityUrl], findings: [] },
      { turn: 2, model: "test", action: "visit", args: {}, execution: "success", observation: "Public contact: alex@example.test", observedUrls: [contactUrl], findings: [{
        vectorType: "email", value: "alex@example.test", personName: "Alex Example", role: "director", scope: "candidate",
        sourceUrls: [identityUrl, contactUrl], note: "Identity and contact are attributed across two observed pages.",
      }] },
    ];
    const engine = new ResearchIntelligenceEngine({ executionId: "cross-page-replay", target: "Alex Example", objective: "verify public contact" });
    replayInvestigatorIntelligence(engine, records);
    const claims = engine.buildContext().atomicEvidence.filter((item) => item.kind === "finding" && item.claim.includes("alex@example.test"));
    expect(claims.map((item) => item.sourceUrl).sort()).toEqual([contactUrl, identityUrl]);
    expect(claims.find((item) => item.sourceUrl === identityUrl)?.spanBindingKind).toBe("identity");
    expect(claims.find((item) => item.sourceUrl === contactUrl)?.spanBindingKind).toBe("value");
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
