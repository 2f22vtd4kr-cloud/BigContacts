#!/usr/bin/env node
/**
 * Apex Atlas Redis budget audit.
 *
 * Static only: this script never connects to Redis. It checks the known
 * hot-path patterns that previously caused unnecessary Redis command growth.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "artifacts/api-server/src/src/lib/job-queue.ts",
  "artifacts/api-server/src/src/lib/bureau-live-log.ts",
  "artifacts/api-server/src/src/routes/atlas.ts",
  "artifacts/api-server/src/src/routes/health.ts",
  "artifacts/api-server/src/src/routes/system-status.ts",
  "artifacts/apex-finder/src/lib/use-atlas-run.ts",
  "artifacts/apex-finder/src/components/workspace-status.tsx",
  "artifacts/apex-finder/src/pages/reactor.tsx",
];

const failures: string[] = [];
const warnings: string[] = [];
const read = (rel: string) => {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
};

const job = read(files[0]);
const live = read(files[1]);
const atlas = read(files[2]);
const hook = read(files[5]);
const workspace = read(files[6]);
const reactor = read(files[7]);

if (/getLatestJob[\s\S]{0,12000}\.scan\([^)]*apex:job:\*/i.test(job)) {
  failures.push("job-queue.ts: getLatestJob contains a keyspace SCAN on apex:job:*.");
}

const setActive = job.match(/export async function setActiveJob[\s\S]*?\n}\n\nexport async function getActiveJob/);
if (setActive && /rc\.get\(.*activejob/i.test(setActive[0])) {
  failures.push("job-queue.ts: setActiveJob performs SET+GET verification; use one SET and local state.");
}

const update = job.match(/export async function updateJob[\s\S]*?\n}\n\nexport async function clearJobFields/);
if (update && /rc\.expire\(jk\(jobId\)/.test(update[0])) {
  failures.push("job-queue.ts: updateJob refreshes job TTL on every update.");
}

const hasBureauMirror = /appendJobLog\([\s\S]*?mirrorJobLogLine/i.test(live);
const hasBureauGuard =
  job.includes('startsWith("BUREAU|') ||
  job.includes("startsWith('BUREAU|") ||
  job.includes('BUREAU|') && job.includes("skip");
if (hasBureauMirror && !hasBureauGuard) {
  failures.push("bureau-live-log/job-queue: BUREAU job-log mirroring has no recursion guard.");
}

const hookIntervals = (hook.match(/setInterval\(/g) || []).length;
const workspaceIntervals = (workspace.match(/setInterval\(/g) || []).length;
const reactorIntervals = (reactor.match(/setInterval\(/g) || []).length;
if (hookIntervals > 1) warnings.push(`use-atlas-run.ts: ${hookIntervals} interval sites; verify one status poller exists.`);
if (workspaceIntervals > 1) warnings.push(`workspace-status.tsx: ${workspaceIntervals} interval sites; verify duplicate polling.`);
if (reactorIntervals > 2) warnings.push(`reactor.tsx: ${reactorIntervals} interval sites; audit duplicate polling.`);

const launch = atlas.match(/router\.post\(["']\/ingest\/atlas-run[\s\S]*?res\.status\(202\)/);
if (launch && /for\s*\(let attempt = 0; attempt < 3; attempt\+\+\)/.test(launch[0])) {
  failures.push("atlas.ts: atlas-run launch still has a 3-attempt Redis lock verification loop.");
}

if (failures.length) {
  console.error("REDIS BUDGET AUDIT: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("REDIS BUDGET AUDIT: PASS");
for (const warning of warnings) console.warn(`WARN: ${warning}`);
