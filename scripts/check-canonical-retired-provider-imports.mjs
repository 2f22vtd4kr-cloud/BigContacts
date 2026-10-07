import fs from "node:fs";
import path from "node:path";

const roots = [
  "artifacts/api-server/src/src/routes",
  "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
  "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts",
  "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
  "artifacts/api-server/src/src/lib/target-contact-agent.ts",
  "artifacts/api-server/src/src/lib/target-act-oversight.ts",
  "artifacts/api-server/src/src/lib/atlas-control-decision.ts",
  "artifacts/api-server/src/src/lib/target-control-decision.ts",
];
const failures = [];

function inspect(file) {
  const source = fs.readFileSync(file, "utf8");
  if (/(?:from|import\\s*\\(|require\\s*\\()\\s*["'][^"']*(?:gemini|mistral)[^"']*["']/i.test(source)) {
    failures.push(file);
  }
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test" || entry.name === "tests") continue;
      walk(full);
    } else if (/\\.(?:ts|tsx|mts|mjs|js)$/.test(entry.name)) inspect(full);
  }
}
for (const root of roots) {
  if (fs.statSync(root).isDirectory()) walk(root);
  else inspect(root);
}
if (failures.length) {
  console.error("CANONICAL RETIRED PROVIDER IMPORTS: FAIL");
  for (const file of failures) console.error("- " + file);
  process.exit(1);
}
console.log("CANONICAL RETIRED PROVIDER IMPORTS: PASS");
