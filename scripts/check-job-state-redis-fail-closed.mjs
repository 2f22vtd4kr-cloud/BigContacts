import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const queue = read("artifacts/api-server/src/src/lib/job-queue.ts");
const launch = read("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const ingest = read("artifacts/api-server/src/src/routes/ingest.ts");

function exportedFunction(source, name) {
  const start = source.indexOf(`export async function ${name}(`);
  if (start < 0) return "";
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

const getJob = exportedFunction(queue, "getJob");
const getJobStrict = exportedFunction(queue, "getJobStrict");
const getActiveJobStrict = exportedFunction(queue, "getActiveJobStrict");
const getActiveJob = exportedFunction(queue, "getActiveJob");
const getActiveJobs = exportedFunction(queue, "getActiveJobs");
const clearActiveJobIfMatches = exportedFunction(queue, "clearActiveJobIfMatches");
const getLatestJob = exportedFunction(queue, "getLatestJob");

const checks = [
  ["durable job reads distinguish Redis transport failure from an empty hash", /let redisOk=false[\s\S]*if\(!redisOk\)return null[\s\S]*if\(!raw\|\|Object\.keys\(raw\)\.length===0\)/.test(getJob)],
  ["authoritative job-record reads throw when Redis state is unknown", /if\(!redisOk\)throw new Error/.test(getJobStrict)],
  ["canonical launch checks an active lane using strict job-record reads", launch.includes("getJobStrict(existingId)")],
  ["active-job polling uses strict job-record reads after reading its lane", /job = await getJobStrict\(jobId\)/.test(ingest) && /JOB_STATE_INCONSISTENT/.test(ingest)],
  ["job polling never turns Redis outages into false 404 responses", /getJobStrict\(jobId\)[\s\S]*JOB_STATE_UNAVAILABLE[\s\S]*status\(404\)/.test(ingest)],
  ["authoritative active-lane reads throw when Redis state is unknown", getActiveJobStrict.includes("classifyActiveJobRead(readSucceeded,jobId)") && getActiveJobStrict.includes('classified.state==="unavailable"') && getActiveJobStrict.includes("active job state is unknown")],
  ["legacy best-effort active read is explicitly a wrapper, not an authority", /return await getActiveJobStrict\(type\);\}catch\{return null;\}/.test(getActiveJob)],
  ["Atlas launch uses the authoritative active-lane read", launch.includes('getActiveJobStrict("atlas-run")')],
  ["Atlas stop refuses to claim a stop while active-lane state is unavailable", /getActiveJobStrict\("atlas-run"\)[\s\S]*JOB_STATE_UNAVAILABLE/.test(launch.slice(launch.indexOf('router.post("/ingest/atlas-stop"')))],
  ["multi-active authoritative read throws when Redis state is unknown", /if\(!readSucceeded\|\|!vals\) throw new Error/.test(getActiveJobs)],
  ["owner-bound active release returns false on Redis transport failure", /let ok=false[\s\S]*if\(!ok\)return false/.test(clearActiveJobIfMatches)],
  ["latest-job read does not expose stale memory state when Redis is unavailable", /let ok=false[\s\S]*if\(!ok\)return null/.test(getLatestJob)],
  ["active-job HTTP polling exposes unavailable as 503, not as an idle lane", /getActiveJobStrict\(type\)[\s\S]*status\(503\)[\s\S]*JOB_STATE_UNAVAILABLE/.test(ingest)],
  ["legacy ingestion status distinguishes unavailable lanes from idle lanes", (() => { const s = ingest.slice(ingest.indexOf('router.get("/ingest/status"'), ingest.indexOf('router.post("/ingest/occrp"')); return /getActiveJobs\(\["western-hnwi", "faa"\]\)/.test(s) && /getJobStrict\(activeWhnwi\)/.test(s) && /getJobStrict\(activeFaa\)/.test(s) && s.includes("JOB_STATE_UNAVAILABLE") && s.includes("JOB_STATE_INCONSISTENT"); })()],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("Job-state Redis fail-closed guard failed:", failures.join(", "));
  process.exit(1);
}
console.log(`Job-state Redis fail-closed guard passed (${checks.length} strict/source-boundary checks).`);
