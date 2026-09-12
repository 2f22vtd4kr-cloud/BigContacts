import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const forbidden = [
  /google(?:Search|SearchQuery)/i,
  /bing(?:Search|SearchQuery)/i,
  /duckduckgo/i,
  /searchSequence/i,
  /toolSequence/i,
  /providerSequence/i,
  /nextTool\s*:/i,
  /fixedSearch/i,
];
const failures = forbidden.filter((pattern) => pattern.test(source)).map(String);
if (failures.length) {
  console.error("DETERMINISTIC RESEARCH STRATEGY: FAIL");
  for (const failure of failures) console.error(`- forbidden strategy pattern ${failure}`);
  process.exit(1);
}
console.log("DETERMINISTIC RESEARCH STRATEGY: PASS");
