import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/if\(type===\"atlas-run\"\)\{try\{[\s\S]*releaseCanonicalJob\(type,jobId\)/.test(source), "canonical Atlas lane must use the canonical release path");
assert(/import\(\"\.\/canonical-job-lock\"\)/.test(source), "canonical release bridge must load the canonical lock module");
assert(/releaseCanonicalJob\(type,jobId\)/.test(source), "canonical release bridge must stop the canonical lease timer and release its Redis owner");
assert(/if\(type===\"atlas-run\"\)\{try\{[\s\S]*return released;\}catch\{return false;\}\}/.test(source), "canonical Atlas release bridge must fail closed on release errors");
assert(!/type===\"atlas-run\"\|\|type===\"case-bureau-discovery\"/.test(source), "non-canonical lanes must not release the canonical Atlas key under their own lane name");
assert(/invalidateActiveJobCache\(type\);let ok=false;const outcome=await safeRedis\([\s\S]{0,700}apex:activejob:\$\{type\}/.test(source), "non-canonical lanes must release their own active-job key with owner-bound CAS");

if (failures.length) {
  console.error("CANONICAL ACTIVE RELEASE BRIDGE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ACTIVE RELEASE BRIDGE: PASS");
