#!/usr/bin/env node
import fs from "node:fs";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, "utf8");
const packageJson = JSON.parse(read("artifacts/api-server/package.json"));
const both = `${String(packageJson.scripts?.build ?? "")}\n${String(packageJson.scripts?.test ?? "")}`;
const rootPackage = JSON.parse(read("package.json"));
const bureau = String(rootPackage.scripts?.["check:bureau"] ?? "");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const finalReview = read("artifacts/api-server/src/src/lib/ai-extractor.ts");

const retiredHardeners = [
  "apply-retire-secondary-surface-calls.mjs",
  "apply-agentic-registry-signal-wiring.mjs",
  "apply-registry-cancellation-boundary.mjs",
];
let failed = false;
for (const hardener of retiredHardeners) {
  if (both.includes(hardener)) {
    console.error(`MIGRATION PARITY FAIL: source mutator remains in API build/test: ${hardener}`);
    failed = true;
  }
}

const sourceAssertions = [
  ["free-ReAct source contains no forced opening instruction", !/Begin\. Choose an initial web_search query/i.test(agentic) && !/\(none — begin with web_search\)/i.test(agentic)],
  ["canonical final review source contains no Groq reviewer fallback", !/groq-final-review-fallback/i.test(finalReview) && !/Groq capacity fallback/i.test(finalReview)],
  ["registry cancellation has a dedicated invariant gate", both.includes("check-agentic-registry-signal.mjs") && bureau.includes("check:agentic-registry-signal")],
];
for (const [label, ok] of sourceAssertions) {
  if (!ok) {
    console.error(`SOURCE PARITY FAIL: ${label}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("SOURCE MIGRATION HARDENER PARITY: PASS — build/test are source-first and remaining migrations have dedicated gates");
