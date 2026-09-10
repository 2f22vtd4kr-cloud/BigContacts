import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("artifacts/api-server/package.json", "utf8"));

const ok =
  !source.includes("providerDecisionTimeoutMs = 18_000") &&
  source.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS") &&
  source.includes("const controller = new AbortController()") &&
  source.includes("fn(prompt, controller.signal)") &&
  source.includes("clearTimeout(timer)") &&
  source.includes("runController.abort()") &&
  source.includes("Math.min(MAX_ITER, Math.max(1, requestedIterations))") &&
  pkg.scripts?.build?.includes("check-agentic-timeout-abort-safety.mjs");

if (!ok) {
  console.error("FAIL: agentic provider/run timeout hardening is missing or not wired into the canonical build");
  process.exit(1);
}

console.log("OK: agentic provider and run-level timeouts are bounded and abortable");
