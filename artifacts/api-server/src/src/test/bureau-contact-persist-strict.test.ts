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
