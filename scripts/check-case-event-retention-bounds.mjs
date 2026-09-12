import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "lib/db/src/schema/research_case_events.ts"), "utf8");
const db = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const checks = [
  ["event payload remains bounded", /research_case_events_payload_max_/.test(db) && /MAX_EVENT_PAYLOAD_BYTES/.test(db)],
  ["event identity remains mandatory", /correlationKey: text\("correlation_key"\)\.notNull\(\)/.test(schema)],
  ["historical oversize events fail closed", /payload_length_count/.test(db) && /refusing to enable bounded research event payloads/.test(db)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CASE EVENT RETENTION BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CASE EVENT RETENTION BOUNDS: PASS");
