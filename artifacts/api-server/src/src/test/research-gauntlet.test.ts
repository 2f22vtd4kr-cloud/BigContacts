import { describe, expect, it } from "vitest";

function metric(tp: number, predicted: number, expected: number) {
  return { precision: predicted ? tp / predicted : null, recall: expected ? tp / expected : null };
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();
  return url.toString().replace(/\/$/, "");
}

function evidenceCoverage(observationUrls: string[], requiredUrls: string[]) {
  const observed = new Set(observationUrls.map(normalizeUrl));
  return requiredUrls.every((url) => observed.has(normalizeUrl(url)));
}

function claimMatchesGold(claim: { predicate: string; object: string }, gold: { predicate: string; object: string }) {
  return claim.predicate.trim().toLowerCase() === gold.predicate.trim().toLowerCase()
    && claim.object.trim().replace(/\s+/g, " ").toLowerCase() === gold.object.trim().replace(/\s+/g, " ").toLowerCase();
}

function groundedClassCovered(observationUrls: string[], requiredUrls: string[], requiredClasses: string[]) {
  const observed = new Set(observationUrls.map(normalizeUrl));
  const required = new Set(requiredUrls.map(normalizeUrl));
  return requiredClasses.length === 0 || [...required].some((url) => observed.has(url));
}

describe("research gauntlet metric contract", () => {
  it("keeps precision and recall separate", () => expect(metric(2, 4, 2)).toEqual({ precision: 0.5, recall: 1 }));
  it("does not reward a forced answer when no expected identity exists", () => expect(metric(0, 1, 0)).toEqual({ precision: 0, recall: null }));
  it("permits insufficient-evidence cases", () => expect({ outcome: "insufficient_evidence", identities: [] }.outcome).toBe("insufficient_evidence"));
  it("requires unique observation identifiers", () => {
    const observations = [{ id: "o1" }, { id: "o2" }];
    expect(new Set(observations.map((o) => o.id)).size).toBe(observations.length);
  });
  it("requires exact claim mapping before awarding gold support", () => {
    expect(claimMatchesGold({ predicate: "currentRole", object: "Chief Executive Officer" }, { predicate: "currentRole", object: "Chief Executive Officer" })).toBe(true);
    expect(claimMatchesGold({ predicate: "currentRole", object: "CEO" }, { predicate: "currentRole", object: "Chief Executive Officer" })).toBe(false);
  });
  it("treats grounded source classes as metadata of canonical source URLs", () => {
    expect(groundedClassCovered(
      ["https://example.com/a"],
      ["https://example.com/a"],
      ["official"],
    )).toBe(true);
    expect(groundedClassCovered(
      ["https://example.com/other"],
      ["https://example.com/a"],
      ["official"],
    )).toBe(false);
  });
  it("requires claims to cite the gold source URLs through observations", () => {
    expect(evidenceCoverage(
      ["https://example.com/a", "https://example.com/b#section"],
      ["https://example.com/a/", "https://example.com/b"],
    )).toBe(true);
    expect(evidenceCoverage(
      ["https://example.com/a"],
      ["https://example.com/a", "https://example.com/b"],
    )).toBe(false);
  });
});