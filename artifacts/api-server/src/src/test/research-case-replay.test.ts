import { describe, expect, it } from "vitest";
import { replayResearchCaseEvents } from "../lib/research-case-replay";

describe("research case replay", () => {
  it("rebuilds operator-visible state from immutable event sequence without trusting input order", () => {
    const replay = replayResearchCaseEvents([
      { id: 3, caseId: 9, iteration: 2, actorRole: "head_investigator", eventType: "decision", status: "recorded", summary: "Investigator selected next action", payload: JSON.stringify({ action: "visit" }), createdAt: "2026-09-10T10:02:00Z" },
      { id: 1, caseId: 9, iteration: 0, actorRole: "system", eventType: "case_opened", status: "recorded", summary: "Case opened", payload: "{}", createdAt: "2026-09-10T10:00:00Z" },
      { id: 2, caseId: 9, iteration: 1, actorRole: "head_investigator", eventType: "tool_observation", status: "recorded", summary: "Observed bounded page", payload: JSON.stringify({ url: "https://example.test/a" }), createdAt: "2026-09-10T10:01:00Z" },
    ]);

    expect(replay.valid).toBe(true);
    expect(replay.caseId).toBe(9);
    expect(replay.eventCount).toBe(3);
    expect(replay.observationCount).toBe(1);
    expect(replay.decisionCount).toBe(1);
    expect(replay.latestDecision).toEqual({ action: "visit" });
    expect(replay.latestObservation).toEqual({ url: "https://example.test/a" });
    expect(replay.lastEventId).toBe(3);
  });

  it("accepts canonical Gemini control decisions and deterministic bureau events", () => {
    const replay = replayResearchCaseEvents([
      { id: 1, caseId: 21, iteration: 0, actorRole: "bureau", eventType: "observation", status: "recorded", summary: "Shared target context persisted", payload: JSON.stringify({ context: "case-state" }), createdAt: "2026-09-11T00:00:00Z" },
      { id: 2, caseId: 21, iteration: 1, actorRole: "gemini_boss", eventType: "control_decision", status: "recorded", summary: "Target control decision: continue_target", payload: JSON.stringify({ action: "continue_target", direction: "Verify the operating-company relationship." }), createdAt: "2026-09-11T00:00:01Z" },
      { id: 3, caseId: 21, iteration: 2, actorRole: "head_investigator", eventType: "tool_observation", status: "success", summary: "Investigator turn 2: visit; execution=success.", payload: JSON.stringify({ turn: 2, action: "visit", observedUrls: ["https://example.test/team"] }), createdAt: "2026-09-11T00:00:02Z" },
    ]);

    expect(replay.valid).toBe(true);
    expect(replay.decisionCount).toBe(1);
    expect(replay.observationCount).toBe(2);
    expect(replay.latestDecision).toMatchObject({ action: "continue_target" });
  });

  it("uses database sequence rather than wall-clock time as the canonical order", () => {
    const replay = replayResearchCaseEvents([
      { id: 2, caseId: 12, iteration: 1, actorRole: "specialist", eventType: "observation", status: "recorded", summary: "Later sequence observation", payload: JSON.stringify({ step: 2 }), createdAt: "2026-09-10T09:59:00Z" },
      { id: 1, caseId: 12, iteration: 0, actorRole: "system", eventType: "case_opened", status: "recorded", summary: "Earlier sequence event", payload: "{}", createdAt: "2026-09-10T10:00:00Z" },
    ]);

    expect(replay.valid).toBe(true);
    expect(replay.firstEventId).toBe(1);
    expect(replay.lastEventId).toBe(2);
    expect(replay.lastEventType).toBe("observation");
    expect(replay.lastIteration).toBe(1);
  });

  it("fails closed on malformed payloads and cross-case events", () => {
    const replay = replayResearchCaseEvents([
      { id: 1, caseId: 4, iteration: 0, actorRole: "system", eventType: "case_opened", status: "recorded", summary: "Case opened", payload: "{}", createdAt: "2026-09-10T10:00:00Z" },
      { id: 2, caseId: 5, iteration: 1, actorRole: "system", eventType: "observation", status: "recorded", summary: "Observation", payload: "not-json", createdAt: "2026-09-10T10:01:00Z" },
    ]);

    expect(replay.valid).toBe(false);
    expect(replay.violations.some((v) => v.includes("caseId"))).toBe(true);
    expect(replay.violations.some((v) => v.includes("valid JSON"))).toBe(true);
  });

  it("fails closed on unknown actor roles and event types", () => {
    const replay = replayResearchCaseEvents([
      { id: 1, caseId: 8, iteration: 0, actorRole: "unknown_actor", eventType: "case_opened", status: "recorded", summary: "Case opened", payload: "{}", createdAt: "2026-09-10T10:00:00Z" },
      { id: 2, caseId: 8, iteration: 1, actorRole: "system", eventType: "secret_research_phase", status: "recorded", summary: "Unexpected event", payload: "{}", createdAt: "2026-09-10T10:01:00Z" },
    ]);

    expect(replay.valid).toBe(false);
    expect(replay.violations.some((v) => v.includes("unknown actorRole"))).toBe(true);
    expect(replay.violations.some((v) => v.includes("unknown eventType"))).toBe(true);
  });
});
