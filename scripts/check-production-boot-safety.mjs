import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boot = fs.readFileSync(path.join(root, "scripts/replit-boot.sh"), "utf8");
const repl = fs.readFileSync(path.join(root, ".replit"), "utf8");
const auth = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/api-auth.ts"), "utf8");
const app = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/app.ts"), "utf8");
const checks = [
  ["schema push is opt-in at boot", /if \[\[ \"\$\{APEX_ALLOW_SCHEMA_PUSH:-false\}\" == \"true\" \]\]/.test(boot)],
  ["boot does not unconditionally run drizzle push", !/pnpm --filter @workspace\/db run push\n(?!\s*else)/.test(boot)],
  ["production API has no CI authentication bypass", !/process\.env\.CI|isLoopbackAddress/.test(auth)],
  ["production startup requires API authentication secret", /requireProductionSecret\("APEX_API_AUTH_TOKEN", 32\)/.test(app)],
  ["production startup requires operator password", /requireProductionSecret\("APEX_OPERATOR_PASSWORD", 16\)/.test(app)],
  ["production startup requires session signing secret", /requireProductionSecret\("APEX_SESSION_SECRET", 32\)/.test(app)],
  ["runtime refuses to start without durable DB invariants", /ensureResearchCaseEventsImmutable/.test(fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8"))],
  ["Replit production runtime is Node 22", /modules\s*=\s*\[\"nodejs-22\"/.test(repl)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("PRODUCTION BOOT SAFETY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PRODUCTION BOOT SAFETY: PASS");
