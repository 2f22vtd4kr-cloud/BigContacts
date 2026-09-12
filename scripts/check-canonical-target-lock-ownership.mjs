import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(!source.includes("releaseCanonicalJob"), "single-target runner must not release the Atlas lane owned by its caller");
assert(!source.includes("releaseCanonicalJob(\"atlas-run\""), "target execution must not release the outer canonical Atlas lock");
assert(/runCanonicalSingleTargetInvestigation\(atlasJobId/.test(source), "canonical target runner must remain job-bound");

if (failures.length) {
  console.error("CANONICAL TARGET LOCK OWNERSHIP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL TARGET LOCK OWNERSHIP: PASS");
