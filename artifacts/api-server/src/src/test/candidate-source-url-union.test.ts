import { describe, expect, it } from "vitest";
import { candidateSourceUrlsForIdentity, isClaimGradeDiscoverySourceUrl, mergeDurablyAdmittedCandidateSources } from "../lib/candidate-source-url-union";

function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}

const isClaimGradeSourceUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/\S+$/i.test(value);

describe("candidate source URL union", () => {
  it("retains a later matching finding's observed source instead of using only the first finding", () => {
    const sourceUrls = candidateSourceUrlsForIdentity({
      personName: "Jane Example",
      isClaimGradeSourceUrl,
      normalizeSourceUrl,
      findings: [
        { personName: "Jane Example", promotionDecision: "promote", scope: "candidate", sourceUrls: ["https://example.test/unvisited"] },
        { personName: "JANE   EXAMPLE", promotionDecision: "promote", scope: "candidate", sourceUrls: ["https://example.test/visited#bio", "https://example.test/visited"] },
        { personName: "Jane Example", promotionDecision: "reject", scope: "candidate", sourceUrls: ["https://example.test/rejected"] },
        { personName: "Jane Example", promotionDecision: "promote", scope: "organization", sourceUrls: ["https://example.test/org-only"] },
      ],
    });

    expect(sourceUrls).toEqual([
      "https://example.test/unvisited",
      "https://example.test/visited",
    ]);
  });
});

describe("discovery source evidence policy", () => {
  it("requires HTTPS and rejects search-result endpoints as candidate claim evidence", () => {
    expect(isClaimGradeDiscoverySourceUrl("http://example.test/team/jane")).toBe(false);
    expect(isClaimGradeDiscoverySourceUrl("https://example.test/team/jane")).toBe(true);
    for (const url of [
      "https://www.google.com/search?q=Jane+Example",
      "https://www.bing.com/search?q=Jane",
      "https://search.yahoo.com/search?p=Jane",
      "https://duckduckgo.com/?q=Jane",
      "https://efts.sec.gov/LATEST/search-index?q=Jane",
      "https://example.test/search?q=Jane",
    ]) expect(isClaimGradeDiscoverySourceUrl(url)).toBe(false);
    expect(isClaimGradeDiscoverySourceUrl("https://example.test/team/jane")).toBe(true);
    expect(isClaimGradeDiscoverySourceUrl("https://www.sec.gov/Archives/edgar/data/123/filing.htm")).toBe(true);
  });

  it("merges only durable supporting page URLs across continuations", () => {
    expect(mergeDurablyAdmittedCandidateSources([
      [{ name: "Jane Example", sourceUrls: ["https://example.test/team/jane#bio"] }],
      [{ name: "JANE   EXAMPLE", sourceUrls: ["https://example.test/about/", "https://google.com/search?q=Jane"] }],
    ])).toEqual([{
      name: "Jane Example",
      sourceUrls: ["https://example.test/team/jane", "https://example.test/about"],
    }]);
  });
});
