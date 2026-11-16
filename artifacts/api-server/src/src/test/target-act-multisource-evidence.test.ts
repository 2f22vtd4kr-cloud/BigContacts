import { describe, expect, it } from "vitest";
import { buildActEvidenceGraphs } from "../lib/target-act-oversight";

describe("target act multi-source evidence", () => {
  it("rejects a person-contact support graph when identity and contact exist only on separate pages", () => {
    const act = {
      turn: 3, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "multi-source episode", observedUrls: ["https://example.com/team", "https://example.com/contact"],
      findings: [{
        vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder",
        scope: "candidate", contactAttribution: "professional_person_specific", exactQuote: "Jane Example — Founder — jane@example.com", identityAssessment: "same_person", identityRationale: "The team page explicitly binds Jane Example to the exact professional email.", sourceUrls: ["https://example.com/team", "https://example.com/contact"],
      }],
      sourceRecords: [
        { turn: 1, action: "visit", execution: "success", observation: "Jane Example — Founder", observedUrls: ["https://example.com/team"], findings: [] },
        { turn: 2, action: "browser_fetch", execution: "success", observation: "Contact: jane@example.com", observedUrls: ["https://example.com/contact"], findings: [] },
      ],
    };
    expect(buildActEvidenceGraphs(1, act, 3, "run-split-page", new Map())).toHaveLength(0);
  });

  it("anchors a multi-URL candidate support graph only to a source that co-binds identity and contact", () => {
    const act = {
      turn: 4, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "multi-source episode", observedUrls: ["https://example.com/team", "https://example.com/contact"],
      findings: [{
        vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder",
        scope: "candidate", contactAttribution: "professional_person_specific", exactQuote: "Jane Example — Founder — jane@example.com", identityAssessment: "same_person", identityRationale: "The official team page explicitly binds Jane Example to the exact professional email.", sourceUrls: ["https://example.com/team", "https://example.com/contact"],
      }],
      sourceRecords: [
        { turn: 1, action: "visit", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["https://example.com/team"], findings: [] },
        { turn: 2, action: "browser_fetch", execution: "success", observation: "Jane Example — Founder", observedUrls: ["https://example.com/contact"], findings: [] },
      ],
    };
    const graphs = buildActEvidenceGraphs(1, act, 4, "run-co-bound-source", new Map([[1, 41], [2, 42]]));
    expect(graphs).toHaveLength(1);
    expect(graphs[0]?.observations.map((observation) => observation.sourceUrl))
      .toEqual(["https://example.com/team"]);
    expect(graphs[0]?.observations.every((observation) => observation.eventId === 41)).toBe(true);
  });

});
