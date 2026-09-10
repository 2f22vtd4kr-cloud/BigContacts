import fs from "node:fs";

const canonicalStartup = fs.readFileSync("artifacts/api-server/src/src/lib/startup.ts", "utf8");
const legacyStartup = fs.readFileSync("artifacts/api-server/src/lib/startup.ts", "utf8");
const jobs = fs.readFileSync("artifacts/apex-finder/src/pages/jobs.tsx", "utf8");

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

if (failed) process.exit(1);
