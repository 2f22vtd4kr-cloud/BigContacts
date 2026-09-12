import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbSource = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const stopSource = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts"), "utf8");
const lockSource = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-job-lock.ts"), "utf8");
const checks = [
  ["event writer jobId is checked against durable case jobId", /event_job_id[\s\S]*stored_job_id[\s\S]*job binding mismatch/.test(dbSource)],
  ["case snapshots have a hard byte ceiling", /MAX_CASE_FILE_BYTES\s*=\s*1_048_576/.test(dbSource) && /research_cases_case_file_size_ck/.test(dbSource)],
  ["operator stop establishes the durable case fence before job cancellation", /await db\.update\(researchCasesTable\)[\s\S]*canonical-atlas-cancelled[\s\S]*await updateJob\(activeJobId/.test(stopSource)],
  ["agentic promotion requires an active target case", /apex_agentic_promotion_active_case[\s\S]*bound_case\.status <> 'active'[\s\S]*agentic contact promotion is fenced/.test(dbSource)],
  ["promotion locks the exact bound case row", /FROM public\.research_cases[\s\S]*target_entity_id = NEW\.id[\s\S]*LIMIT 1 FOR UPDATE/.test(dbSource)],
  ["stale workers cannot reactivate cancelled or lease-lost cases", /apex_research_case_cancellation_fence[\s\S]*canonical-atlas-cancelled[\s\S]*canonical-lease-lost[\s\S]*NEW\.status = 'active'/.test(dbSource)],
  ["lease loss uses the same durable cancellation fence", /canonical-lease-lost/.test(dbSource) && /fenceLeaseLostCases/.test(lockSource)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("DURABLE CASE/JOB FENCE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("DURABLE CASE/JOB FENCE: PASS");
