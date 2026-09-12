import fs from "node:fs";
import path from "node:path";

const root = "artifacts/api-server/src/src";
const failures = [];
const retiredLegacyModules = new Set(["agent-orchestrator","deep-web-osint","web-osint-enricher","web-enricher","mcts-agent","research-cascade","final-target-review"]);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test" || entry.name === "tests") continue;
      walk(full);
      continue;
    }
    if (!/\.(?:ts|tsx|mjs|mts)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    for (const match of source.matchAll(/(?:from|import\s*\()\s*["']\.\.\/\.\.\/lib\/([^"'/]+)["']/g)) {
      const moduleName = match[1].replace(/\.(?:mjs|mts|ts|tsx)$/, "");
      if (retiredLegacyModules.has(moduleName)) failures.push(`${full} imports retired legacy module ../../lib/${moduleName}`);
    }
  }
}

walk(root);
const retiredLegacyRoutes = ["artifacts/api-server/src/src/routes/research/cases.ts"];
for (const route of retiredLegacyRoutes) if (fs.existsSync(route)) failures.push(`${route} (retired legacy research route still exists)`);
if (failures.length) throw new Error(`Canonical API source imports or retains retired legacy research sources: ${failures.join(", ")}`);
console.log("Canonical API source has no imports into retired legacy research modules; shared infrastructure imports remain allowed and the explicitly retired cases route is absent.");
