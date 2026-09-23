import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "lib/db/src/schema/research_case_events.ts"), "utf8");
const db = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "lib/db/migrations/001-apex-invariants.sql"), "utf8");
const checks = [
  ["event payload remains bounded", /research_case_events_payload_size_ck/.test(migration) && /RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES/.test(schema)],
  ["event identity remains mandatory", /correlationKey: text\("correlation_key"\)\.notNull\(\)/.test(schema)],
  ["historical oversize events fail closed", /oversized_payload_count/.test(migration) && /refusing to enable the bounded ledger/.test(migration)],
  ["historical oversized cases fail closed", /oversized_case_count/.test(migration) && /50000-event lifecycle ceiling/.test(migration)],
  ["new events are lifecycle bounded", /event_count\s*>=\s*50000/.test(migration) && /research case % has reached the 50000-event lifecycle ceiling/.test(migration)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CASE EVENT RETENTION BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CASE EVENT RETENTION BOUNDS: PASS");