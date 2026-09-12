import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"), "utf8");
const checks = [
  ["mounted discovery case validates the case type", /eq\(researchCasesTable\.caseType, expected\.mode\)/.test(source)],
  ["discovery case is bound to the current Atlas job", /expected\.jobId && storedJobId !== expected\.jobId/.test(source)],
  ["target execution run binding remains strict", /expected\.mode === "target" && storedRunId && storedRunId !== expected\.runId/.test(source)],
  ["missing durable context fails closed", /has no durable context document/.test(source)],
  ["discovery multi-run state retains the durable job boundary", /runIds: \[\.\.\.new Set/.test(source) && /jobId: input\.jobId/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL DISCOVERY CASE BINDING: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL DISCOVERY CASE BINDING: PASS");
