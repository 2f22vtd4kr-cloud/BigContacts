import { describe, expect, it } from "vitest";
import { sourceBackedBureauContacts } from "../lib/bureau-contact-persist-strict";

describe("strict bureau contact persistence boundary", () => {
  it("drops findings with no source URL", () => {
    expect(sourceBackedBureauContacts([
      { vectorType: "email", value: "jane@example.com", scope: "candidate", sourceUrls: [] },
    ])).toEqual([]);
  });

  it("drops synthetic search and registry-query URLs", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: [
          "https://www.google.com/search?q=%22Jane%20Example%22%20jane%40example.com",
          "https://efts.sec.gov/LATEST/search-index?q=%22Example%20Co%22&forms=SC%2013D",
        ],
      },
    ])).toEqual([]);
  });

  it("keeps an actual claim page and strips only non-claim URLs", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: [
          "https://www.google.com/search?q=Jane",
          "https://example.com/team/jane",
        ],
      },
    ])).toEqual([
      expect.objectContaining({
        sourceUrls: ["https://example.com/team/jane"],
      }),
    ]);
  });
});


describe("Batch 44 provenance regressions", () => {
  it("rejects a generated Google query even when another field looks agentic", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "phone",
        value: "+1 555 0100",
        scope: "candidate",
        note: "bureau-agentic",
        sourceUrls: ["https://www.google.com/search?q=Jane%20Example%20%2B1%20555%200100"],
      },
    ])).toEqual([]);
  });

  it("requires a real claim page, not merely an HTTPS URL", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: ["https://bing.com/search?q=jane%40example.com"],
      },
    ])).toEqual([]);
  });
});
