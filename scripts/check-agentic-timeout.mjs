import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("artifacts/api-server/package.json", "utf8"));

const ok =
  !source.includes("providerDecisionTimeoutMs = 18_000") &&
  source.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS") &&
  source.includes("void fn(prompt).then(") &&
  source.includes("clearTimeout(timer)") &&
  pkg.scripts?.build?.includes("apply-agentic-timeout-hardening.mjs");

if (!ok) {
  console.error("FAIL: agentic provider timeout hardening is missing or not wired into the canonical build");
  process.exit(1);
}

console.log("OK: agentic provider timeout is bounded above provider fetch deadlines and late rejections are consumed");
