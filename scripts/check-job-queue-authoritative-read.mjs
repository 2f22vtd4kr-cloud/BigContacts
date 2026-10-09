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
assert(/if not current or current=='cancelled' or current=='done' or current=='failed' then return 0 end/.test(source), "Redis must reject late writes after terminal state and must not resurrect a missing job hash");
assert(/if\(redisResult===0\|\|redisResult===null\)return;/.test(source), "a rejected terminal write or ambiguous Redis failure must not rewrite the cached status as cancelled");
assert(/if\(memoryOnlyJobs\.has\(jobId\)\)\{[\s\S]*canApplyJobPatchWithoutRedis\(prev\.status,true\)[\s\S]*return;\}/.test(source), "Redis outage updates must be restricted to explicitly memory-only jobs");
assert(/if\(prev&&!canApplyJobPatch\(prev\.status\)\)return;/.test(source), "terminal local state must prevent reopening even during Redis inconsistency");
assert(/createJob\(type:string\):Promise<string>\{[\s\S]*const createLua="local k=KEYS\[1\]; if redis.call\('exists',k\)==1 then return -1 end;[\s\S]*redis.call\('set',KEYS\[2\],ARGV\[#ARGV\],'EX',ttl\); return 1"/.test(source), "durable job snapshot, TTL, and latest-job index must be written atomically");
assert(/classifyJobCreationVerification\(jobId,type,persisted\)/.test(source) && /if\(verification==="durable"\)return jobId;[\s\S]*throw new Error\("Canonical job creation was not durably confirmed; refusing to launch\."\)/.test(source), "an ambiguous create response may launch only after an exact queued snapshot is confirmed durable");
assert(/if\(!getPermanentClient\(\)\)\{[\s\S]*memoryOnlyJobs\.add\(jobId\)[\s\S]*return jobId;\}/.test(source), "memory-only fallback is allowed only before any canonical Redis write attempt");

if (failures.length) {
  console.error("JOB QUEUE AUTHORITATIVE READ: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("JOB QUEUE AUTHORITATIVE READ: PASS");
