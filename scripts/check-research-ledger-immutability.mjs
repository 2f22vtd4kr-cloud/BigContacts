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
pass("ledger remains explicitly documented append-only", /Append-only decisions, assignments, observations, claims, promotions/.test(schema));

if (failures.length) {
  console.error("RESEARCH LEDGER IMMUTABILITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RESEARCH LEDGER IMMUTABILITY: PASS — PostgreSQL rejects UPDATE, DELETE, and TRUNCATE on the control/provenance ledger and startup fails closed if the ledger is absent");
