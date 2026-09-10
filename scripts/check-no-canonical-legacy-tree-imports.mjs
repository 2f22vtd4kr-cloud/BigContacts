import fs from "node:fs";
import path from "node:path";

const root = "artifacts/api-server/src/src";
const failures = [];

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
    if (/from\s*["']\.\.\/\.\.\/lib\//.test(source) || /import\s*\(\s*["']\.\.\/\.\.\/lib\//.test(source)) {
      failures.push(full);
    }
  }
}

walk(root);
if (failures.length) {
  throw new Error(`Canonical API source imports legacy top-level src/lib tree: ${failures.join(", ")}`);
}
console.log("Canonical API source has no imports into the legacy top-level src/lib tree.");
