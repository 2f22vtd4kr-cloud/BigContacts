import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "artifacts/api-server/src/src/lib/canonical-job-lock.ts"), "utf8");
const checks = [
  ["lock lease is bounded", /JOB_LOCK_TTL_SECONDS\s*=\s*60\s*\*\s*60/.test(source)],
  ["owner-bound heartbeat exists", /renewCanonicalJob/.test(source) && /ARGV\[1\]/.test(source)],
  ["renewal cannot replace another owner", /== ARGV\[1\].*expire/s.test(source)],
  ["release remains owner-bound", /releaseCanonicalJob[\s\S]*redis\.eval/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL JOB LOCK LEASE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL JOB LOCK LEASE: PASS");
