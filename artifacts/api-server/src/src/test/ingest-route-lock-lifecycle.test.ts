import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ingestRoutes = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");

describe("ingestion route lock lifecycle", () => {
  it("reconciles terminal stale locks strictly and fails closed on unknown or missing job state", () => {
    expect(ingestRoutes).toContain("async function ensureIngestionLaneAvailable");
    expect(ingestRoutes).toContain("const existingJobId = await getActiveJobStrict(type)");
    expect(ingestRoutes).toContain("const existing = await getJobStrict(existingJobId)");
    expect(ingestRoutes).toContain('if (laneStatus === "unknown")');
    expect(ingestRoutes).toContain("clearActiveJobIfMatches(type, existingJobId)");
    expect(ingestRoutes).toContain("const currentOwner = await getActiveJobStrict(type)");
    expect(ingestRoutes).not.toMatch(/getActiveJob\(\s*"(?:western-hnwi|faa|brreg-snapshot|occrp|land-registry|opensky)"\s*\)/u);
  });

  it("releases each claimed ingestion lane in a finally block after success or failure", () => {
    const laneTypes = [
      "western-hnwi",
      "faa",
      "brreg-snapshot",
      "occrp",
      "land-registry",
      "opensky",
    ] as const;

    for (const type of laneTypes) {
      const routeStart = ingestRoutes.indexOf(`router.post("/ingest/${type}"`);
      expect(routeStart, `missing route for ${type}`).toBeGreaterThanOrEqual(0);
      const routeTail = ingestRoutes.slice(routeStart + 1);
      const nextRouteOffset = routeTail.search(/\nrouter\.(?:get|post)\(/u);
      const routeBlock = ingestRoutes.slice(routeStart, nextRouteOffset < 0 ? ingestRoutes.length : routeStart + 1 + nextRouteOffset);
      expect(routeBlock, `${type} must release only its own lock in finally`).toMatch(
        new RegExp(`finally\\s*\\{[\\s\\S]*?clearActiveJobIfMatches\\("${type}",\\s*jobId\\)`),
      );
    }
  });
});
