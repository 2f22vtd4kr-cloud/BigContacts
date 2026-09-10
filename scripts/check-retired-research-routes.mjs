import fs from "node:fs";

const canonicalStartup = fs.readFileSync("artifacts/api-server/src/src/lib/startup.ts", "utf8");
const legacyStartup = fs.readFileSync("artifacts/api-server/src/lib/startup.ts", "utf8");
const jobs = fs.readFileSync("artifacts/apex-finder/src/pages/jobs.tsx", "utf8");
const secondaryPersist = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist.ts", "utf8");

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
    console.log(`INFO legacy duplicate startup still references retired route: ${route}`);
  }
}

// Route retirement is not enough when the operator UI still exposes the old control plane
// under task IDs/labels rather than literal API URLs.
const retiredUiTasks = ["sync-hot-flags", "deep-web-osint", "bulk-hybrid-research", "bulk-mcts"];
for (const task of retiredUiTasks) {
  if (jobs.includes(task)) {
    console.log(`FAIL retired research task remains advertised by operator UI: ${task}`);
    failed = true;
  } else {
    console.log(`PASS retired research task absent from operator UI: ${task}`);
  }
}

// A retired deterministic research function must not remain an automatic research control
// plane merely because its old HTTP route has been removed. Keep this gate intentionally
// source-level and conservative: the implementation itself is allowed to exist for
// quarantine/compatibility, but live application callers are forbidden.
const secondarySurfaceSources = [
  "artifacts/api-server/src/src/routes/entities.ts",
  "artifacts/api-server/src/src/routes/research/cases.ts",
  "artifacts/api-server/src/src/lib/atlas-orchestrator.ts",
];
for (const file of secondarySurfaceSources) {
  const source = fs.readFileSync(file, "utf8");
  if (/\bexpandSecondaryPublicSurface\s*\(/.test(source)) {
    console.log(`FAIL deterministic secondary research remains callable from live source: ${file}`);
    failed = true;
  } else {
    console.log(`PASS no secondary research caller: ${file}`);
  }
}

// The secondary surface is a research control plane. If it survives quarantine, its own
// implementation must not contain an independent outbound HTTP transport. This catches
// direct fetch() usage inside the function without outlawing unrelated persistence helpers.
const secondaryFn = secondaryPersist.match(/export async function expandSecondaryPublicSurface\s*\([\s\S]*?(?=\nexport |\nasync function |\nfunction |$)/)?.[0] ?? "";
if (/\bfetch\s*\(/.test(secondaryFn)) {
  console.log("FAIL expandSecondaryPublicSurface contains a direct outbound fetch; surviving web I/O must use canonical SSRF-safe transport.");
  failed = true;
} else {
  console.log("PASS secondary surface contains no independent fetch transport.");
}

if (failed) process.exit(1);