import fs from "node:fs";

const lock = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-job-lock.ts", "utf8");
const launch = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts", "utf8");
const targetRunner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const jobQueue = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(lock.includes("export async function claimCanonicalJob"), "canonical job claim helper missing");
assert(lock.includes("NX"), "canonical job claim is not an atomic NX acquisition");
assert(lock.includes("export async function releaseCanonicalJob"), "canonical job release helper missing");
assert(lock.includes("redis.eval("), "canonical job release is not atomic");
assert(lock.includes("redis.call('get', KEYS[1]) == ARGV[1]"), "canonical job release does not compare owner before delete");
assert(launch.includes("claimCanonicalJob(\"atlas-run\", atlasJobId)"), "canonical launch does not use the distributed claim helper");
assert(launch.includes("releaseCanonicalJob(\"atlas-run\", existingId)"), "canonical launch does not atomically clear a completed stale lock");
assert(launch.includes("releaseCanonicalJob(\"atlas-run\", atlasJobId)"), "canonical launch does not release its own lock through the atomic owner check");
assert(!/clearActiveJobIf(?:Owned|Matches)\(/.test(launch), "canonical launch still uses a read-then-delete active-job release");
assert(!targetRunner.includes("releaseCanonicalJob"), "canonical target runner must not release the outer Atlas lane");
assert(!targetRunner.includes("clearActiveJobIfOwned"), "canonical target runner must not release the outer Atlas lane through the generic job queue");
assert(!targetRunner.includes("clearActiveJobIfMatches"), "canonical target runner must not bypass outer canonical lock ownership");
assert(/type===\"atlas-run\"\|\|type===\"case-bureau-discovery\"/.test(jobQueue), "job queue must recognize canonical Atlas lock lanes");
assert(/import\(\"\.\/canonical-job-lock\"\)/.test(jobQueue), "job queue must bridge canonical lane release to the canonical lock module");
assert(/releaseCanonicalJob\(type,jobId\)/.test(jobQueue), "canonical lane release must use the atomic owner-checked release API");

if (failures.length) {
  console.error("CANONICAL JOB LOCK: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL JOB LOCK: PASS");
