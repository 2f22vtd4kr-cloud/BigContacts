import fs from "node:fs";

const lock = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-job-lock.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(/async function fenceLeaseLostCases\(type: string, jobId: string\)/.test(lock), "lease-loss fencing must be typed by lock lane and job");
assert(/apex:job:\$\{jobId\}/.test(lock), "lease-loss fencing must target the expired worker job record");
assert(lock.includes("redis.call('hset',k,'status','cancelled','outcome','incomplete'") && lock.includes("Canonical lease lost"), "lease-loss fencing must atomically cancel only a nonterminal expired worker job");
assert(lock.includes("local owner=redis.call('get',KEYS[1]); if owner==ARGV[1] then return 0 end;"), "lease-loss fencing must verify that this job no longer owns the active lease");
assert(lock.includes("if not status or status=='done' or status=='failed' or status=='cancelled' then return 0 end;"), "lease-loss fencing must preserve missing and terminal job snapshots");
assert(/renewCanonicalJob\(type, jobId\)\.then\(\(renewed\) => \{ if \(!renewed\)[\s\S]*fenceLeaseLostCases\(type, jobId\)/.test(lock), "confirmed owner mismatch must invoke lease-loss fencing");
assert(/Canonical lease renewal failed; retrying before fencing/.test(lock), "transient renewal errors must retry rather than cancel a live job");
assert(/if \(!fenced\) return;[\s\S]*await db\.update\(researchCasesTable\)/.test(lock), "durable case state is transitioned only after the atomic Redis fence confirms this worker was fenced");

if (failures.length) {
  console.error("CANONICAL LEASE OWNERSHIP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL LEASE OWNERSHIP: PASS");
