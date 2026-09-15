import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve(process.cwd(), "src/routes");

function read(name: string): string {
  return fs.readFileSync(path.join(routesDir, name), "utf8");
}

describe("canonical Atlas status boundary", () => {
  it("owns the live status path without restoring legacy Atlas execution", () => {
    const status = read("research/canonical-atlas-status.ts");
    const index = read("index.ts");
    const legacy = read("atlas.ts");

    expect(status).toContain('router.get("/ingest/atlas-status"');
    expect(status).toContain("getRecentDigSpans");
    expect(status).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(status).not.toContain("runAtlasPipeline");
    expect(status).not.toContain("runCanonicalAtlasPipeline");

    const canonicalMount = index.indexOf('router.use(canonicalAtlasStatusRouter);');
    const legacyQuarantine = index.indexOf('router.use(legacyAtlasLaunchQuarantine);');
    expect(canonicalMount).toBeGreaterThanOrEqual(0);
    expect(legacyQuarantine).toBeGreaterThanOrEqual(0);
    expect(canonicalMount).toBeLessThan(legacyQuarantine);

    expect(legacy).toContain('status(410)');
    expect(legacy).not.toContain('router.get("/ingest/atlas-status"');
  });
});
