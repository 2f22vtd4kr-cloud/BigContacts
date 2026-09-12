import fs from "node:fs";

const files = [
  "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
  "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts",
];
const lock = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-job-lock.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(lock.includes("isCanonicalJobOwner"), "canonical job lock must expose an ownership check");
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  assert(source.includes("isCanonicalJobOwner"), `${file} must fence work after distributed lease loss`);
}
if (failures.length) {
  console.error("CANONICAL LEASE OWNERSHIP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL LEASE OWNERSHIP: PASS");
