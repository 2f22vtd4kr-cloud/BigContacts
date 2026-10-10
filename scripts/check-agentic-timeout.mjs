import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("artifacts/api-server/package.json", "utf8"));
const resilientWorkflow = fs.readFileSync(".github/workflows/apex-live-audit-resilient.yml", "utf8");
const timeoutConfig = source.match(/export const AGENTIC_PROVIDER_DECISION_TIMEOUT_MS\s*=\s*boundedPositiveNumber\(process\.env\.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS,\s*([\d_]+),\s*([\d_]+),\s*([\d_]+(?:\s*\*\s*[\d_]+)?)\);/);
const durationMs = (value) => {
  const factors = value.split("*").map((part) => Number(part.trim().replaceAll("_", "")));
  return factors.every(Number.isFinite) ? factors.reduce((total, factor) => total * factor, 1) : Number.NaN;
};
const providerDefaultMs = timeoutConfig ? durationMs(timeoutConfig[1]) : Number.NaN;
const providerMinimumMs = timeoutConfig ? durationMs(timeoutConfig[2]) : Number.NaN;
const providerMaximumMs = timeoutConfig ? durationMs(timeoutConfig[3]) : Number.NaN;
const providerTimeoutBoundsOk = Boolean(
  timeoutConfig &&
  providerDefaultMs >= 125_000 &&
  providerMinimumMs >= 55_000 &&
  providerMaximumMs >= providerDefaultMs &&
  providerMaximumMs <= 10 * 60_000
);
const hasWorkflowTimeout = /^\s*AGENTIC_PROVIDER_DECISION_TIMEOUT_MS\s*:/m.test(resilientWorkflow);
const timeoutOverride = resilientWorkflow.match(/^\s*AGENTIC_PROVIDER_DECISION_TIMEOUT_MS:\s*["']?(\d+)["']?\s*$/m);
const workflowBudgetOk = hasWorkflowTimeout
  ? Boolean(timeoutOverride && Number(timeoutOverride[1]) >= 125_000)
  : providerTimeoutBoundsOk;

const ok =
  providerTimeoutBoundsOk &&
  workflowBudgetOk &&
  !source.includes("providerDecisionTimeoutMs = 18_000") &&
  source.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS") &&
  source.includes("const controller = new AbortController()") &&
  source.includes("fn(boundedPrompt, controller.signal)") &&
  source.includes("clearTimeout(timer)") &&
  source.includes("runController.abort()") &&
  source.includes("const MAX_ITER = 64") &&
  source.includes("Math.min(Math.max(0, requestedIterations), MAX_ITER)") &&
  pkg.scripts?.build?.includes("check-agentic-timeout-abort-safety.mjs");

if (!ok) {
  console.error("FAIL: agentic provider/run timeout hardening is missing or not wired into the canonical build");
  process.exit(1);
}

console.log("OK: agentic provider and run-level timeouts are bounded and abortable without imposing an action-count ceiling");
