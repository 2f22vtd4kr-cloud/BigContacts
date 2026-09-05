#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const target = read("artifacts/api-server/src/src/lib/target-contact-agent.ts");
const bureau = read("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
const strict = read("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
const discovery = read("artifacts/api-server/src/src/lib/discovery-agent.ts");

const checks = [
  ["target Dig uses strict persistence", target.includes("persistSourceBackedBureauContactsForEntity")],
  ["target Dig does not legacy-rehydrate", !target.includes("rehydrateEntityCardFromEvidence")],
  ["target Dig is marked canonical agentic evidence", target.includes('"target-contact-agentic"')],
  ["bureau pass uses strict persistence", bureau.includes("persistSourceBackedBureauContactsForEntity")],
  ["strict boundary rejects search-query provenance", strict.includes("SEARCH_QUERY_URL") && strict.includes("isClaimSourceUrl")],
  ["strict boundary fails closed without source", strict.includes("if (!sourceUrls.length) continue")],
  ["discovery requires model findings", discovery.includes("modelFindings")],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`Canonical promotion boundary failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`Canonical promotion boundary: ${checks.length}/${checks.length} checks passed`);
