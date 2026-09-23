#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/const memoryOnlyJobs=new Set<string>\(\)/.test(source), "memory-only jobs must be explicitly tracked");
assert(/if\(!wrote\)\{memoryOnlyJobs\.add\(jobId\)/.test(source), "only jobs created without durable Redis state may use memory fallback");
assert(/if\(!raw\|\|Object\.keys\(raw\)\.length===0\)return memoryOnlyJobs\.has\(jobId\)\?/.test(source), "a successful Redis miss must never return stale durable-job memory");
assert(/const value=await rc\.hgetall\(jk\(jobId\)\);redisOk=true;/.test(source), "Redis read success must be recorded only after the command resolves");
assert(/if\(!redisOk\)return null;/.test(source), "Redis command failure must fail closed for authoritative job reads");

if (failures.length) {
  console.error("JOB QUEUE AUTHORITATIVE READ: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("JOB QUEUE AUTHORITATIVE READ: PASS");
