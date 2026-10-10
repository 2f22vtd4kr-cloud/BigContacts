#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("artifacts/api-server/src/src/app.ts");
const routes = read("artifacts/api-server/src/src/routes/index.ts");
const ui = read("artifacts/apex-finder/src/App.tsx");
const preflight = read("scripts/replit-preflight.mjs");

const checks = [
  ["all API routes mount through the single route aggregator", /app\.use\(["']\/api["'],\s*router\)/.test(app)],
  ["active API route aggregator does not mount operator authentication", !routes.includes('from "./operator-auth"') && !routes.includes("requireOperatorAuth") && !routes.includes("router.use(operatorAuthRouter)")],
  ["desk mounts the product router without an operator sign-in gate", ui.includes("<AppRouter />") && !ui.includes("OperatorGate")],
  ["preflight does not require operator-auth secrets", !["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"].some((name) => preflight.includes(name)) && /process\.exit\(providerMiss \? 1 : 0\)/.test(preflight)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Intentional operator-auth disablement check failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Operator-auth disablement: " + checks.length + "/" + checks.length + " checks passed");
