#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("artifacts/api-server/src/src");
const failures = [];
const allowedEntityInserters = new Set([
  "routes/entities.ts",
  "lib/canonical-atlas-discovery.ts",
]);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test" || entry.name === "tests") continue;
      walk(full);
      continue;
    }
    if (!/\.ts$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    if (!source.includes("entitiesTable") || !/db\.insert\(entitiesTable\)/.test(source)) continue;
    const relative = path.relative(root, full).replaceAll(path.sep, "/");
    if (!allowedEntityInserters.has(relative)) failures.push(`${relative}: direct entitiesTable insert is outside the canonical writer allowlist`);
  }
}
walk(root);

const legacyDiscovery = fs.readFileSync("artifacts/api-server/src/lib/enrichment/broad-discovery.ts", "utf8");
const canonicalImporters = [];
function walkCanonical(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test" || entry.name === "tests") continue;
      walkCanonical(full);
      continue;
    }
    if (!/\.(?:ts|tsx|mjs|mts)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    if (source.includes("broad-discovery")) canonicalImporters.push(full);
  }
}
walkCanonical(root);
if (canonicalImporters.length) failures.push(`canonical source reaches legacy broad-discovery: ${canonicalImporters.join(", ")}`);
if (legacyDiscovery.includes("db.insert(entitiesTable)") && canonicalImporters.length) failures.push("legacy broad-discovery still contains an entity writer and is reachable from canonical source");

if (failures.length) throw new Error(`Canonical entity-writer boundary failed:\n${failures.join("\n")}`);
console.log("Canonical entity-writer boundary: only explicit manual CRUD and canonical discovery admission write entities; legacy broad-discovery is unreachable.");
