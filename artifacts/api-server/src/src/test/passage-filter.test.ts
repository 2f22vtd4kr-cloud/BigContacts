import { describe, expect, it } from "vitest";
import {
  filterClaimUrls,
  filterPassagesForQuery,
  hasClaimUrlSupport,
  scorePassage,
} from "../lib/passage-filter";
import { buildWebSearchSubQueries } from "../lib/web-search-queries";

describe("passage-filter", () => {
  it("scores contact-bearing passages higher for matching query tokens", () => {
    const q = new Set(["andrew", "johnson", "hastings"]);
    const contact = "Andrew Johnson of Hastings Manufacturing can be reached at office@example.com";
    const noise = "The weather in Paris was pleasant and the museum tickets sold out early.";
    expect(scorePassage(contact, q)).toBeGreaterThan(scorePassage(noise, q));
  });

  it("filters text toward query-relevant sentences", () => {
    const text = [
      "Irrelevant sports scores from last night filled the page.",
      "Andrew F. Johnson is listed as a principal of Hastings Manufacturing Co in Michigan.",
      "Cookie policy and privacy settings for this website.",
      "Contact the Hastings office via linkedin.com/in/example-profile for business inquiries.",
    ].join(" ");
    const filtered = filterPassagesForQuery(text, "Andrew Johnson Hastings contact", {
      maxChars: 500,
      minScore: 0.05,
    });
    expect(filtered.toLowerCase()).toContain("hastings");
    expect(filtered.toLowerCase()).not.toContain("cookie policy");
  });

  it("fail-closes contact URLs without http support", () => {
    expect(filterClaimUrls(["not-a-url", "ftp://x"])).toEqual([]);
    expect(hasClaimUrlSupport([])).toBe(false);
    expect(hasClaimUrlSupport(["https://sec.gov/filing"])).toBe(true);
  });

  it("intersects claim URLs with allowed citation set", () => {
    const allowed = ["https://efts.sec.gov/a", "https://example.com/about"];
    const got = filterClaimUrls(
      ["https://efts.sec.gov/a", "https://evil.example/fake", "https://example.com/about/team"],
      allowed,
    );
    expect(got).toContain("https://efts.sec.gov/a");
    expect(got.some((u) => u.includes("example.com/about"))).toBe(true);
    expect(got).not.toContain("https://evil.example/fake");
  });
});

describe("buildWebSearchSubQueries", () => {
  it("builds operator-aware person queries", () => {
    const qs = buildWebSearchSubQueries({
      name: "Andrew F. Johnson",
      type: "Person",
      companyName: "Hastings Manufacturing Co",
      geography: "Hastings, MI",
    });
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(qs.some((q) => q.includes("linkedin.com/in"))).toBe(true);
    expect(qs.some((q) => q.includes("Hastings Manufacturing"))).toBe(true);
  });

  it("adds registry site filters for corps", () => {
    const qs = buildWebSearchSubQueries({
      name: "Example Holdings Ltd",
      type: "Company",
      sourceRegistries: "UK Companies House",
    });
    expect(qs.some((q) => q.includes("site:companies-house.gov.uk"))).toBe(true);
  });
});
