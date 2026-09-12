import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lock = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-job-lock.ts"), "utf8");
const launch = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts"), "utf8");
const recovery = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/startup-recovery.ts"), "utf8");
const checks = [
  ["lock lease is bounded", /JOB_LOCK_TTL_SECONDS\s*=\s*60\s*\*\s*60/.test(lock)],
  ["owner-bound heartbeat exists", /renewCanonicalJob/.test(lock) && /ARGV\[1\]/.test(lock)],
  ["renewal cannot replace another owner", /== ARGV\[1\].*expire/s.test(lock)],
  ["release remains owner-bound", /releaseCanonicalJob[\s\S]*redis\.eval/.test(lock)],
  ["launch does not perform an unconditional second lock SET", !/setActiveJob\("atlas-run"/.test(launch)],
  ["lease renewal timer is cleaned on release", /leaseTimers\.delete\(timerKey\)/.test(lock)],
  ["startup recovery uses owner-bound release", /clearActiveJobIfOwned/.test(recovery) && !/\bclearActiveJob\(type\s*,/.test(recovery)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL JOB LOCK LEASE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL JOB LOCK LEASE: PASS");
