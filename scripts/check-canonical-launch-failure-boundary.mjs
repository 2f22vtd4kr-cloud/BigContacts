#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("canonical launch has an outer failure boundary", /let atlasJobId: string \| null = null;[\s\S]*?try \{[\s\S]*?enablePermanentRedis\(\);[\s\S]*?catch \(error\)/.test(source));
pass("Redis initialization is inside the boundary", /try \{[\s\S]{0,500}await enablePermanentRedis\(\);/.test(source));
pass("job creation is inside the boundary", /await createJob\("atlas-run"\)/.test(source));
pass("canonical lock claim is inside the boundary", /await claimCanonicalJob\("atlas-run", atlasJobId\)/.test(source));
pass("failed owned jobs are marked failed", /if \(atlasJobId\) \{[\s\S]{0,500}updateJob\(atlasJobId, \{ status: "failed"/.test(source));
pass("cleanup releases only a lock explicitly claimed by this request", /if \(lockClaimed && atlasJobId\) \{[\s\S]{0,250}releaseCanonicalJob\("atlas-run", atlasJobId\)/.test(source));
pass("infrastructure failures return structured 503", /if \(!res\.headersSent\) res\.status\(503\)\.json/.test(source));
pass("background pipeline has its own failure/finally cleanup", /void \(async \(\) => \{[\s\S]*?catch \(error\)[\s\S]*?updateJob\(atlasJobId, \{ status: "failed"/.test(source)&&/finally \{[\s\S]*?releaseCanonicalJob\("atlas-run", atlasJobId\)/.test(source));

if (failures.length) {
  console.error("CANONICAL LAUNCH FAILURE BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL LAUNCH FAILURE BOUNDARY: PASS");
