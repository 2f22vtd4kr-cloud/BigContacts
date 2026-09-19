import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve(process.cwd(), "src/src/routes");
const libDir = path.resolve(process.cwd(), "src/src/lib");

function readRoute(name: string): string {
  return fs.readFileSync(path.join(routesDir, name), "utf8");
}

function readLib(name: string): string {
  return fs.readFileSync(path.join(libDir, name), "utf8");
}

describe("canonical Atlas status boundary", () => {
  it("keeps the retired legacy status path quarantined while canonical status uses the active job/trace surface", () => {
    const index = readRoute("index.ts");
    const legacy = readRoute("atlas.ts");
    const quarantine = readLib("legacy-atlas-launch-quarantine.ts");
    const statusPath = path.join(routesDir, "research/canonical-atlas-status.ts");

    expect(fs.existsSync(statusPath)).toBe(false);
    expect(index).not.toContain("canonical-atlas-status");
    expect(index).toContain("legacyAtlasLaunchQuarantine");
    expect(quarantine).toContain("status(410)");
    expect(legacy).not.toContain('router.get("/ingest/atlas-status"');
    expect(legacy).toContain("status(410)");

    const storePath = path.resolve(process.cwd(), "../apex-finder/src/lib/reactor-live-store.ts");
    const store = fs.readFileSync(storePath, "utf8");
    expect(store).toContain("job/active/atlas-run");
    expect(store).toContain("atlas-trace/");
    expect(store).not.toContain("fetch(\"/api/ingest/atlas-status");
  });
});
