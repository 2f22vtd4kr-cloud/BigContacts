import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ingestRoutes = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");

describe("ingestion route lock lifecycle", () => {
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
      const nextRoute = ingestRoutes.indexOf("\\nrouter.post(", routeStart + 1);
      const routeBlock = ingestRoutes.slice(routeStart, nextRoute < 0 ? ingestRoutes.length : nextRoute);
      expect(routeBlock, `${type} must release only its own lock in finally`).toMatch(
        new RegExp(`finally\\s*\\{[\\s\\S]*?clearActiveJobIfMatches\\("${type}",\\s*jobId\\)`),
      );
    }
  });
});
