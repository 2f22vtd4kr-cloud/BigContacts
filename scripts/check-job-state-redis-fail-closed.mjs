import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "artifacts/api-server/src/src/lib/job-queue.ts"), "utf8");
const checks = [
  ["durable getJob distinguishes Redis failure", /export async function getJob[\s\S]*let redisOk=false[\s\S]*if\(!redisOk\)return null/.test(source)],
  ["active-job read fails closed on Redis failure", /export async function getActiveJob[\s\S]*if\(!ok\)[\s\S]*return null/.test(source)],
  ["multi-active read fails closed on Redis failure", /export async function getActiveJobs[\s\S]*if\(!ok\)return new Map/.test(source)],
  ["owner-bound active release fails closed on Redis failure", /export async function clearActiveJobIfMatches[\s\S]*let ok=false[\s\S]*if\(!ok\)return false/.test(source)],
  ["latest-job read does not resurrect memory state during Redis failure", /export async function getLatestJob[\s\S]*if\(!ok\)return null[\s\S]*return r/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("Job-state Redis fail-closed guard failed:", failures.join(", "));
  process.exit(1);
}
console.log("Job-state Redis fail-closed guard passed.");
