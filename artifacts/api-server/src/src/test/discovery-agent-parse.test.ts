import { describe, it, expect } from "vitest";
import {
  hasStrongIdentityEvidence,
  isWellFormedPersonCandidate,
  parsePersonFindings,
} from "../lib/discovery-agent";

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

  it("rejects a synthetic search URL as identity provenance", () => {
    expect(
      passesDiscoveryIdentityGate("Jane Example", [
        "https://www.google.com/search?q=%22Jane%20Example%22",
      ]),
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

  it("does not admit a model-asserted person unless the cited page was actually visited", () => {
    const finding = [{
      personName: "Jane Example",
      scope: "candidate" as const,
      sourceUrls: ["https://example.com/leadership/jane-example"],
      note: "named on public page",
    }];

    expect(parsePersonFindings(finding, [
      "step1: web_search private company founder interview",
    ])).toEqual([]);

    expect(parsePersonFindings(finding, [
      "step1: web_search private company founder interview",
      "step2: visit https://example.com/leadership/jane-example",
    ])).toEqual([
      expect.objectContaining({ name: "Jane Example" }),
    ]);
  });

  it("accepts browser-fetch provenance as an observed source", () => {
    const finding = [{
      value: "person: Jane Example | Founder | Example Co",
      scope: "candidate" as const,
      sourceUrls: ["https://example.com/about"],
    }];

    expect(parsePersonFindings(finding, [
      "step1: browser_fetch https://example.com/about",
    ])).toEqual([
      expect.objectContaining({ name: "Jane Example", company: "Example Co" }),
    ]);
  });
});
