#!/usr/bin/env node
import fs from "node:fs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, "utf8");

const packageJson = JSON.parse(read("artifacts/api-server/package.json"));
const build = String(packageJson.scripts?.build ?? "");
const test = String(packageJson.scripts?.test ?? "");
const both = `${build}\n${test}`;

const migrationHardeners = [
  "apply-retire-secondary-surface-calls.mjs",
  "apply-registry-cancellation-boundary.mjs",
  "apply-agentic-registry-signal-wiring.mjs",
  "apply-retire-deterministic-atlas-osint.mjs",
  "apply-discovery-case-initial-action-state.mjs",
];

const sourceChecks = [
  [
    "free-ReAct source contains no forced opening instruction",
    "artifacts/api-server/src/src/lib/agentic-web-research-core.ts",
    [/Begin\. Choose an initial web_search query/i, /\(none — begin with web_search\)/i],
  ],
  [
    "canonical final review source contains no Groq reviewer fallback",
    "artifacts/api-server/src/src/lib/ai-extractor.ts",
    [/groq-final-review-fallback/i, /Groq capacity fallback/i],
  ],
];

let failed = false;
for (const [label, relativePath, forbiddenPatterns] of sourceChecks) {
  const source = read(relativePath);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      console.error(`SOURCE PARITY FAIL: ${label}: ${pattern}`);
      failed = true;
    }
  }
}

// Every hardener still present in the build/test scripts represents an active
// source migration. Repaired migrations are removed from both the pipeline and
// this inventory rather than retained as dormant source-mutating machinery.
for (const hardener of migrationHardeners) {
  if (!both.includes(hardener)) {
    console.error(`MIGRATION PARITY FAIL: active hardener ${hardener} is not wired into API build/test.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("SOURCE MIGRATION HARDENER PARITY: PASS");