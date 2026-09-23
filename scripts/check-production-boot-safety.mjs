import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boot = fs.readFileSync(path.join(root, "scripts/replit-boot.sh"), "utf8");
const repl = fs.readFileSync(path.join(root, ".replit"), "utf8");
const auth = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/api-auth.ts"), "utf8");
const app = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/app.ts"), "utf8");
const db = fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8");
const dbPackage = JSON.parse(fs.readFileSync(path.join(root, "lib/db/package.json"), "utf8"));
const dbMigration = fs.readFileSync(path.join(root, "lib/db/migrations/001-apex-invariants.sql"), "utf8");
const checks = [
  ["schema push is opt-in at boot", /if \[\[ \"\$\{APEX_ALLOW_SCHEMA_PUSH:-false\}\" == \"true\" \]\]/.test(boot)],
  ["boot does not unconditionally run drizzle push", !/pnpm --filter @workspace\/db run push\n(?!\s*else)/.test(boot)],
  ["production API has no CI authentication bypass", !/process\.env\.CI|isLoopbackAddress/.test(auth)],
  ["production startup requires API authentication secret", /requireProductionSecret\("APEX_API_AUTH_TOKEN"\s*,\s*32\)/.test(app)],
  ["production startup requires operator password", /requireProductionSecret\("APEX_OPERATOR_PASSWORD"\s*,\s*16\)/.test(app)],
  ["production startup requires session signing secret", /requireProductionSecret\("APEX_SESSION_SECRET"\s*,\s*32\)/.test(app)],
  ["database hardening is explicit and versioned", !/ensureResearchCaseEventsImmutable|ALTER TABLE|CREATE TRIGGER/.test(db) && typeof dbPackage.scripts?.harden === "string" && /001-apex-invariants\.sql/.test(dbPackage.scripts.harden) && /apex_research_case_events_immutable/.test(dbMigration)],
  ["Replit production runtime is Node 22", /modules\s*=\s*\[\"nodejs-22\"/.test(repl)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) { console.error("PRODUCTION BOOT SAFETY: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("PRODUCTION BOOT SAFETY: PASS");
