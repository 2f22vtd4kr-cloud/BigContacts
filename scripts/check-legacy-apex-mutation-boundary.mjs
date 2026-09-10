import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guard = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts"), "utf8");
const routes = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/index.ts"), "utf8");
const migrations = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/ingest-migrations.ts"), "utf8");

const checks = [
  ["guard names all legacy contact-mutating routes", ["web-osint-enrich", "in-house-enrich", "social-discovery", "messenger-discovery", "foundation-filings", "companies-house-enrich"].every((p) => guard.includes(p))],
  ["guard blocks Apex entity types", guard.includes('["HNWI", "Gatekeeper"]')],
  ["guard rejects unscoped legacy enrichment", guard.includes("Legacy enrichment requires an explicit non-Apex target scope")],
  ["guard queries concrete entity IDs before allowing mutation", guard.includes("inArray(entitiesTable.id, entityIds)")],
  ["guard is mounted before ingest routes", routes.indexOf("legacyApexMutationGuard") < routes.indexOf("ingestRouter")],
  ["deterministic EDGAR Apex identity migration is retired", migrations.includes('res.status(410).json') && migrations.includes('EDGAR name normalization for HNWI/Gatekeeper entities is retired')],
  ["heuristic hot-flag migration is retired", migrations.includes('Hot-flag heuristics are retired; isHot is not a deterministic research selector')],
  ["entity-type migration excludes Apex entities", migrations.includes("entitiesTable.type} NOT IN ('HNWI', 'Gatekeeper')")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);