import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const routesIndexPath = path.join(repoRoot, "artifacts/api-server/src/src/routes/index.ts");
const quarantinePath = path.join(repoRoot, "artifacts/api-server/src/src/lib/legacy-atlas-launch-quarantine.ts");
const retiredStatusPath = path.join(repoRoot, "artifacts/api-server/src/src/routes/research/canonical-atlas-status.ts");

describe("retired Atlas status boundary", () => {
  it("does not mount the retired status projection and explicitly quarantines GET /ingest/atlas-status", () => {
    const routesIndex = fs.readFileSync(routesIndexPath, "utf8");
    const quarantine = fs.readFileSync(quarantinePath, "utf8");

    expect(fs.existsSync(retiredStatusPath)).toBe(false);
    expect(routesIndex).not.toContain("canonical-atlas-status");
    expect(routesIndex).toContain("legacyAtlasLaunchQuarantine");
    expect(quarantine).toContain('req.method === "GET" && req.path === "/ingest/atlas-status"');
    expect(quarantine).toContain('res.status(410)');
  });
});
