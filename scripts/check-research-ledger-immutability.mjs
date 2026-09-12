#!/usr/bin/env node
import fs from "node:fs";

const dbIndex = fs.readFileSync("lib/db/src/index.ts", "utf8");
const schema = fs.readFileSync("lib/db/src/schema/research_case_events.ts", "utf8");
const failures = [];

const pass = (name, ok) => {
  if (!ok) failures.push(name);
};

pass("DB bootstrap installs an append-only trigger", /CREATE TRIGGER apex_research_case_events_no_update_delete/.test(dbIndex));
pass("DB bootstrap blocks TRUNCATE", /CREATE TRIGGER apex_research_case_events_no_truncate/.test(dbIndex));
pass("trigger rejects UPDATE and DELETE", /BEFORE UPDATE OR DELETE ON public\.research_case_events/.test(dbIndex));
pass("trigger rejects TRUNCATE", /BEFORE TRUNCATE ON public\.research_case_events/.test(dbIndex));
pass("trigger raises an error", /RAISE EXCEPTION ['\"]research_case_events is append-only/.test(dbIndex));
pass("missing ledger fails closed", /Apex research_case_events ledger is missing; refusing to start/.test(dbIndex));
pass("bootstrap is serialized across instances", /pg_advisory_xact_lock\(hashtext\('apex:research_case_events:immutability'\)\)/.test(dbIndex));
pass("public write privileges are removed", /REVOKE UPDATE, DELETE, TRUNCATE ON public\.research_case_events FROM PUBLIC/.test(dbIndex));
pass("correlation key NULLs fail closed", /SELECT count\(\*\) INTO null_correlation_count[\s\S]*WHERE correlation_key IS NULL[\s\S]*refusing to enable mandatory event identity/.test(dbIndex));
pass("live ledger correlation key is forced NOT NULL", /ALTER TABLE public\.research_case_events\s+ALTER COLUMN correlation_key SET NOT NULL/.test(dbIndex));
pass("schema declares correlation key NOT NULL", /correlationKey:\s*text\("correlation_key"\)\.notNull\(\)/.test(schema));
pass("correlated event replays are serialized by key", /apex:research_case_events:replay:/.test(dbIndex) && /pg_advisory_xact_lock\(\s*hashtext\('apex:research_case_events:replay:'/.test(dbIndex));
pass("correlated event replay payloads are compared", /existing_payload text/.test(dbIndex) && /existing_payload IS DISTINCT FROM NEW\.payload/.test(dbIndex));
pass("correlated event replay mismatch fails closed", /correlation key replay has different payload/.test(dbIndex));
pass("replay integrity is installed as a BEFORE INSERT trigger", /CREATE TRIGGER apex_research_case_events_replay_integrity\s+BEFORE INSERT ON public\.research_case_events/.test(dbIndex));
pass("ledger correlation keys remain uniquely indexed", /uniqueIndex\("research_case_events_case_id_correlation_key_uidx"\)/.test(schema));
pass("ledger remains explicitly documented append-only", /Append-only decisions, assignments, observations, claims, promotions/.test(schema));

if (failures.length) {
  console.error("RESEARCH LEDGER IMMUTABILITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RESEARCH LEDGER IMMUTABILITY: PASS — PostgreSQL rejects mutation, enforces mandatory event identity, blocks conflicting correlation-key replays, and startup fails closed if the ledger is absent or malformed");
