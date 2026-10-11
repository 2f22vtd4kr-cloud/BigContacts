import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({}));

import { parsePersonFindings } from "../lib/discovery-agent";

describe("investigator decision → durable promotion boundary", () => {
  const source = "https://example.com/team/jane-example";
  const visited = [{ action: "visit", execution: "success", observedUrls: [source] }] as const;

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

  it("binds promotion to the actual final URL observed after a redirect", () => {
    const requestedUrl = "https://example.com/about";
    const redirectedVisit = [{ action: "visit", execution: "success", observedUrls: [source] }] as const;
    const finding = {
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate" as const,
      promotionDecision: "promote" as const,
      promotionReason: "The fetched page directly supports this person's role.",
      sourceUrls: [source],
      note: "Named on the observed team page",
    };

    expect(parsePersonFindings([finding], redirectedVisit)).toEqual([
      expect.objectContaining({ name: "Jane Example", sourceUrls: [source] }),
    ]);
    expect(parsePersonFindings([{ ...finding, sourceUrls: [requestedUrl] }], redirectedVisit)).toEqual([]);
  });

  it("does not accept a failed page fetch as observed source evidence", () => {
    const failedVisit = [{ action: "visit", execution: "error", observedUrls: [source] }] as const;
    expect(parsePersonFindings([{
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      promotionDecision: "promote",
      sourceUrls: [source],
      note: "Named on the page",
    }], failedVisit)).toEqual([]);
  });

  it("rejects promotion when the cited HTTPS page was not actually observed", () => {
    expect(parsePersonFindings([{
      personName: "Jane Example",
      scope: "candidate",
      promotionDecision: "promote",
      sourceUrls: [source],
    }], [{ action: "web_search", execution: "success", observedUrls: [] }] as const)).toEqual([]);
  });
});
