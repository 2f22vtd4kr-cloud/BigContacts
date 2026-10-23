import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/dashboard.ts"), "utf8");

describe("dashboard source signal provenance", () => {
  it("places undated assets last and never treats category as source attribution", () => {
    expect(source).toContain('DESC NULLS LAST');
    expect(source).toContain("!a.lastActivityDate");
    expect(source).toContain("!a.sourceRegistry?.trim()");
    expect(source).not.toContain("const src = a.sourceRegistry ?? a.category");
  });

  it("parses discovery event payloads defensively instead of casting legacy text in SQL", () => {
    const start = source.indexOf("const sourceEventBatches =");
    const end = source.indexOf("const durableRecordsByCase =", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const eventQuery = source.slice(start, end);

    // research_case_events.payload is text. The route's JS JSON.parse catch is
    // useful only if PostgreSQL does not cast a malformed legacy row first.
    expect(eventQuery).toContain("payload: researchCaseEventsTable.payload");
    expect(eventQuery).not.toMatch(/researchCaseEventsTable\.payload\}\s*::jsonb/);
    expect(eventQuery).toContain("JSON.parse(event.payload)");
  });

  it("preserves complete public source-card URLs and omits routes unsafe to redact", () => {
    const start = source.indexOf("function normalizeSearchLeadUrl(raw: unknown):");
    const end = source.indexOf("// GET /dashboard/research-leads", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const normalizer = source.slice(start, end);

    expect(normalizer).toContain("retainCompletePublicHttpUrlForPrompt(raw, 32_768)");
    expect(normalizer).toContain("sourceUrl,");
    expect(normalizer).not.toContain("sanitizeUrlForEvidence");
    expect(normalizer).not.toContain('url.hash = ""');
    expect(normalizer).toContain("url.hostname.replace(/^www[.]/i");
  });

  it("does not synthesize today's date when no dated activity exists", () => {
    expect(source).toContain("signalDate: activityMap[e.id] ?? null");
    expect(source).not.toContain('signalDate: activityMap[e.id] ?? new Date().toISOString().split("T")[0]!');
  });
});
