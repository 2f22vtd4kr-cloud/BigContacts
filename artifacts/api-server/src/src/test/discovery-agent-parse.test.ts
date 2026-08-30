import { describe, it, expect } from "vitest";
import { isWellFormedPersonCandidate } from "../lib/discovery-agent";

describe("discovery agent identity boundary", () => {
  const source = ["https://example.com/about"];

  it("accepts a normal source-backed person-shaped identity", () => {
    expect(isWellFormedPersonCandidate({ name: "Jane Example", sourceUrls: source })).toBe(true);
  });

  it.each([
    "com EMAIL",
    "President PERSON",
    "Operational Enablement",
    "Product Comparisons Sage Products",
    "security issues",
    "Chief Executive Officer",
    "Private Equity",
    "Forbes Billionaires",
  ])("rejects historical malformed candidate: %s", (name) => {
    expect(isWellFormedPersonCandidate({ name, sourceUrls: source })).toBe(false);
  });

  it("rejects a street/address-shaped fragment", () => {
    expect(isWellFormedPersonCandidate({ name: "123 State St", sourceUrls: source })).toBe(false);
  });

  it("rejects a list-only Forbes provenance even when the name is person-shaped", () => {
    expect(
      isWellFormedPersonCandidate({
        name: "Jane Example",
        sourceUrls: ["https://www.forbes.com/billionaires/"] ,
      }),
    ).toBe(false);
  });

  it("accepts a Forbes-mentioned person when an independent source is also present", () => {
    expect(
      isWellFormedPersonCandidate({
        name: "Jane Example",
        sourceUrls: [
          "https://www.forbes.com/billionaires/",
          "https://example.com/leadership/jane-example",
        ],
      }),
    ).toBe(true);
  });
});
