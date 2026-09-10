import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guard = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts"), "utf8");
const routes = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/index.ts"), "utf8");

const retiredRoutes = [
  "web-osint-enrich",
  "in-house-enrich",
  "social-discovery",
  "messenger-discovery",
  "foundation-filings",
  "companies-house-enrich",
  "occrp",
  "deep-web-osint",
];

const checks = [
  ["guard names all retired legacy enrichment routes", retiredRoutes.every((p) => guard.includes(`\"/ingest/${p}\"`))],
  ["legacy routes return explicit 410", guard.includes('res.status(410).json({') && guard.includes("Legacy enrichment route retired.")],
  ["guard blocks Apex entity types on generic enrich routes", guard.includes('["HNWI", "Gatekeeper"]')],
  ["guard rejects unscoped generic legacy enrichment", guard.includes("Legacy enrichment requires an explicit non-Apex target scope")],
  ["guard queries concrete entity IDs before allowing generic mutation", guard.includes("inArray(entitiesTable.id, entityIds)")],
  ["guard is mounted before ingest routes", routes.indexOf("legacyApexMutationGuard") < routes.indexOf("ingestRouter")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);