import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const launch = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts"), "utf8");
const lock = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-job-lock.ts"), "utf8");

const checks = [
  ["canonical launch imports atomic claim", launch.includes("claimCanonicalJob")],
  ["canonical launch claims after creating job", launch.indexOf('createJob("atlas-run")') < launch.indexOf("claimCanonicalJob(" )],
  ["canonical launch handles failed claim", launch.includes("if (!claimed)") && launch.includes("another instance owns the distributed launch lock")],
  ["lock uses Redis NX", lock.includes('"NX"')],
  ["lock fails closed when Redis is unavailable", lock.includes("requires an available permanent Redis lock service")],
  ["local cache is updated only after successful claim", launch.indexOf("await setActiveJob(\"atlas-run\", atlasJobId)") > launch.indexOf("if (!claimed)")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
