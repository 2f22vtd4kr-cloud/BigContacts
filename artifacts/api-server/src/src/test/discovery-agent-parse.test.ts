import { describe, it, expect } from "vitest";
import { hasStrongIdentityEvidence, isWellFormedPersonCandidate } from "../lib/discovery-agent";

const source = ["https://example.com/about"];

function passesDiscoveryIdentityGate(name: string, sourceUrls = source): boolean {
  return (
    isWellFormedPersonCandidate({ name, sourceUrls })
    && hasStrongIdentityEvidence({ name, sourceUrls })
  );
}

describe("discovery agent identity boundary", () => {
  it("accepts a normal source-backed person-shaped identity", () => {
    expect(passesDiscoveryIdentityGate("Jane Example")).toBe(true);
  });

  it.each([
    "com EMAIL",
    "President PERSON",
    "State St",
    "Operational Enablement",
    "Product Comparisons Sage Products",
    "security issues",
    "Chief Executive Officer",
    "Private Equity",
    "Venture Capital",
    "Real Estate",
    "Asset Management",
    "Wealth Management",
    "Investment Management",
    "Private Markets",
    "Contact Us",
    "About Us",
    "Forbes Billionaires",
  ])("rejects historical malformed candidate: %s", (name) => {
    expect(passesDiscoveryIdentityGate(name)).toBe(false);
  });

  it("rejects a street/address-shaped fragment", () => {
    expect(passesDiscoveryIdentityGate("123 State St")).toBe(false);
  });

  it("rejects a list-only Forbes provenance even when the name is person-shaped", () => {
    expect(
      passesDiscoveryIdentityGate("Jane Example", ["https://www.forbes.com/billionaires/"]),
    ).toBe(false);
  });

  it("accepts a Forbes-mentioned person when an independent source is also present", () => {
    expect(
      passesDiscoveryIdentityGate("Jane Example", [
        "https://www.forbes.com/billionaires/",
        "https://example.com/leadership/jane-example",
      ]),
    ).toBe(true);
  });
});
