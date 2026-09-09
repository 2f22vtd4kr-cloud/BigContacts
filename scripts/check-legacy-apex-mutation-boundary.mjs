import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guard = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts"), "utf8");
const routes = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/index.ts"), "utf8");

const checks = [
  ["guard names all legacy contact-mutating routes", ["web-osint-enrich", "in-house-enrich", "social-discovery", "messenger-discovery", "foundation-filings"].every((p) => guard.includes(p))],
  ["guard blocks Apex entity types", guard.includes('["HNWI", "Gatekeeper"]')],
  ["guard rejects unscoped legacy enrichment", guard.includes("Legacy enrichment requires an explicit non-Apex target scope")],
  ["guard queries concrete entity IDs before allowing mutation", guard.includes("inArray(entitiesTable.id, entityIds)")],
  ["guard is mounted before ingest routes", routes.indexOf("legacyApexMutationGuard") < routes.indexOf("ingestRouter")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
