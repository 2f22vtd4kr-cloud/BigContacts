import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = [
  "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
  "artifacts/api-server/src/src/lib/agentic-web-research-core.ts",
  "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
  "artifacts/api-server/src/src/lib/target-contact-agent.ts",
  "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts",
];
const source = paths.map((relative) => `\\n--- ${relative} ---\\n${fs.readFileSync(path.join(root, relative), "utf8")}`).join("\\n");
const forbidden = [
  /google(?:Search|SearchQuery)/i,
  /bing(?:Search|SearchQuery)/i,
  /duckduckgo/i,
  /searchSequence/i,
  /toolSequence/i,
  /providerSequence/i,
  /nextTool\s*:/i,
  /fixedSearch/i,
  /assessResearchMove/i,
  /atlas-research-strategy/i,
  /_atlasStrategy(?:Score|Rationale)/i,
];
const failures = forbidden.filter((pattern) => pattern.test(source)).map(String);
if (failures.length) {
  console.error("DETERMINISTIC RESEARCH STRATEGY: FAIL");
  for (const failure of failures) console.error(`- forbidden strategy pattern ${failure}`);
  process.exit(1);
}
console.log("DETERMINISTIC RESEARCH STRATEGY: PASS");
