import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");

const launchCount = (source.match(/runBureauAgenticWebPass\(/g) || []).length;
const cancellationCount = (source.match(/shouldCancel:\s*async \(\) => \{ const job = await getJob\(atlasJobId\)/g) || []).length;
const checks = [
  ["canonical discovery imports durable job state", /import \{[^}]*getJob[^}]*\} from ["']\.\/job-queue["']/.test(source)],
  ["canonical discovery has Investigator cancellation boundary", cancellationCount >= 1],
  ["every canonical discovery Investigator launch is cancellation-aware", launchCount === 0 || cancellationCount >= launchCount],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
