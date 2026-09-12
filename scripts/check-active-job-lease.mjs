import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/ACTIVE_JOB_TTL_SECONDS=15\*60/.test(source), "active job lanes must have a bounded lease TTL");
assert(/ACTIVE_JOB_RENEW_INTERVAL_MS=5\*60\*1000/.test(source), "active job lanes must renew before expiry");
assert(/async function renewActiveJob\(type:string,jobId:string\)/.test(source), "active job renewal primitive missing");
assert(/startActiveJobRenewal\(type,jobId\)/.test(source), "active job claim must start lease renewal");
assert(/if\(renewed!==true\)\{stopActiveJobRenewal/.test(source), "failed renewal must stop the stale worker's renewal timer");
assert(/clearActiveJobIfMatches[\s\S]*stopActiveJobRenewal\(type,jobId\)/.test(source), "owner release must stop the renewal timer");

if (failures.length) {
  console.error("ACTIVE JOB LEASE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("ACTIVE JOB LEASE: PASS");
