import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  dedupeEvidence,
  getSourceFamily,
  scoreCorroboration,
} from "../lib/evidence-ledger";

describe("evidence ledger utility", () => {
  it("canonicalizes http(s) urls", () => {
    expect(canonicalizeUrl("https://www.example.com/path/?utm_source=newsletter#frag")).toBe("https://example.com/path");
    expect(canonicalizeUrl("https://reuters.com./story")).toBe("https://reuters.com/story");
    expect(canonicalizeUrl("http://example.com/a/b/")).toBe("http://example.com/a/b");
    expect(canonicalizeUrl("mailto:test@example.com")).toBeNull();
  });

  it("derives source family from host heuristics", () => {
    expect(getSourceFamily("www.sec.gov")).toBe("official");
    expect(getSourceFamily("www.reuters.com")).toBe("press");
    expect(getSourceFamily("reuters.com.")).toBe("press");
    expect(getSourceFamily("companieshouse.gov.uk")).toBe("registry");
    expect(getSourceFamily("edgar.sec.gov")).toBe("registry");
    expect(getSourceFamily("agency.gov")).toBe("official");
    expect(getSourceFamily("register.com")).toBe("registry");
    expect(getSourceFamily("news.reuters.com")).toBe("press");
    expect(getSourceFamily("twitter.com")).toBe("social");
    expect(getSourceFamily("google.com")).toBe("search");
end
    expect(getSourceFamily("www.reuters.com.")).toBe("press");
    expect(getSourceFamily("reuters.attacker.com")).toBe("unknown");
    expect(getSourceFamily("notreuters.com")).toBe("unknown");
    expect(getSourceFamily("companieshouse.gov.uk")).toBe("registry");
  });

  it("deduplicates mirrored evidence by canonical url/domain and normalized value", () => {
    const items = dedupeEvidence([
      { url: "https://www.example.com/x/?utm_source=a", value: "Acme Inc" },
      { url: "https://example.com/x", value: " acme inc " },
      { url: "https://mirror.example.com/x", value: "ACME INC" },
    ]);
    expect(items).toHaveLength(2);
  });

  it("scores corroboration with family/domain diversity and conflict penalties", () => {
    const summary = scoreCorroboration([
      { url: "https://www.sec.gov/edgar", value: "Acme Inc" },
      { url: "https://reuters.com/article", value: "Acme Inc" },
      { url: "https://twitter.com/acme", value: "Acme Inc" },
      { url: "https://example.com", value: "Different Name" },
    ]);
    expect(summary.corroboratingFamilies).toBeGreaterThanOrEqual(2);
    expect(summary.corroboratingDomains).toBeGreaterThanOrEqual(3);
    expect(summary.conflictCount).toBeGreaterThanOrEqual(0);
    expect(summary.score).toBeGreaterThan(0);
  });
});