#!/usr/bin/env node
import fs from "node:fs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, "utf8");
const packageJson = JSON.parse(read("artifacts/api-server/package.json"));
const both = `${String(packageJson.scripts?.build ?? "")}\n${String(packageJson.scripts?.test ?? "")}`;
const rootPackage = JSON.parse(read("package.json"));
const bureau = String(rootPackage.scripts?.["check:bureau"] ?? "");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const initializer = read("scripts/initialize-apex-schema.sh");
const ciProvision = read("scripts/ci-provision-db.sh");
const fullAuditWorkflow = read(".github/workflows/audit-full-code-five-consecutive.yml");
const smokeTests = read("artifacts/api-server/src/src/test/smoke.test.ts");
const postMerge = read("scripts/post-merge.sh");
const dbPackage = JSON.parse(read("lib/db/package.json"));
const finalReviewPath = "artifacts/api-server/src/src/lib/ai-extractor.ts";
const finalReview = fs.existsSync(`${root}/${finalReviewPath}`) ? read(finalReviewPath) : "";

const retiredHardeners = ["apply-retire-secondary-surface-calls.mjs"];
let failed = false;
for (const hardener of retiredHardeners) {
  if (both.includes(hardener)) { console.error(`MIGRATION PARITY FAIL: source mutator remains in API build/test: ${hardener}`); failed = true; }
}

const sourceAssertions = [
  ["free-ReAct source contains no forced opening instruction", !/Begin\. Choose an initial web_search query/i.test(agentic) && !/\(none — begin with web_search\)/i.test(agentic)],
  ["retired legacy final-review surface has no fallback path", !fs.existsSync(`${root}/${finalReviewPath}`) || (!/groq-final-review-fallback/i.test(finalReview) && !/Groq capacity fallback/i.test(finalReview))],
  ["registry cancellation has a dedicated invariant gate", both.includes("check-agentic-registry-signal.mjs") && bureau.includes("check:agentic-registry-signal")],
  ["registry cancellation is source-native", !fs.existsSync(`${root}/scripts/apply-registry-cancellation-boundary.mjs`) && !fs.existsSync(`${root}/scripts/apply-agentic-registry-signal-wiring.mjs`)],
  ["post-merge checks fail fast rather than masking earlier failures", /^set -euo pipefail$/m.test(postMerge)],
  ["post-merge does not perform an unguarded raw Drizzle schema push", !/pnpm --filter @workspace\/db run push/.test(postMerge)],
  ["post-merge gates schema mutation and delegates to the full initializer", postMerge.includes('if [[ "${APEX_ALLOW_SCHEMA_PUSH:-false}" == "true" ]]; then') && postMerge.includes("bash scripts/initialize-apex-schema.sh") && postMerge.indexOf("if [[ \"${APEX_ALLOW_SCHEMA_PUSH:-false}\" == \"true\" ]]; then") < postMerge.indexOf("bash scripts/initialize-apex-schema.sh")],
  ["CI DB provisioning delegates to the complete explicit schema initializer", ciProvision.includes('export APEX_ALLOW_SCHEMA_PUSH=true') && ciProvision.includes("bash scripts/initialize-apex-schema.sh")],
  ["five-pass full audit uses the same complete migration initializer", fullAuditWorkflow.includes("Initialize complete Apex database schema and migrations") && fullAuditWorkflow.includes('APEX_ALLOW_SCHEMA_PUSH: "true"') && fullAuditWorkflow.includes("bash scripts/initialize-apex-schema.sh") && !fullAuditWorkflow.includes("drizzle-kit push --config ./drizzle.config.ts")],
  ["five-pass full audit initializes the ledger before telemetry tests", fullAuditWorkflow.indexOf("Initialize complete Apex database schema and migrations") >= 0 && fullAuditWorkflow.indexOf("Initialize complete Apex database schema and migrations") < fullAuditWorkflow.indexOf("Repository architecture contract suite")],
  ["five-pass full audit keeps provider-backed smoke tests explicitly disabled", fullAuditWorkflow.includes('RUN_LIVE_PROVIDER_TESTS: "false"') && smokeTests.includes('const LIVE_PROVIDER_TESTS = process.env.RUN_LIVE_PROVIDER_TESTS === "true";') && (smokeTests.match(/describe\.skipIf\(!LIVE_PROVIDER_TESTS\)/g) ?? []).length === 3],
  ["legacy contact semantic scores are preserved before active heuristic fields are cleared", (() => { const m = read("lib/db/migrations/008-contact-semantic-scores-unassessed.sql"); const s = read("lib/db/src/schema/phase_j.ts"); const i = read("scripts/initialize-apex-schema.sh"); const columns = ["source_reliability", "identity_match", "recency_score", "directness_score"]; return columns.every((column) => m.includes("legacy_" + column) && s.includes("legacy" + column.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("")) && i.includes("legacy_" + column) && m.includes("ALTER COLUMN " + column + " DROP NOT NULL") && m.includes(column + " = NULL")) && m.indexOf("legacy_source_reliability = COALESCE") < m.indexOf("source_reliability = NULL"); })()],
  ["explicit schema initialization applies committed migrations in order", (() => { const p = [initializer.indexOf('if [[ "${APEX_ALLOW_SCHEMA_PUSH:-false}" != "true" ]]'), initializer.indexOf("pnpm --filter @workspace/db run push"), initializer.indexOf("pnpm --filter @workspace/db run harden"), initializer.indexOf("lib/db/migrations/002-contact-outcome.sql"), initializer.indexOf("lib/db/migrations/003-atlas-review-candidate-type.sql"), initializer.indexOf("lib/db/migrations/004-registry-candidate-truth.sql"), initializer.indexOf("lib/db/migrations/005-agentic-llm-daily-usage.sql"), initializer.indexOf("lib/db/migrations/006-agentic-llm-rate-limit-headers.sql"), initializer.indexOf("lib/db/migrations/007-agentic-llm-attempt-context.sql"), initializer.indexOf("lib/db/migrations/008-contact-semantic-scores-unassessed.sql"), initializer.indexOf('echo "[apex-schema] verifying required Apex durable tables and invariants..."')]; return p.every((value) => value >= 0) && p.every((value, index) => index === 0 || p[index - 1] < value) && String(dbPackage.scripts?.harden ?? "").includes("001-apex-invariants.sql"); })()],
];
for (const [label, ok] of sourceAssertions) { if (!ok) { console.error(`SOURCE PARITY FAIL: ${label}`); failed = true; } }
if (failed) process.exit(1);
console.log("SOURCE MIGRATION HARDENER PARITY: PASS — build/test are source-first, canonical cancellation is source-native, committed migrations run in explicit order, and retired legacy surfaces are absent");
