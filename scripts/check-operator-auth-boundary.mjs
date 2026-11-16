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
  ["all API routes mount through the single route aggregator", app.includes('app.use("/api",router)')],
  ["auth bootstrap routes are mounted before the global operator guard", routes.includes('import operatorAuthRouter from "./operator-auth"') && routes.includes('import { requireOperatorAuth } from "../lib/operator-auth"') && routes.indexOf("router.use(operatorAuthRouter)") >= 0 && routes.indexOf("router.use(requireOperatorAuth)") > routes.indexOf("router.use(operatorAuthRouter)")],
  ["operator guard runs before health details and every private data route", routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(healthRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(entitiesRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(canonicalAtlasLaunchRouter)")],
  ["development preview bypasses the browser sign-in screen while production retains the gate", ui.includes('import.meta.env.VITE_APEX_OPERATOR_AUTH_BYPASS === "true"') && ui.includes('if (import.meta.env.VITE_APEX_OPERATOR_AUTH_BYPASS === "true") return desk;') && ui.includes("<OperatorGate>{desk}</OperatorGate>") && ui.includes("<AppRouter />") && read(".replit").includes('VITE_APEX_OPERATOR_AUTH_BYPASS = "true"')],
  ["API operator auth bypass requires an explicit Replit runtime flag", read("artifacts/api-server/src/src/lib/operator-auth.ts").includes('env.APEX_OPERATOR_AUTH_BYPASS === "true"') && read("artifacts/api-server/src/src/lib/operator-auth.ts").includes("if (isOperatorAuthBypassed(env)) return next();")],
  ["Replit deployments force production API auth and rebuild the frontend without the development bypass", read(".replit").includes("env NODE_ENV=development APEX_OPERATOR_AUTH_BYPASS=true VITE_APEX_OPERATOR_AUTH_BYPASS=true bash scripts/replit-boot.sh") && read("scripts/replit-boot.sh").includes('"${NODE_ENV:-}" == "development"')],
  ["development session bootstrap reports an authenticated bypass without secrets", read("artifacts/api-server/src/src/routes/operator-auth.ts").includes("developmentBypass: true") && read("artifacts/apex-finder/src/components/operator-gate.tsx").includes("data.developmentBypass === true")],
  ["production still requires all three operator-auth secrets", ["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"].every((name) => preflight.includes(name)) && preflight.includes("if (developmentMode)") && preflight.includes("authMiss")],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Operator-auth enforcement check failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Operator-auth enforcement: " + checks.length + "/" + checks.length + " checks passed");
