import fs from "node:fs";

const route = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts", "utf8");
const control = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const researchRouter = fs.readFileSync("artifacts/api-server/src/src/routes/research.ts", "utf8");

const canonicalMount = 'router.use(canonicalCaseDiscoveryRouter)';
const legacyMount = 'router.use(legacyCaseExecutionRetirementRouter)';
const checks = [
  ["case discovery route delegates to canonical Atlas control plane", route.includes('runCanonicalAtlasPipeline')],
  ["case discovery route is HTTP/lifecycle-only", !/runGeminiBossDiscovery|runDeepSeekFreeJson|runBureauAgenticWebPass|persistSourceBackedBureauContactsForEntity/.test(route)],
  ["case discovery route passes an existing durable case", route.includes('discoveryCaseId: caseId')],
  ["case discovery route requests discovery-only execution", route.includes('discoveryOnly: true')],
  ["canonical Atlas control plane owns Gemini assignment", control.includes('runGeminiBossDiscovery')],
  ["canonical Atlas control plane owns Investigator execution", control.includes('runBureauAgenticWebPass')],
  ["canonical Atlas control plane supports an existing discovery case", control.includes('discoveryCaseId?: number')],
  ["canonical Atlas control plane has a discovery-only mode", control.includes('discoveryOnly?: boolean')],
  ["discovery uses first-class empty target rather than Discovery slot", !control.includes('targetName: "Discovery slot"')],
  ["discovery identity admission no longer creates synthetic contact evidence", !control.includes('value: `person:${name}`')],
  ["discovery admission requires candidate scope", control.includes('f.scope === "candidate"')],
  ["discovery admission requires successful observed HTTP provenance", control.includes('f.sourceUrls.some(isObservedHttpSource)')],
  ["canonical route is mounted before retired legacy execution routes", researchRouter.indexOf(canonicalMount) >= 0 && researchRouter.indexOf(legacyMount) >= 0 && researchRouter.indexOf(canonicalMount) < researchRouter.indexOf(legacyMount)],
  ["research router no longer mounts the retired casesRouter", !/router\.use\(casesRouter\)/.test(researchRouter)],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SINGLE CANONICAL DISCOVERY CONTROL PLANE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SINGLE CANONICAL DISCOVERY CONTROL PLANE: PASS");
for (const [name] of checks) console.log(`- ${name}`);