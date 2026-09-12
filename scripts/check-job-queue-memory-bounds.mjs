import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/job-queue.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/MAX_MEMORY_JOBS=256/.test(source), "in-process job state must have a finite capacity");
assert(/function trimMemoryJobs\(\)[\s\S]*while\(memoryJobs\.size>MAX_MEMORY_JOBS\)/.test(source), "in-process job state must evict beyond its capacity");
assert(/memoryLogs\.delete\(first\)/.test(source), "evicting a job must also evict its in-process log buffer");
assert(/trimMemoryJobs\(\);/.test(source), "memory trimming must run on job/log insertion paths");

if (failures.length) {
  console.error("JOB QUEUE MEMORY BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("JOB QUEUE MEMORY BOUNDS: PASS");
