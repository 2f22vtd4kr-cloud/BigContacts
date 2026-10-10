import fs from "node:fs";

const workflowPath = ".github/workflows/apex-live-audit.yml";
const runtimePath = "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts";
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

let workflow;
let runtime;
try {
  workflow = fs.readFileSync(workflowPath, "utf8");
  runtime = fs.readFileSync(runtimePath, "utf8");
} catch (error) {
  console.error(`FAIL: unable to read live-audit budget contract: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const configuredBudgetMatch = workflow.match(/^\s*APEX_ATLAS_RUN_TIMEOUT_MS:\s*["']?(\d+)["']?\s*$/m);
const workflowTimeoutMatch = workflow.match(/^\s*timeout-minutes:\s*(\d+)\s*$/m);
const pollAnchor = workflow.indexOf('require("/tmp/launch.json").jobId\')');
const pollLoop = pollAnchor >= 0
  ? workflow.slice(pollAnchor).match(/for i in \$\(seq 1 (\d+)\); do\s*\n\s*sleep (\d+)/)
  : null;

if (!runtime.includes("process.env.APEX_ATLAS_RUN_TIMEOUT_MS") || !runtime.includes("atlasDeadline = startedAt + atlasTimeoutMs")) {
  fail("canonical Atlas runner no longer exposes the global deadline contract this workflow must cover");
}
if (!configuredBudgetMatch) {
  fail("manual live-audit must set APEX_ATLAS_RUN_TIMEOUT_MS explicitly instead of relying on a changing runtime default");
}
if (!workflowTimeoutMatch) {
  fail("manual live-audit must declare a finite workflow job timeout");
}
if (!pollLoop) {
  fail("could not locate the canonical job-status polling loop after launch");
}

if (configuredBudgetMatch && workflowTimeoutMatch && pollLoop) {
  const atlasBudgetMs = Number(configuredBudgetMatch[1]);
  const jobTimeoutMs = Number(workflowTimeoutMatch[1]) * 60_000;
  const pollBudgetMs = Number(pollLoop[1]) * Number(pollLoop[2]) * 1_000;
  const statusMarginMs = 5 * 60_000;
  const setupMarginMs = 5 * 60_000;
  if (!Number.isSafeInteger(atlasBudgetMs) || atlasBudgetMs < 120_000 || atlasBudgetMs > 30 * 60_000) {
    fail(`configured Atlas global budget ${atlasBudgetMs}ms is outside the runtime's supported 2–30 minute range`);
  }
  if (pollBudgetMs < atlasBudgetMs + statusMarginMs) {
    fail(`poll window ${Math.round(pollBudgetMs / 60_000)}m does not cover the ${Math.round(atlasBudgetMs / 60_000)}m Atlas deadline plus a 5m terminal-observation margin`);
  }
  if (jobTimeoutMs < pollBudgetMs + setupMarginMs) {
    fail(`workflow job timeout ${Math.round(jobTimeoutMs / 60_000)}m does not leave 5m for setup and evidence preservation around the poll window`);
  }
  if (process.exitCode !== 1) {
    console.log(`PASS: live-audit poll window ${Math.round(pollBudgetMs / 60_000)}m covers Atlas budget ${Math.round(atlasBudgetMs / 60_000)}m plus terminal margin within the ${Math.round(jobTimeoutMs / 60_000)}m job timeout`);
  }
}
if (process.exitCode) process.exit(1);
