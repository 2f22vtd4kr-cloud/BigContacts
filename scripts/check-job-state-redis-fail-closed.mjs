import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/job-queue.ts"), "utf8");
const launch = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts"), "utf8");

function section(text, start, end) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = text.indexOf(end, startIndex + start.length);
  return text.slice(startIndex, endIndex < 0 ? text.length : endIndex);
}

const strictRead = section(source, "export async function getActiveJobStrict(", "export async function getActiveJob(");
const compatibilityRead = section(source, "export async function getActiveJob(", "export async function getActiveJobs(");
const multiRead = section(source, "export async function getActiveJobs(", "export function invalidateActiveJobCache(");
const latestRead = section(source, "export async function getLatestJob(", "export async function updateAutoPipelineScheduler(");
const ownerRelease = section(source, "export async function clearActiveJobIfMatches(", "export async function ownsActiveJob(");

const checks = [
  ["strict active-job read distinguishes unavailable from idle", /readSucceeded\s*=\s*false/.test(strictRead) && /classifyActiveJobRead\(readSucceeded,\s*jobId\)/.test(strictRead) && /classified\.state\s*===\s*"unavailable"\)\s*throw/.test(strictRead)],
  ["canonical Atlas launch uses strict active-job read", /getActiveJobStrict\("atlas-run"\)/.test(launch)],
  ["canonical Atlas stop fails closed when active-job state is unavailable", /router\.post\("\/ingest\/atlas-stop"[\s\S]*?getActiveJobStrict\("atlas-run"\)[\s\S]*?JOB_STATE_UNAVAILABLE/.test(launch)],
  ["legacy best-effort accessor is explicitly separated from authoritative reads", /try\s*\{\s*return await getActiveJobStrict\(type\);\s*\}\s*catch\s*\{\s*return null;\s*\}/.test(compatibilityRead)],
  ["multi-active read throws on Redis failure instead of returning an idle map", /if\(!readSucceeded\s*\|\|\s*!vals\)\s*throw new Error\("Permanent Redis job-state read failed; active job state is unknown\."\)/.test(multiRead)],
  ["owner-bound release returns false when Redis state cannot be confirmed", /let ok\s*=\s*false/.test(ownerRelease) && /if\(!ok\)return false/.test(ownerRelease)],
  ["latest-job read exits on Redis failure before returning the Redis result", /if\(!ok\)return null;return r;/.test(latestRead)],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failures.length) {
  console.error("Job-state Redis fail-closed guard failed:", failures.join(", "));
  process.exit(1);
}
console.log("Job-state Redis fail-closed guard passed.");
