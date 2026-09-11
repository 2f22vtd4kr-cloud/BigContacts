#!/usr/bin/env node
import fs from "node:fs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, "utf8");

const packageJson = JSON.parse(read("artifacts/api-server/package.json"));
const build = String(packageJson.scripts?.build ?? "");
const test = String(packageJson.scripts?.test ?? "");
const both = `${build}\n${test}`;

const migrationHardeners = [
  "apply-free-react-opening-repair.mjs",
  "apply-final-review-role-boundary.mjs",
  "apply-retire-secondary-surface-calls.mjs",
  "apply-investigator-identity-observation-boundary.mjs",
  "apply-registry-cancellation-boundary.mjs",
  "apply-agentic-registry-signal-wiring.mjs",
  "apply-retire-deterministic-atlas-osint.mjs",
  "apply-retire-legacy-atlas-launch.mjs",
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

// A migration hardener is allowed only while its corresponding source defect is
// still present. This prevents a future build from silently relying on a stale
// mutation script after the source has already been repaired.
for (const hardener of migrationHardeners) {
  const referenced = both.includes(hardener);
  if (!referenced) continue;
  const sourceDefectStillPresent =
    hardener === "apply-free-react-opening-repair.mjs"
      ? sourceChecks[0][2].some((pattern) => pattern.test(read(sourceChecks[0][1])))
      : hardener === "apply-final-review-role-boundary.mjs"
        ? sourceChecks[1][2].some((pattern) => pattern.test(read(sourceChecks[1][1])))
        : true;

  if (!sourceDefectStillPresent && (hardener === "apply-free-react-opening-repair.mjs" || hardener === "apply-final-review-role-boundary.mjs")) {
    console.error(`STALE MIGRATION HARDENER: ${hardener} is still invoked even though its source defect is absent.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("SOURCE MIGRATION HARDENER PARITY: PASS");
