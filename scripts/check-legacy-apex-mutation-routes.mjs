import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guard = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts"), "utf8");
const migrations = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/ingest-migrations.ts"), "utf8");

const requiredGuardedRoutes = [
  "companies-house-enrich",
  "occrp",
  "deep-web-osint",
];

const checks = [
  ["expanded legacy routes are guarded", requiredGuardedRoutes.every((p) => guard.includes(`/ingest/${p}`))],
  ["guard blocks Apex entity types", guard.includes('["HNWI", "Gatekeeper"]')],
  ["guard rejects unscoped legacy enrichment", guard.includes("Legacy enrichment requires an explicit non-Apex target scope")],
  ["guard checks concrete entity IDs", guard.includes("inArray(entitiesTable.id, entityIds)")],
  ["EDGAR Apex identity migration is retired", migrations.includes('EDGAR name normalization for HNWI/Gatekeeper entities is retired')],
  ["heuristic hot-flag migration is retired", migrations.includes('Hot-flag heuristics are retired; isHot is not a deterministic research selector')],
  ["entity-type migration excludes Apex entities", migrations.includes("entitiesTable.type} NOT IN ('HNWI', 'Gatekeeper')")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
