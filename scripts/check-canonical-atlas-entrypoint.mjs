#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const index = read("artifacts/api-server/src/src/routes/index.ts");
const launch = read("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const legacyAtlas = read("artifacts/api-server/src/routes/atlas.ts");
const quarantine = read("artifacts/api-server/src/src/lib/legacy-atlas-launch-quarantine.ts");

const checks = [
  ["canonical launch route defines POST /ingest/atlas-run", launch.includes('router.post("/ingest/atlas-run"')],
  ["canonical launch route calls canonical discovery", launch.includes("runCanonicalAtlasPipeline")],
  ["canonical launch route calls canonical single-target runner", launch.includes("runCanonicalSingleTargetInvestigation")],
  ["canonical launch route does not import legacy Atlas orchestrator", !launch.includes("atlas-orchestrator")],
  ["canonical launch enables permanent Redis before the active-job read", launch.includes("await enablePermanentRedis()") && launch.indexOf("await enablePermanentRedis()") < launch.indexOf('await getActiveJob("atlas-run")')],
  ["canonical launch route is mounted", index.includes("canonicalAtlasLaunchRouter")],
  ["canonical launch is mounted before legacy Atlas quarantine", index.indexOf("router.use(canonicalAtlasLaunchRouter)") < index.indexOf("router.use(legacyAtlasLaunchQuarantine)")],
  ["legacy Atlas router does not import legacy Atlas orchestrator", !legacyAtlas.includes('from "../lib/atlas-orchestrator"')],
  ["legacy Atlas launch is quarantined before the compatibility router", index.indexOf("router.use(legacyAtlasLaunchQuarantine)") < index.indexOf("router.use(atlasRouter)")],
  ["legacy Atlas POST launch is explicitly retired by the quarantine boundary", /req\.path === "\/ingest\/atlas-run"[\s\S]{0,500}status\(410\)/.test(quarantine) || /POST\s+\/ingest\/atlas-run[\s\S]{0,500}410/.test(quarantine)],
  ["legacy Atlas router retains only compatibility/status infrastructure", legacyAtlas.includes("/ingest/atlas-status") && legacyAtlas.includes("/ingest/atlas-lock")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
