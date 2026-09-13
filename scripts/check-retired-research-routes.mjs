import fs from "node:fs";

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const canonicalStartup = read("artifacts/api-server/src/src/lib/startup.ts");
const startupRecovery = read("artifacts/api-server/src/src/lib/startup-recovery.ts");
const legacyStartup = read("artifacts/api-server/src/lib/startup.ts");
const jobs = read("artifacts/apex-finder/src/pages/jobs.tsx");
const secondaryPersist = read("artifacts/api-server/src/src/lib/bureau-contact-persist.ts");
const canonicalEnrichment = read("artifacts/api-server/src/src/routes/ingest-enrichment.ts");
const canonicalPipeline = read("artifacts/api-server/src/src/routes/ingest-pipeline.ts");
const canonicalResearchRoutes = read("artifacts/api-server/src/src/routes/research.ts");
const legacyMutationGuard = read("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts");
const entitiesRoute = read("artifacts/api-server/src/src/routes/entities.ts");
const retiredAtlasOrchestrator = "artifacts/api-server/src/src/lib/atlas-orchestrator.ts";

const retired = [
  "/api/ingest/deep-web-osint",
  "/api/ingest/broad-discovery",
  "/api/ingest/sync-hot-flags",
  "/api/research/bulk-run",
  "/api/research/bulk-hybrid-research",
];

let failed = false;
for (const route of retired) {
  const inCanonicalStartup = canonicalStartup.includes(route);
  const inLegacyStartup = legacyStartup.includes(route);
  const inUi = jobs.includes(route);
  if (inCanonicalStartup || inUi) {
    const surfaces = [inCanonicalStartup ? "canonical startup" : null, inUi ? "UI" : null].filter(Boolean).join(" + ");
    console.log(`FAIL retired research route remains reachable from ${surfaces}: ${route}`); failed = true;
  } else console.log(`PASS retired research route absent from canonical startup/UI: ${route}`);
  if (inLegacyStartup) { console.log(`FAIL deleted legacy startup still references retired route: ${route}`); failed = true; }
}

if (canonicalStartup) { console.log("FAIL retired canonical startup research scheduler still exists on disk."); failed = true; }
else console.log("PASS retired canonical startup research scheduler absent.");

if (/runBroadDiscovery|bulk-run|deep-web-osint|social-discovery|messenger-discovery|in-house-enrich/.test(startupRecovery)) {
  console.log("FAIL lifecycle-only startup recovery contains a research/enrichment trigger."); failed = true;
} else if (startupRecovery) console.log("PASS lifecycle-only startup recovery contains no research/enrichment trigger.");
else { console.log("FAIL lifecycle-only startup recovery module is missing."); failed = true; }

const retiredUiTasks = ["sync-hot-flags", "deep-web-osint", "bulk-hybrid-research", "bulk-mcts"];
for (const task of retiredUiTasks) {
  if (jobs.includes(task)) { console.log(`FAIL retired research task remains advertised by operator UI: ${task}`); failed = true; }
  else console.log(`PASS retired research task absent from operator UI: ${task}`);
}
if (/\bfetch\s*\(/.test(jobs) || /\bTrigger Task\b|\bonTrigger\b|\bJOB_DEFS\b/.test(jobs)) { console.log("FAIL workspace activity desk contains executable job-launcher logic."); failed = true; }
else console.log("PASS workspace activity desk contains no executable job-launcher logic.");

// The canonical route tree lives under src/src/routes. Check both the current
// path and the old path so this guard cannot silently miss a retired module after
// a source-layout migration.
const retiredControlPlaneFiles = [
  "artifacts/api-server/src/src/routes/research/mcts.ts",
  "artifacts/api-server/src/src/routes/research/bulk.ts",
  "artifacts/api-server/src/routes/research/mcts.ts",
  "artifacts/api-server/src/routes/research/bulk.ts",
];
for (const file of retiredControlPlaneFiles) {
  if (fs.existsSync(file)) { console.log(`FAIL retired deterministic research control-plane file still exists: ${file}`); failed = true; }
  else console.log(`PASS retired deterministic research control-plane file absent: ${file}`);
}

if (!/status\(410\)/.test(canonicalEnrichment)) { console.log("FAIL canonical ingest-enrichment router is not an explicit 410 quarantine."); failed = true; }
else console.log("PASS canonical ingest-enrichment router is explicitly quarantined with 410.");
if (/runBroadDiscovery|deepWebOsintEnrich|enrichInHouse|discoverSocialPresence|discoverMessengerPresence|lookupPublic|fetch\s*\(/.test(canonicalEnrichment)) { console.log("FAIL canonical ingest-enrichment quarantine contains active research/enrichment implementation."); failed = true; }
else console.log("PASS canonical ingest-enrichment quarantine contains no research implementation.");

if (!/router\.post\("\/ingest\/deep-web-osint",[\s\S]*status\(410\)/.test(canonicalPipeline)) { console.log("FAIL mounted ingest-pipeline still exposes a live deep-web research endpoint."); failed = true; }
else console.log("PASS mounted ingest-pipeline deep-web research endpoint is explicitly retired with 410.");
if (/deepWebOsintEnrich|summarizeAdaptiveResearch|adaptive-research-director/.test(canonicalPipeline)) { console.log("FAIL mounted ingest-pipeline still imports deterministic deep-web/adaptive research implementation."); failed = true; }
else console.log("PASS mounted ingest-pipeline contains no deterministic deep-web/adaptive research implementation.");

if (/from "\.\/research\/cases"|router\.use\(casesRouter\)/.test(canonicalResearchRoutes)) { console.log("FAIL canonical research router still imports or mounts legacy cases executor."); failed = true; }
else console.log("PASS canonical research router does not import or mount legacy cases executor.");

if (/\bexpandSecondaryPublicSurface\s*\(/.test(entitiesRoute)) {
  if (!legacyMutationGuard.includes("/entities/refresh-surface")) { console.log("FAIL secondary-surface endpoint remains callable without a retirement boundary."); failed = true; }
  else console.log("PASS secondary-surface endpoint is quarantined at the global mutation boundary.");
} else console.log("PASS no secondary research caller in entities route.");

if (fs.existsSync(retiredAtlasOrchestrator)) { console.log(`FAIL retired deterministic Atlas orchestrator still exists: ${retiredAtlasOrchestrator}`); failed = true; }
else console.log("PASS retired deterministic Atlas orchestrator removed from the API source tree.");

if (/\bfetch\s*\(/.test(secondaryPersist)) console.log("PASS legacy secondary helper retained only as unreachable compatibility source; no live caller remains.");
else console.log("PASS secondary helper contains no direct outbound fetch transport.");

if (failed) process.exit(1);
