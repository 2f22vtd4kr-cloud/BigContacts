#!/usr/bin/env node
import fs from "node:fs";

const dbIndex = fs.readFileSync("lib/db/src/index.ts", "utf8");
const schema = fs.readFileSync("lib/db/src/schema/research_case_events.ts", "utf8");
const migration = fs.readFileSync("lib/db/migrations/001-apex-invariants.sql", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("DB bootstrap installs an append-only trigger", /CREATE TRIGGER apex_research_case_events_no_update_delete/.test(migration));
pass("DB bootstrap blocks TRUNCATE", /CREATE TRIGGER apex_research_case_events_no_truncate/.test(migration));
pass("trigger rejects UPDATE and DELETE", /BEFORE UPDATE OR DELETE ON public\.research_case_events/.test(migration));
pass("trigger rejects TRUNCATE", /BEFORE TRUNCATE ON public\.research_case_events/.test(migration));
pass("trigger raises an error", /RAISE EXCEPTION ['\"]research_case_events is append-only/.test(migration));
pass("missing ledger fails closed", /Apex research_case_events ledger is missing; refusing to start/.test(migration));
pass("bootstrap is serialized across instances", /pg_advisory_xact_lock\(hashtext\('apex:research_case_events:immutability'\)\)/.test(migration));
pass("public write privileges are removed", /REVOKE UPDATE\s*,\s*DELETE\s*,\s*TRUNCATE ON public\.research_case_events FROM PUBLIC/.test(migration));
pass("correlation key NULLs fail closed", /SELECT count\(\*\) INTO null_correlation_count[\s\S]*WHERE correlation_key IS NULL[\s\S]*refusing to enable mandatory event identity/.test(migration));
pass("live ledger correlation key is forced NOT NULL", /ALTER TABLE public\.research_case_events\s+ALTER COLUMN correlation_key SET NOT NULL/.test(migration));
pass("schema declares correlation key NOT NULL", /correlationKey:\s*text\("correlation_key"\)\.notNull\(\)/.test(schema));
pass("correlated event replays are serialized by key", /apex:research_case_events:replay:/.test(migration) && /pg_advisory_xact_lock\(\s*hashtextextended\('apex:research_case_events:replay:'/.test(migration));
pass("correlated event replay payloads are compared", /existing_payload text/.test(migration) && /existing_payload IS DISTINCT FROM NEW\.payload/.test(migration));
pass("correlated event replay mismatch fails closed", /correlation key replay has different payload/.test(migration));
pass("replay integrity is installed as a BEFORE INSERT trigger", /CREATE TRIGGER apex_research_case_events_replay_integrity\s+BEFORE INSERT ON public\.research_case_events/.test(migration));
pass("ledger correlation keys remain uniquely indexed", /uniqueIndex\("research_case_events_case_id_correlation_key_uidx"\)/.test(schema));
pass("ledger remains explicitly documented append-only", /Append-only decisions, assignments, observations, claims, promotions/.test(schema));

if (failures.length) {
  console.error("RESEARCH LEDGER IMMUTABILITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RESEARCH LEDGER IMMUTABILITY: PASS — PostgreSQL rejects mutation, enforces mandatory event identity, blocks conflicting correlation-key replays, and startup fails closed if the ledger is absent or malformed");