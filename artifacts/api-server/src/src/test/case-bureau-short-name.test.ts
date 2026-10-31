import { describe, expect, it } from "vitest";
import { parseBossDiscoveryResponse } from "../lib/case-bureau";

describe("Boss discovery short identifiers", () => {
  it("accepts legitimate short person and organization names without a length heuristic", () => {
    const parsed = parseBossDiscoveryResponse(JSON.stringify({
      report: "The objective supports investigating these two public subjects.",
      investigatorLlm: "groq-investigator-20b",
      candidates: [
        { name: "Li", type: "person", relevance: "A source identifies a relevant person.", reachability: "A public professional route may exist.", sourceUrls: ["https://example.org/person"], contactEvidence: [] },
        { name: "3M", type: "organization", relevance: "The company is the direct target.", reachability: "Its public corporate site is available.", sourceUrls: ["https://example.org/company"], contactEvidence: [] },
      ],
      nextDirections: ["Verify the person and company independently."],
      uncertainties: [],
    }), ["groq-investigator-20b"]);

    expect(parsed.candidates.map((candidate) => candidate.name)).toEqual(["Li", "3M"]);
    expect(parsed.candidates.map((candidate) => candidate.type)).toEqual(["person", "organization"]);
  });
});
