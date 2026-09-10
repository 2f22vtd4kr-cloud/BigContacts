import fs from "node:fs";

const startup = fs.readFileSync("artifacts/api-server/src/lib/startup.ts", "utf8");
const jobs = fs.readFileSync("artifacts/apex-finder/src/pages/jobs.tsx", "utf8");

const retired = [
  "/api/ingest/deep-web-osint",
  "/api/ingest/sync-hot-flags",
  "/api/research/bulk-run",
];

let failed = false;
for (const route of retired) {
  const inStartup = startup.includes(route);
  const inUi = jobs.includes(route);
  if (inStartup || inUi) {
    console.log(`FAIL retired research route remains reachable from ${inStartup ? "startup" : "UI"}: ${route}`);
    failed = true;
  } else {
    console.log(`PASS retired research route absent from startup/UI: ${route}`);
  }
}

if (failed) process.exit(1);
