import { describe, expect, it } from "vitest";
import { compactDurableDiscoveryRecords, MAX_DURABLE_DISCOVERY_URL_CHARS } from "../lib/durable-discovery-projection";

describe("durable discovery URL projection", () => {
  it("preserves authoritative URLs whole or omits them whole with explicit counts", () => {
    const shortUrl = "https://www.example.test/announcement.pdf?download=1";
    const longUrl = "https://www.example.test/pdf/announcements/" + "acquisition-detail/".repeat(32) + "majority-stake.pdf?document=press-release&version=2026";
    expect(longUrl.length).toBeGreaterThan(MAX_DURABLE_DISCOVERY_URL_CHARS);

    const [projected] = compactDurableDiscoveryRecords([{
      turn: 17,
      action: "visit",
      execution: "success",
      args: { url: longUrl, sourceUrl: longUrl, query: "company acquisition announcement" },
      observedUrls: [shortUrl, longUrl],
      leadUrls: [shortUrl, longUrl],
      findings: [{
        vectorType: "other",
        value: "Sample Manufacturing Ltd",
        scope: "organization",
        personName: null,
        role: null,
        sourceUrls: [shortUrl, longUrl],
        note: "Observed organization name",
      }],
    }]);

    expect(projected).toBeDefined();
    expect(projected?.leadUrls).toEqual([shortUrl]);
    expect(projected?.leadUrlCount).toBe(2);
    expect(projected?.leadUrlsOmittedFromProjectionCount).toBe(1);
    expect(projected?.observedUrls).toEqual([shortUrl]);
    expect(projected?.observedUrlCount).toBe(2);
    expect(projected?.observedUrlsOmittedFromProjectionCount).toBe(1);

    const projectedArgs = projected?.args as Record<string, unknown>;
    expect(projectedArgs.url).toBeUndefined();
    expect(projectedArgs.sourceUrl).toBeUndefined();
    expect(projectedArgs.query).toBe("company acquisition announcement");
    expect(projected?.urlArgsOmittedFromProjectionCount).toBe(2);

    const findings = projected?.findings as Array<Record<string, unknown>>;
    expect(findings[0]?.sourceUrls).toEqual([shortUrl]);
    expect(findings[0]?.sourceUrlsTotalCount).toBe(2);
    expect(findings[0]?.sourceUrlsOmittedFromProjectionCount).toBe(1);

    // No field may contain the beginning of the discarded URL as a corrupted URL.
    expect(JSON.stringify(projected)).not.toContain(longUrl.slice(0, MAX_DURABLE_DISCOVERY_URL_CHARS));
    expect(JSON.stringify(projected)).toContain("leadUrlsOmittedFromProjectionCount");
  });

  it("keeps URL lists bounded and reports excess entries without cutting a URL", () => {
    const urls = Array.from({ length: 27 }, (_, i) => `https://example.test/source/${i}?full=1`);
    const [projected] = compactDurableDiscoveryRecords([{ turn: 1, action: "web_search", execution: "success", leadUrls: urls }]);
    expect(projected?.leadUrls).toEqual(urls.slice(0, 24));
    expect(projected?.leadUrlCount).toBe(27);
    expect(projected?.leadUrlsOmittedFromProjectionCount).toBe(3);
  });
});
