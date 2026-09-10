import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/pages/data-sources.tsx"), "utf8");

const checks = [
  ["source catalogue has no direct extended-OSINT trigger", !/endpoint:\s*["']\/api\/enrich\//.test(source)],
  ["source catalogue has no stale direct extended-OSINT URL", !/\/api\/enrich\//.test(source)],
  ["source catalogue describes model-owned research boundary", /canonical Investigator/i.test(source)],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
