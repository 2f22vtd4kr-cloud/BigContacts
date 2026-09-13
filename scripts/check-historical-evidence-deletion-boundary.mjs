import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "lib/db/src/schema/phase_j.ts"), "utf8");
const evidence = fs.readFileSync(path.join(root, "lib/db/src/schema/research_evidence.ts"), "utf8");
const runEvents = fs.readFileSync(path.join(root, "lib/db/src/schema/research_run_events.ts"), "utf8");
const db = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/contactEvidenceTable[\s\S]{0,500}references\(\(\)\s*=>\s*entitiesTable\.id\s*,\s*\{\s*onDelete:\s*"restrict"\s*\}\)/.test(schema), "contact evidence must restrict entity deletion");
assert(/researchEvidenceTable[\s\S]{0,500}sessionId:[\s\S]{0,180}onDelete:\s*"restrict"/.test(evidence), "research evidence must restrict session deletion");
assert(/researchEvidenceTable[\s\S]{0,700}entityId:[\s\S]{0,180}onDelete:\s*"restrict"/.test(evidence), "research evidence must restrict entity deletion");
assert(/researchRunEventsTable[\s\S]{0,500}sessionId:[\s\S]{0,180}onDelete:\s*"restrict"/.test(runEvents), "research run ledger must restrict session deletion");
assert(/public\.contact_evidence[\s\S]{0,900}c\.confdeltype\s*<>\s*'r'[\s\S]{0,900}ON DELETE RESTRICT/.test(db), "boot hardener must repair legacy contact-evidence cascades");
assert(/public\.research_evidence[\s\S]{0,900}c\.confdeltype\s*<>\s*'r'[\s\S]{0,900}ON DELETE RESTRICT/.test(db), "boot hardener must repair legacy research-evidence cascades");
assert(/public\.research_run_events[\s\S]{0,900}c\.confdeltype\s*<>\s*'r'[\s\S]{0,900}ON DELETE RESTRICT/.test(db), "boot hardener must repair legacy research-run-event cascades");
assert(/research_case_events[\s\S]{0,400}ON DELETE RESTRICT/.test(db), "research case event ledger must remain non-destructible through case deletion");

if (failures.length) {
  console.error("HISTORICAL EVIDENCE DELETION BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("HISTORICAL EVIDENCE DELETION BOUNDARY: PASS");
