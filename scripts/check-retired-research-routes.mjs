import fs from "node:fs";

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const canonicalStartup = read("artifacts/api-server/src/src/lib/startup.ts");
const startupRecovery = read("artifacts/api-server/src/src/lib/startup-recovery.ts");
const legacyStartup = read("artifacts/api-server/src/lib/startup.ts");
const jobs = read("artifacts/apex-finder/src/pages/jobs.tsx");
const secondaryPersist = read("artifacts/api-server/src/src/lib/bureau-contact-persist.ts");
const canonicalEnrichment = read("artifacts/api-server/src/src/routes/ingest-enrichment.ts");
const canonicalResearchRoutes = read("artifacts/api-server/src/src/routes/research.ts");

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
    const surfaces = [
      inCanonicalStartup ? "canonical startup" : null,
      inUi ? "UI" : null,
    ].filter(Boolean).join(" + ");
    console.log(`FAIL retired research route remains reachable from ${surfaces}: ${route}`);
    failed = true;
  } else {
    console.log(`PASS retired research route absent from canonical startup/UI: ${route}`);
  }
  if (inLegacyStartup) {
    console.log(`FAIL deleted legacy startup still references retired route: ${route}`);
    failed = true;
  }
}

if (canonicalStartup) {
  console.log("FAIL retired canonical startup research scheduler still exists on disk.");
  failed = true;
} else {
  console.log("PASS retired canonical startup research scheduler absent.");
}
if (/runBroadDiscovery|bulk-run|deep-web-osint|social-discovery|messenger-discovery|in-house-enrich/.test(startupRecovery)) {
  console.log("FAIL lifecycle-only startup recovery contains a research/enrichment trigger.");
  failed = true;
} else if (startupRecovery) {
  console.log("PASS lifecycle-only startup recovery contains no research/enrichment trigger.");
} else {
  console.log("FAIL lifecycle-only startup recovery module is missing.");
  failed = true;
}

const retiredUiTasks = ["sync-hot-flags", "deep-web-osint", "bulk-hybrid-research", "bulk-mcts"];
for (const task of retiredUiTasks) {
  if (jobs.includes(task)) {
    console.log(`FAIL retired research task remains advertised by operator UI: ${task}`);
    failed = true;
  } else {
    console.log(`PASS retired research task absent from operator UI: ${task}`);
  }
}

if (/\bfetch\s*\(/.test(jobs) || /\bTrigger Task\b|\bonTrigger\b|\bJOB_DEFS\b/.test(jobs)) {
  console.log("FAIL workspace activity desk contains executable job-launcher logic; research launch belongs to the canonical control plane.");
  failed = true;
} else {
  console.log("PASS workspace activity desk contains no executable job-launcher logic.");
}

const retiredControlPlaneFiles = [
  "artifacts/api-server/src/routes/research/mcts.ts",
  "artifacts/api-server/src/routes/research/bulk.ts",
];
for (const file of retiredControlPlaneFiles) {
  if (fs.existsSync(file)) {
    console.log(`FAIL retired deterministic research control-plane file still exists: ${file}`);
    failed = true;
  } else {
    console.log(`PASS retired deterministic research control-plane file absent: ${file}`);
  }
}

if (!/status\(410\)/.test(canonicalEnrichment)) {
  console.log("FAIL canonical ingest-enrichment router is not an explicit 410 quarantine.");
  failed = true;
} else {
  console.log("PASS canonical ingest-enrichment router is explicitly quarantined with 410.");
}
if (/runBroadDiscovery|deepWebOsintEnrich|enrichInHouse|discoverSocialPresence|discoverMessengerPresence|lookupPublic|fetch\s*\(/.test(canonicalEnrichment)) {
  console.log("FAIL canonical ingest-enrichment quarantine contains active research/enrichment implementation.");
  failed = true;
} else {
  console.log("PASS canonical ingest-enrichment quarantine contains no research implementation.");
}

// The legacy cases executor is now deliberately unmounted from the canonical research
// graph. Keep the source on disk temporarily for reachability/deletion work under #129/#138,
// but make the live-route invariant explicit here.
if (/from "\.\/research\/cases"|router\.use\(casesRouter\)/.test(canonicalResearchRoutes)) {
  console.log("FAIL canonical research router still imports or mounts legacy cases executor.");
  failed = true;
} else {
  console.log("PASS canonical research router does not import or mount legacy cases executor.");
}

// The secondary-surface function is still under active retirement. Only actual live callers
// are architectural failures; quarantined legacy source is tracked separately.
const secondarySurfaceSources = [
  "artifacts/api-server/src/src/routes/entities.ts",
  "artifacts/api-server/src/src/lib/atlas-orchestrator.ts",
];
for (const file of secondarySurfaceSources) {
  const source = read(file);
  if (/\bexpandSecondaryPublicSurface\s*\(/.test(source)) {
    console.log(`FAIL deterministic secondary research remains callable from live source: ${file}`);
    failed = true;
  } else {
    console.log(`PASS no secondary research caller: ${file}`);
  }
}

const secondaryFn = secondaryPersist.match(/export async function expandSecondaryPublicSurface\s*\([\s\S]*?(?=\nexport |\nasync function |\nfunction |$)/)?.[0] ?? "";
if (/\bfetch\s*\(/.test(secondaryFn)) {
  console.log("FAIL expandSecondaryPublicSurface contains a direct outbound fetch; surviving web I/O must use canonical SSRF-safe transport.");
  failed = true;
} else {
  console.log("PASS secondary surface contains no independent fetch transport.");
}

if (failed) process.exit(1);