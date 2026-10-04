import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");

const providerGate = read("./artifacts/api-server/src/src/lib/provider-gate.ts");
const launch = read("./artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const continuation = read("./artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const investigator = read("./artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const boss = read("./artifacts/api-server/src/src/lib/groq-boss.ts");

const checks = [
  [providerGate.includes('scope.startsWith("atlas-run:")'), "Atlas jobs must receive a distinct provider-gate scope."],
  [providerGate.includes('APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE",80,1,80'), "Atlas scope budget must remain bounded at 80 by default/max."],
  [launch.includes("withProviderScope(`atlas-run:${atlasJobId}`"), "Canonical launch must bind all provider calls to the unique Atlas job scope."],
  [continuation.includes("withProviderScope(`atlas-run:${jobId}`"), "Canonical continuation/recovery must bind provider calls to the unique Atlas job scope."],
  [investigator.includes("isLocalProviderQuotaError(error)"), "Investigator must recognize local provider-gate quota failures."],
  [investigator.includes("if (isLocalProviderQuotaError(error)) return null;"), "Investigator must stop futile same-provider fallback after a local gate block."],
  [boss.includes("isLocalProviderQuotaError(error)"), "Boss must recognize local provider-gate quota failures."],
  [boss.includes("Groq Boss local provider gate blocked further attempts"), "Boss must fail fast and emit a privacy-safe local-gate diagnostic."],
  [read("./artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts").includes('return kind === "requests" || kind === "tokens";'), "Unknown Right-hand 429s must remain eligible for bounded transient retry."],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(message);
  process.exit(1);
}
console.log("canonical Atlas provider scope checks passed");
