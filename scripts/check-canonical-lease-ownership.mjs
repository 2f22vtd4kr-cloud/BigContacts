import fs from "node:fs";

const lock = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-job-lock.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(/async function fenceLeaseLostCases\(type: string, jobId: string\)/.test(lock), "lease-loss fencing must be typed by lock lane and job");
assert(/apex:job:\$\{jobId\}/.test(lock), "lease-loss fencing must target the expired worker job record");
assert(/status: \"cancelled\"/.test(lock) && /Canonical lease lost/.test(lock), "lease-loss fencing must cancel the expired worker job");
assert(/fenceLeaseLostCases\(type, jobId\)/.test(lock), "renewal failure must invoke lease-loss fencing");
assert(!/owner !== jobId/.test(lock), "lease-loss fencing must not skip the old job merely because the lane was taken over");

if (failures.length) {
  console.error("CANONICAL LEASE OWNERSHIP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL LEASE OWNERSHIP: PASS");
