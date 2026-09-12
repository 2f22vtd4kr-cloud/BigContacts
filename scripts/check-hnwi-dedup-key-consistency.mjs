import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/const DEDUP_KEY="apex:dedup:hnwi"/.test(source), "HNWI dedup key must have one canonical namespace");
assert(/isDuplicate\(k:string\)\{return permSismember\(DEDUP_KEY,k\);\}/.test(source), "duplicate reads must use the canonical dedup key");
assert(/markSeen\(k:string\)\{await withPermanentClient\(async rc=>\{await rc\.sadd\(DEDUP_KEY,k\);await rc\.expire\(DEDUP_KEY,JOB_TTL\)/.test(source), "single-item dedup writes must use the canonical key and refresh its TTL");
assert(/clearDedup\(\)\{await withPermanentClient\(async rc=>\{await rc\.del\(DEDUP_KEY\)/.test(source), "dedup clearing must delete the actual canonical set");
assert(/sscan\(DEDUP_KEY,c,"MATCH"/.test(source), "dedup prefix preload must scan the canonical set");
assert(/sadd\(DEDUP_KEY,\.\.\.keys\);await rc\.expire\(DEDUP_KEY,JOB_TTL\)/.test(source), "batch dedup writes must use the canonical key and refresh its TTL");
assert(!/`apex:\$\{DEDUP_KEY\}`/.test(source), "dedup helpers must not double-prefix an already namespaced key");

if (failures.length) {
  console.error("HNWI DEDUP KEY CONSISTENCY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("HNWI DEDUP KEY CONSISTENCY: PASS");
