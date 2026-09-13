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
  "broad-discovery",
];

const guardIndex = routes.indexOf("router.use(legacyApexMutationGuard)");
const healthIndex = routes.indexOf("router.use(healthRouter)");
const ingestIndex = routes.indexOf("router.use(ingestRouter)");

const checks = [
  ["guard names all retired legacy enrichment routes", retiredRoutes.every((p) => guard.includes(`\"/ingest/${p}\"`))],
  ["deterministic contact rehydration is retired", guard.includes('"/entities/rehydrate-contacts"')],
  ["legacy routes return explicit 410", guard.includes('res.status(410).json({') && guard.includes("Legacy enrichment route retired.")],
  ["guard blocks Apex entity types on generic enrich routes", /APEX_TYPES\s*=\s*new Set\(\[\s*"HNWI"\s*,\s*"Gatekeeper"\s*\]\)/.test(guard)],
  ["guard rejects unscoped generic legacy enrichment", guard.includes("Legacy enrichment requires an explicit non-Apex target scope")],
  ["guard queries concrete entity IDs before allowing generic mutation", /inArray\(entitiesTable\.id\s*,\s*entityIds\)/.test(guard)],
  ["guard is mounted after public health", healthIndex >= 0 && guardIndex > healthIndex],
  ["guard is mounted before ingest routes", guardIndex >= 0 && ingestIndex >= 0 && guardIndex < ingestIndex],
  ["canonical API does not mount deterministic extended OSINT router", !routes.includes('router.use(extendedOsintRouter)') && !routes.includes('import extendedOsintRouter from "./extended-osint"')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
