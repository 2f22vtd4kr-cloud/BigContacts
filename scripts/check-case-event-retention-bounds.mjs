import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "lib/db/src/schema/research_case_events.ts"), "utf8");
const db = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const checks = [
  ["event payload remains bounded", /research_case_events_payload_size_ck/.test(db) && /RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES/.test(schema)],
  ["event identity remains mandatory", /correlationKey: text\("correlation_key"\)\.notNull\(\)/.test(schema)],
  ["historical oversize events fail closed", /oversized_payload_count/.test(db) && /refusing to enable the bounded ledger/.test(db)],
  ["historical oversized cases fail closed", /oversized_case_count/.test(db) && /50000-event lifecycle ceiling/.test(db)],
  ["new events are lifecycle bounded", /event_count >= 50000/.test(db) && /research case % has reached the 50000-event lifecycle ceiling/.test(db)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CASE EVENT RETENTION BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CASE EVENT RETENTION BOUNDS: PASS");
