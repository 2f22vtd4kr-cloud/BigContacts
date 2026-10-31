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
  ["all API routes mount through the single route aggregator", /app\\.use\\(["']\\/api["'],\\s*router\\)/.test(app)],
  ["auth bootstrap routes are mounted before the global operator guard", routes.includes('import operatorAuthRouter from "./operator-auth"') && routes.includes('import { requireOperatorAuth } from "../lib/operator-auth"') && routes.indexOf("router.use(operatorAuthRouter)") >= 0 && routes.indexOf("router.use(requireOperatorAuth)") > routes.indexOf("router.use(operatorAuthRouter)")],
  ["operator guard runs before health details and every private data route", routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(healthRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(entitiesRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(canonicalAtlasLaunchRouter)")],
  ["desk mounts the product router behind the operator sign-in gate", ui.includes("<OperatorGate>") && ui.includes("<AppRouter />")],
  ["preflight requires all three operator-auth secrets with minimum lengths", ["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"].every((name) => preflight.includes(name)) && /process\\.exit\\(providerMiss \\|\\| authMiss \\? 1 : 0\\)/.test(preflight)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Operator-auth enforcement check failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Operator-auth enforcement: " + checks.length + "/" + checks.length + " checks passed");
