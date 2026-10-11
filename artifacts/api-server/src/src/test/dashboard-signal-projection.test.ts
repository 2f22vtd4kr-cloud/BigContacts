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

  it("does not synthesize today's date when no dated activity exists", () => {
    expect(source).toContain("signalDate: activityMap[e.id] ?? null");
    expect(source).not.toContain('signalDate: activityMap[e.id] ?? new Date().toISOString().split("T")[0]!');
  });
});
