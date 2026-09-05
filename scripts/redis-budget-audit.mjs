#!/usr/bin/env node
/**
 * Apex Atlas Redis budget audit.
 *
 * This is intentionally static: it does not connect to Redis and therefore
 * cannot burn operator quota. It fails closed when known hot-path patterns
 * that caused the Upstash command leak reappear.
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

const failures = [];
const warnings = [];
const text = (rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
};

const job = text(files[0]);
const live = text(files[1]);
const atlas = text(files[2]);
const hook = text(files[5]);
const workspace = text(files[6]);
const reactor = text(files[7]);

// Never allow the old full keyspace migration to return to the status hot path.
if (/getLatestJob[\\s\\S]{0,12000}\\.scan\\([^)]*apex:job:\*/i.test(job)) {
  failures.push("job-queue.ts: getLatestJob contains a keyspace SCAN on apex:job:*.");
}

// setActiveJob must not perform a write followed by an immediate read-back.
const setActive = job.match(/export async function setActiveJob[\\s\\S]*?\\n}\\n\\nexport async function getActiveJob/);
if (setActive && /rc\\.get\\(.*activejob/i.test(setActive[0])) {
  failures.push("job-queue.ts: setActiveJob performs a SET+GET verification pair; use one SET and local cache instead.");
}

// Job updates must not refresh the 7-day TTL on every progress message.
const update = job.match(/export async function updateJob[\\s\\S]*?\\n}\\n\\nexport async function clearJobFields/);
if (update && /rc\\.expire\\(jk\(jobId\)/.test(update[0])) {
  failures.push("job-queue.ts: updateJob refreshes job TTL on every update; remove the per-update EXPIRE hot-path command.");
}

// The Bureau live log must never feed a BUREAU event back into itself through
// appendJobLog -> mirrorJobLogLine -> publishBureauEvent.
if (/appendJobLog\([\\s\\S]*?mirrorJobLogLine/i.test(live) && !/BUREAU\\\|.*skip|startsWith\([\"']BUREAU\\\|/i.test(job)) {
  failures.push("bureau-live-log/job-queue: BUREAU job-log mirroring has no recursion guard.");
}

// Do not accept duplicate UI polling loops that hammer status independently.
const hookIntervals = (hook.match(/setInterval\\(/g) || []).length;
const workspaceIntervals = (workspace.match(/setInterval\\(/g) || []).length;
const reactorIntervals = (reactor.match(/setInterval\\(/g) || []).length;
if (hookIntervals > 1) warnings.push(`use-atlas-run.ts: ${hookIntervals} interval sites; verify only one status poller exists.`);
if (workspaceIntervals > 1) warnings.push(`workspace-status.tsx: ${workspaceIntervals} interval sites; verify only one network poller exists.`);
if (reactorIntervals > 2) warnings.push(`reactor.tsx: ${reactorIntervals} interval sites; audit duplicate status/job polling.`);

// The Atlas launch route must not retry lock verification three times.
const launch = atlas.match(/router\.post\([\"']\\/ingest\\/atlas-run[\\s\\S]*?res\.status\(202\)/);
if (launch && /for\\s*\\(let attempt = 0; attempt < 3; attempt\+\+\)/.test(launch[0])) {
  failures.push("atlas.ts: atlas-run launch still has a 3-attempt Redis lock verification loop.");
}

if (failures.length) {
  console.error("REDIS BUDGET AUDIT: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("REDIS BUDGET AUDIT: PASS");
if (warnings.length) {
  for (const w of warnings) console.warn(`WARN: ${w}`);
}
