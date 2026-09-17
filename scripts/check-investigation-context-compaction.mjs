import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const checks = [
  ["lossless context assembly is explicit", /Lossless assembly of durable investigation context/.test(source)],
  ["recursive prior snapshot is handled without data-budget clipping", /removeOnlyRecursivePrior/.test(source)],
  ["complete Investigator records are preserved", /Complete Investigator trajectory records/.test(source)],
  ["complete Investigator trajectory is preserved", /Complete Investigator trajectory/.test(source)],
  ["complete evidence attribution is preserved", /Complete evidence attribution state/.test(source)],
  ["no deterministic max-character clipping remains", !/MAX_MAX_CHARS|return clip\(|compactRecords\(|compactEvidence\(/.test(source)],
  ["no bounded tail slicing remains", !/slice\(\s*-\d+/.test(source)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
