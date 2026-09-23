#!/usr/bin/env node
import fs from "node:fs";

const routes = fs.readFileSync("artifacts/api-server/src/src/routes/index.ts", "utf8");
const relationships = fs.readFileSync("artifacts/api-server/src/src/routes/relationships.ts", "utf8");
const frontend = fs.readFileSync("artifacts/apex-finder/src/pages/profile.tsx", "utf8");
const relationships = fs.readFileSync("artifacts/api-server/src/src/routes/relationships.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/import relationshipsRouter from "\.\/relationships";/.test(routes), "relationships router import is missing");
assert(/router\.use\(relationshipsRouter\);/.test(routes), "relationships router is not mounted");
assert(/router\.get\("\/relationships"/.test(relationships), "relationship list endpoint is missing");
assert(/router\.post\("\/relationships"/.test(relationships), "relationship create endpoint is missing");
assert(/router\.delete\("\/relationships\/:id"/.test(relationships), "relationship delete endpoint is missing");
assert(!/\\bfetch\\s*\\(/.test(relationships), "mounted relationship router must not bypass the safe outbound transport");
assert(/safeOutboundFetch\(/.test(relationships), "mounted relationship router must use safe outbound transport");
assert(/useListRelationships\(/.test(frontend), "profile relationship consumer is missing");

for (const retired of ["/api/ingest/atlas-status", "/api/ingest/web-osint-enrich", "/api/entities/rehydrate-contacts", "/api/entities/refresh-surface"]) {
  assert(!frontend.includes(retired), `profile still calls retired endpoint: ${retired}`);
}

if (failures.length) {
  console.error("CANONICAL ROUTE CONTRACTS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ROUTE CONTRACTS: PASS");
