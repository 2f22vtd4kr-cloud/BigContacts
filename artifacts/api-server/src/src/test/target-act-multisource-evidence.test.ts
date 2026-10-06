import { describe, expect, it } from "vitest";
import { buildActEvidenceGraphs } from "../lib/target-act-oversight";

describe("target act multi-source evidence", () => {
  it("grounds a contact value and identity across separate retrieved sources", () => {
    const act = {
      turn: 3, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "multi-source episode", observedUrls: ["https://example.com/team", "https://example.com/contact"],
      findings: [{
        vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder",
        scope: "candidate", sourceUrls: ["https://example.com/team", "https://example.com/contact"],
      }],
      sourceRecords: [
        { turn: 1, action: "visit", execution: "success", observation: "Jane Example — Founder", observedUrls: ["https://example.com/team"], findings: [] },
        { turn: 2, action: "browser_fetch", execution: "success", observation: "Contact: jane@example.com", observedUrls: ["https://example.com/contact"], findings: [] },
      ],
    };
    expect(buildActEvidenceGraphs(1, act, 3, "run-multi-source")).toHaveLength(1);
  });
});
