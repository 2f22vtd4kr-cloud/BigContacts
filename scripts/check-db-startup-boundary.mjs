#!/usr/bin/env node
import fs from "node:fs";

const index = fs.readFileSync("lib/db/src/index.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("lib/db/package.json", "utf8"));
const migration = fs.readFileSync("lib/db/migrations/001-apex-invariants.sql", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(!/ensureResearchCaseEventsImmutable|pg_advisory_xact_lock|ALTER TABLE|CREATE TRIGGER/.test(index), "database module import must not perform hardening DDL/scans");
assert(typeof pkg.scripts?.harden === "string" && pkg.scripts.harden.includes("001-apex-invariants.sql"), "explicit database hardening command is missing");
assert(/BEGIN;/.test(migration) && /COMMIT;/.test(migration), "hardening migration must be transactional");
assert(/research_case_events/.test(migration) && /apex_research_case_events_replay_integrity/.test(migration), "hardening migration must preserve research ledger invariants");
assert(/apex_research_case_events_immutable/.test(migration) && /apex_research_case_cancellation_fence/.test(migration), "hardening migration must preserve immutable ledger and cancellation fences");

if (failures.length) {
  console.error("DB STARTUP BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("DB STARTUP BOUNDARY: PASS");
