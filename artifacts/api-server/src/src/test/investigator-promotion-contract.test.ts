import { describe, expect, it } from "vitest";
import { parsePersonFindings } from "../lib/discovery-agent";

describe("investigator decision → durable promotion boundary", () => {
  const source = "https://example.com/team/jane-example";
  const visited = [`step1: visit ${source}`];

  it("rejects a source-backed person when promotionDecision is absent", () => {
    expect(parsePersonFindings([{
      personName: "Jane Example",
      scope: "candidate",
      sourceUrls: [source],
      note: "named on team page",
    }], visited)).toEqual([]);
  });

  it("rejects a source-backed person when the investigator explicitly rejects promotion", () => {
    expect(parsePersonFindings([{
      personName: "Jane Example",
      scope: "candidate",
      promotionDecision: "reject",
      sourceUrls: [source],
      note: "not useful for outreach",
    }], visited)).toEqual([]);
  });

  it("accepts only an explicit investigator promote decision with observed HTTPS provenance", () => {
    expect(parsePersonFindings([{
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      promotionDecision: "promote",
      promotionReason: "strong public operating-company and outreach surface",
      sourceUrls: [source],
      note: "named on team page",
    }], visited)).toEqual([
      expect.objectContaining({
        name: "Jane Example",
        role: "Founder",
        promotionDecision: "promote",
        promotionReason: "strong public operating-company and outreach surface",
      }),
    ]);
  });

  it("rejects promotion when the cited HTTPS page was not actually observed", () => {
    expect(parsePersonFindings([{
      personName: "Jane Example",
      scope: "candidate",
      promotionDecision: "promote",
      sourceUrls: [source],
    }], ["step1: web_search Jane Example"])).toEqual([]);
  });
});
