#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const index = read("artifacts/api-server/src/src/routes/index.ts");
const launch = read("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const legacyAtlas = read("artifacts/api-server/src/src/routes/atlas.ts");

const checks = [
  ["canonical launch route defines POST /ingest/atlas-run", launch.includes('router.post("/ingest/atlas-run"')],
  ["canonical launch route calls canonical discovery", launch.includes("runCanonicalAtlasPipeline")],
  ["canonical launch route calls canonical single-target runner", launch.includes("runCanonicalSingleTargetInvestigation")],
  ["canonical launch route does not import legacy Atlas orchestrator", !launch.includes("atlas-orchestrator")],
  ["canonical launch route is mounted", index.includes("canonicalAtlasLaunchRouter")],
  ["canonical launch is mounted before legacy Atlas router", index.indexOf("canonicalAtlasLaunchRouter") < index.indexOf("atlasRouter")],
  ["legacy Atlas router remains status/compatibility infrastructure", legacyAtlas.includes("runAtlasPipeline")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
