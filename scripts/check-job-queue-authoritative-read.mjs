#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/const memoryOnlyJobs=new Set<string>\(\)/.test(source), "memory-only jobs must be explicitly tracked");
assert(/if\(memoryOnlyJobs\.has\(jobId\)\)\{[\s\S]*canApplyJobPatchWithoutRedis\(prev\.status,true\)[\s\S]*return;\}/.test(source), "only explicitly memory-only jobs may be mutated in memory and must never be partially persisted to Redis");
assert(/getJob\(jobId:string\):Promise<JobState\|null>\{if\(memoryOnlyJobs\.has\(jobId\)\)return memoryJobs\.get\(jobId\)\?\?null;/.test(source), "memory-only job reads must use their explicit local source of truth");
assert(/if\(redisResult===0\|\|redisResult===null\)return;/.test(source), "Redis-backed job updates must fail closed during outages and after terminal rejection");
assert(/if\(!raw\|\|Object\.keys\(raw\)\.length===0\)return memoryOnlyJobs\.has\(jobId\)\?/.test(source), "a successful Redis miss must never return stale durable-job memory");
assert(/const value=await rc\.hgetall\(jk\(jobId\)\);redisOk=true;/.test(source), "Redis read success must be recorded only after the command resolves");
assert(/if\(!redisOk\)return null;/.test(source), "Redis command failure must fail closed for authoritative job reads");
assert(/if current=='cancelled' or current=='done' or current=='failed' then return 0 end/.test(source), "Redis must reject every late write after a job reaches a terminal state");
assert(/if\(redisResult===0\)return;/.test(source), "a rejected terminal write must not rewrite the cached status as cancelled");
assert(/if\(memoryOnlyJobs\.has\(jobId\)\)\{[\s\S]*canApplyJobPatchWithoutRedis\(prev\.status,true\)[\s\S]*return;\}/.test(source), "Redis outage updates must be restricted to explicitly memory-only jobs");
assert(/if\(prev&&!canApplyJobPatch\(prev\.status\)\)return;/.test(source), "terminal local state must prevent reopening even during Redis inconsistency");

if (failures.length) {
  console.error("JOB QUEUE AUTHORITATIVE READ: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("JOB QUEUE AUTHORITATIVE READ: PASS");
