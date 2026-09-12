import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbSource = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const stopSource = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts"), "utf8");
const promotionSource = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const checks = [
  ["event writer jobId is checked against durable case jobId", /event_job_id[\s\S]*stored_job_id[\s\S]*job binding mismatch/.test(dbSource)],
  ["case snapshots have a hard byte ceiling", /MAX_CASE_FILE_BYTES\s*=\s*1_048_576/.test(dbSource) && /research_cases_case_file_size_ck/.test(dbSource)],
  ["operator stop fences durable cases before Redis cancellation", /await db\.update\(researchCasesTable\)[\s\S]*canonical-atlas-cancelled[\s\S]*await updateJob\(activeJobId/.test(stopSource)],
  ["agentic promotion requires an active target case", /apex_agentic_promotion_active_case[\s\S]*status = 'active'[\s\S]*agentic contact promotion is fenced/.test(promotionSource)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("DURABLE CASE/JOB FENCE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("DURABLE CASE/JOB FENCE: PASS");
