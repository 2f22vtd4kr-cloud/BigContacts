import fs from "node:fs";
import path from "node:path";

const roots = [
  "artifacts/apex-finder/src",
  ".github/workflows",
  "scripts",
];

const forbidden = [
  "/api/ingest/atlas-status",
  "/api/ingest/web-osint-enrich",
  "/api/entities/rehydrate-contacts",
  "/api/entities/refresh-surface",
];

const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".yml", ".yaml", ".sh"]);
const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, "utf8");
      for (const token of forbidden) {
        if (text.includes(token)) hits.push({ file: full, token });
      }
    }
  }
}

for (const root of roots) walk(root);

if (hits.length) {
  for (const hit of hits) console.error(`FAIL retired API contract reference: ${hit.token} in ${hit.file}`);
  process.exit(1);
}
console.log("PASS no retired Atlas/enrichment API contracts remain in executable frontend, workflow, or script source.");
