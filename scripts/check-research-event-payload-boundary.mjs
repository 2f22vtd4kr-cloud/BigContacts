import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "lib/db/src/schema/research_case_events.ts"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const checks = [
  ["event payload has a shared explicit byte ceiling", /RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES\s*=\s*128\s*\*\s*1024/.test(schema)],
  ["database schema has a payload size CHECK", /research_case_events_payload_size_ck/.test(schema) && /octet_length\(\$\{table\.payload\}\)/.test(schema)],
  ["insert validation rejects oversized payloads", /eventPayloadSchema = z\.string\(\)\.max\(RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES/.test(schema)],
  ["startup fails closed on pre-existing oversized payloads", /oversized_payload_count/.test(bootstrap) && /octet_length\(payload\) > 131072/.test(bootstrap)],
  ["startup installs the database payload constraint idempotently", /research_case_events_payload_size_ck/.test(bootstrap) && /ADD CONSTRAINT research_case_events_payload_size_ck/.test(bootstrap)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("RESEARCH EVENT PAYLOAD BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RESEARCH EVENT PAYLOAD BOUNDARY: PASS");
