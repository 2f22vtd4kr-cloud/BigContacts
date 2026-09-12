import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const wrapper = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"), "utf8");
const core = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const checks = [
  ["agentic wrapper has a bounded concurrent-run admission limit", /APEX_MAX_CONCURRENT_AGENTIC_RUNS/.test(wrapper) && /MAX_CONCURRENT_CORE_RUNS/.test(wrapper)],
  ["agentic wrapper fails closed instead of queueing beyond the limit", /activeCoreRuns >= MAX_CONCURRENT_CORE_RUNS/.test(wrapper) && /refusing another concurrent run/.test(wrapper)],
  ["agentic wrapper releases admission on every exit path", /try \{\n    return await withAgenticExecutionScope/.test(wrapper) && /finally \{\n    releaseCoreRunSlot\(\);/.test(wrapper)],
  ["core provider waiters remain cancellation-aware", /signal\?\.addEventListener\("abort"/.test(core) && /providerWaiters\.splice/.test(core)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("AGENTIC CONCURRENCY ADMISSION: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AGENTIC CONCURRENCY ADMISSION: PASS");
