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
  ["explicit schema initialization applies committed migrations in order", (() => { const p = [initializer.indexOf('if [[ "${APEX_ALLOW_SCHEMA_PUSH:-false}" != "true" ]]'), initializer.indexOf("pnpm --filter @workspace/db run push"), initializer.indexOf("pnpm --filter @workspace/db run harden"), initializer.indexOf("lib/db/migrations/002-contact-outcome.sql"), initializer.indexOf("lib/db/migrations/003-atlas-review-candidate-type.sql"), initializer.indexOf("lib/db/migrations/004-registry-candidate-truth.sql"), initializer.indexOf('echo "[apex-schema] verifying required Apex durable tables and invariants..."')]; return p.every((value) => value >= 0) && p.every((value, index) => index === 0 || p[index - 1] < value) && String(dbPackage.scripts?.harden ?? "").includes("001-apex-invariants.sql"); })()],
];
for (const [label, ok] of sourceAssertions) { if (!ok) { console.error(`SOURCE PARITY FAIL: ${label}`); failed = true; } }
if (failed) process.exit(1);
console.log("SOURCE MIGRATION HARDENER PARITY: PASS — build/test are source-first, canonical cancellation is source-native, committed migrations run in explicit order, and retired legacy surfaces are absent");
