import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const boot = fs.readFileSync(path.join(root, "scripts/replit-boot.sh"), "utf8");
const auth = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/api-auth.ts"), "utf8");
const checks = [
  ["schema push is opt-in at boot", /if \[\[ \"\$\{APEX_ALLOW_SCHEMA_PUSH:-false\}\" == \"true\" \]\]/.test(boot)],
  ["boot does not unconditionally run drizzle push", !/pnpm --filter @workspace\/db run push\n(?!\s*else)/.test(boot)],
  ["production API has no CI authentication bypass", !/process\.env\.CI|isLoopbackAddress/.test(auth)],
  ["runtime refuses to start without the durable DB invariants", /ensureResearchCaseEventsImmutable/.test(fs.readFileSync(path.join(root, "lib/db/src/index.ts"), "utf8"))],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("PRODUCTION BOOT SAFETY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PRODUCTION BOOT SAFETY: PASS");
