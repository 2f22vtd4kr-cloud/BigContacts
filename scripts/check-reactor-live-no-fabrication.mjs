import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bureau = path.join(root, "artifacts", "apex-finder", "src", "components", "bureau-ops-stage.tsx");
const model = path.join(root, "artifacts", "apex-finder", "src", "lib", "reactor-live-model.ts");

for (const file of [bureau, model]) {
  if (!fs.existsSync(file)) throw new Error(`Missing Reactor Live source: ${file}`);
}

const bureauText = fs.readFileSync(bureau, "utf8");
const modelText = fs.readFileSync(model, "utf8");

const forbiddenSyntheticQuery = /return\s+e\.targetName\s*\?\s*`\$\{e\.targetName\}\s+contact\s+email\s+phone`/;
const explicitQueryContract = /explicitResearchQuery[\s\S]*?Deliberately no target-name fallback/;

if (forbiddenSyntheticQuery.test(bureauText)) {
  console.error("FAIL  BureauOpsStage still fabricates a search query from targetName");
  console.error("      A browser/search scene must only display an actually recorded query.");
  process.exit(1);
}

if (!explicitQueryContract.test(modelText)) {
  console.error("FAIL  Reactor Live model is missing the explicit-query/no-fallback contract");
  process.exit(1);
}

console.log("PASS  no synthetic target-name query fallback");
console.log("PASS  explicit research-query contract present");
console.log("\nReactor Live no-fabrication gate passed.");
