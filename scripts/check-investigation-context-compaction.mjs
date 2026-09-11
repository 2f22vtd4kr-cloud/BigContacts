import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const checks = [
  ["bounded maximum", /MAX_MAX_CHARS\s*=\s*64_000/.test(source)],
  ["prior context is explicitly bounded", /Prior durable context \(bounded historical summary\)/.test(source)],
  ["nested prior context is removed", /removeNestedPrior/.test(source)],
  ["structured observations are preferred", /Recent structured Investigator observations/.test(source)],
  ["structured records are clipped before prompt assembly", /compactRecords\(trajectoryRecords, trajectoryBudget\)/.test(source)],
  ["evidence attribution remains represented", /Evidence attribution state/.test(source)],
  ["final deterministic bound exists", /return clip\(result, maxChars\)/.test(source)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
