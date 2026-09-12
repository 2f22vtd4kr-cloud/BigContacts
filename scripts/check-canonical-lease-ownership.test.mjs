import assert from "node:assert/strict";
import fs from "node:fs";

const lock = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-job-lock.ts", "utf8");
assert.match(lock, /export async function isCanonicalJobOwner/);
assert.match(lock, /redis\.get\(`apex:activejob:\$\{type\}`\)/);
assert.match(lock, /owner === jobId/);

for (const file of ["artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /isCanonicalJobOwner/);
}
console.log("canonical lease ownership checks pass");
