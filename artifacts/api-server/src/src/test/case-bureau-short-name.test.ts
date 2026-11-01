import { describe, expect, it } from "vitest";
import { parseBossDiscoveryResponse } from "../lib/case-bureau";

describe("Boss opening assignment contract", () => {
  it("accepts a configured Investigator capability without parsing any short or long target identity", () => {
    const parsed = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: "groq-investigator-20b",
    }), ["groq-investigator-20b"]);

    expect(parsed.investigatorLlm).toBe("groq-investigator-20b");
    expect(parsed.report).toContain("No source observations exist yet");
    expect(parsed.candidates).toEqual([]);
    expect(parsed.nextDirections).toEqual([]);
    expect(parsed.uncertainties).toEqual([]);
  });

  it("rejects model-supplied person/company names and source URLs regardless of name length", () => {
    const parsed = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: "groq-investigator-20b",
      candidates: [
        { name: "Li", type: "person", sourceUrls: ["https://example.org/person"], contactEvidence: [] },
        { name: "3M", type: "organization", sourceUrls: ["https://example.org/company"], contactEvidence: [] },
      ],
    }), ["groq-investigator-20b"]);

    expect(parsed.investigatorLlm).toBeNull();
    expect(parsed.candidates).toEqual([]);
    expect(parsed.report).toBe("");
  });
});
