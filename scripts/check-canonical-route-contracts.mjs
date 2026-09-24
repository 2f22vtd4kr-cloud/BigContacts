#!/usr/bin/env node
import fs from "node:fs";

const routes = fs.readFileSync("artifacts/api-server/src/src/routes/index.ts", "utf8");
const relationships = fs.readFileSync("artifacts/api-server/src/src/routes/relationships.ts", "utf8");
const profile = fs.readFileSync("artifacts/apex-finder/src/pages/profile.tsx", "utf8");
const router = fs.readFileSync("artifacts/apex-finder/src/router.tsx", "utf8");
const authGate = fs.readFileSync("artifacts/apex-finder/src/components/operator-auth-gate.tsx", "utf8");
const systemStatus = fs.readFileSync("artifacts/api-server/src/src/routes/system-status.ts", "utf8");
const logger = fs.readFileSync("artifacts/api-server/src/src/lib/logger.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/import relationshipsRouter from "\.\/relationships";/.test(routes), "relationships router import is missing");
assert(/router\.use\(relationshipsRouter\);/.test(routes), "relationships router is not mounted");
assert(/router\.get\("\/relationships"/.test(relationships), "relationship list endpoint is missing");
assert(/router\.post\("\/relationships"/.test(relationships), "relationship create endpoint is missing");
assert(/router\.delete\("\/relationships\/:id"/.test(relationships), "relationship delete endpoint is missing");
assert(!/\bfetch\s*\(/.test(relationships), "mounted relationship router must not bypass the safe outbound transport");
assert(/safeOutboundFetch\(/.test(relationships), "mounted relationship router must use safe outbound transport");
assert(/useListRelationships\(/.test(profile), "profile relationship consumer is missing");

const retired = [
  "/api/ingest/" + "atlas-status",
  "/api/ingest/" + "web-osint-enrich",
  "/api/entities/" + "rehydrate-contacts",
  "/api/entities/" + "refresh-surface",
];
for (const route of retired) {
  assert(!profile.includes(route), `profile still calls retired endpoint: ${route}`);
}

assert(/<OperatorAuthGate>/.test(router), "desk is not wrapped in the operator session gate");
assert(/fetch\("\/api\/auth\/session"/.test(authGate), "operator session probe is missing");
assert(/fetch\("\/api\/auth\/login"/.test(authGate), "operator login flow is missing");
assert(/credentials:\s*["']same-origin["']/.test(authGate), "operator auth requests must use same-origin credentials");
assert(/pythonTools/.test(systemStatus), "canonical system status does not expose Python tool health");
assert(/process\.env\.LOG_LEVEL \?\? \(isProduction \? "info" : "silent"\)/.test(logger), "development logger is not silent");

if (failures.length) {
  console.error("CANONICAL ROUTE CONTRACTS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ROUTE CONTRACTS: PASS");
