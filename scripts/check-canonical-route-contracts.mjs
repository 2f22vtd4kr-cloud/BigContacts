#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const routes = read("artifacts/api-server/src/src/routes/index.ts");
const relationships = read("artifacts/api-server/src/src/routes/relationships.ts");
const auth = read("artifacts/api-server/src/src/routes/auth.ts");
const operatorGate = read("artifacts/apex-finder/src/components/operator-gate.tsx");
const frontendRoot = "artifacts/apex-finder/src";
const frontendFiles = walk(frontendRoot).filter((file) => /\.(?:ts|tsx)$/.test(file));
const workflowFiles = walk(".github/workflows").filter((file) => /\.(?:yml|yaml)$/.test(file));

assert(/import relationshipsRouter from "\.\/relationships";/.test(routes), "relationships router import is missing");
assert(/router\.use\(relationshipsRouter\);/.test(routes), "relationships router is not mounted");
assert(/router\.get\("\/relationships"/.test(relationships), "relationship list endpoint is missing");
assert(/router\.post\("\/relationships"/.test(relationships), "relationship create endpoint is missing");
assert(/router\.delete\("\/relationships\/:id"/.test(relationships), "relationship delete endpoint is missing");
assert(!/\bfetch\s*\(/.test(relationships), "mounted relationship router must not bypass the safe outbound transport");
assert(/safeOutboundFetch\(/.test(relationships), "mounted relationship router must use safe outbound transport");
assert(frontendFiles.some((file) => read(file).includes("useListRelationships(")), "frontend has no relationship consumer");

// The browser gate must consume the existing server-side password/session contract.
assert(/router\.get\("\/auth\/session"/.test(auth), "operator session endpoint is missing");
assert(/configured\s*=\s*Boolean\(/.test(auth), "operator session endpoint does not expose auth configuration state");
assert(/\/auth\/session/.test(operatorGate), "operator gate does not check the canonical session endpoint");
assert(/\/auth\/login/.test(operatorGate), "operator gate does not use the canonical login endpoint");
assert(/credentials:\s*"same-origin"/.test(operatorGate), "operator gate must send the HttpOnly session cookie");

// Retired control-plane routes are forbidden in executable frontend code and live/manual workflows.
const retiredRoutes = [
  "/api/ingest/atlas-status",
  "/api/ingest/web-osint-enrich",
  "/api/entities/rehydrate-contacts",
  "/api/entities/refresh-surface",
];
for (const route of retiredRoutes) {
  for (const file of [...frontendFiles, ...workflowFiles]) {
    const content = read(file);
    assert(!content.includes(route), `${file} still references retired endpoint ${route}`);
  }
}

// Canonical launch must never be replaced by a retired control-plane launch route.
for (const file of workflowFiles) {
  const content = read(file);
  assert(!content.includes("/api/atlas/launch"), `${file} references retired Atlas launch route`);
  assert(!content.includes("/api/atlas/start"), `${file} references retired Atlas start route`);
}

if (failures.length) {
  console.error("CANONICAL ROUTE CONTRACTS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ROUTE CONTRACTS: PASS");
