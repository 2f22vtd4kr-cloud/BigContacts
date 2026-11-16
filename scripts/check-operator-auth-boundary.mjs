#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("artifacts/api-server/src/src/app.ts");
const routes = read("artifacts/api-server/src/src/routes/index.ts");
const ui = read("artifacts/apex-finder/src/App.tsx");
const operatorAuth = read("artifacts/api-server/src/src/lib/operator-auth.ts");
const preflight = read("scripts/replit-preflight.mjs");
const replit = read(".replit");
const artifact = read("artifacts/api-server/.replit-artifact/artifact.toml");
const artifactDevelopmentEnv = artifact.split("[services.development.env]")[1]?.split("[services.production]")[0] ?? "";
const artifactProductionBuildEnv = artifact.split("[services.production.build.env]")[1]?.split("[services.production.run]")[0] ?? "";
const artifactProductionRunEnv = artifact.split("[services.production.run.env]")[1]?.split("[services.production.health")[0] ?? "";

const preflightBaseEnv = {
  ...process.env,
  NODE_ENV: "production",
  GROQ_BOSS_API_KEY: "test-only",
  GROQ_RIGHT_HAND_API_KEY: "test-only",
  GROQ_INVESTIGATOR_API_KEY: "test-only",
  REDIS_URL_1: "redis://127.0.0.1:6379",
  SERPER_API_KEY: "test-only",
};
for (const name of ["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"]) {
  delete preflightBaseEnv[name];
}
const productionBypassPreflight = spawnSync(process.execPath, ["scripts/replit-preflight.mjs"], {
  cwd: root,
  env: { ...preflightBaseEnv, APEX_OPERATOR_AUTH_BYPASS: "true" },
  encoding: "utf8",
});
const developmentBypassPreflight = spawnSync(process.execPath, ["scripts/replit-preflight.mjs"], {
  cwd: root,
  env: { ...preflightBaseEnv, NODE_ENV: "development", APEX_OPERATOR_AUTH_BYPASS: "true" },
  encoding: "utf8",
});
const productionProtectedPreflight = spawnSync(process.execPath, ["scripts/replit-preflight.mjs"], {
  cwd: root,
  env: { ...preflightBaseEnv, APEX_OPERATOR_AUTH_BYPASS: "false" },
  encoding: "utf8",
});

const checks = [
  ["all API routes mount through the single route aggregator", app.includes('app.use("/api",router)')],
  ["auth bootstrap routes are mounted before the global operator guard", routes.includes('import operatorAuthRouter from "./operator-auth"') && routes.includes('import { requireOperatorAuth } from "../lib/operator-auth"') && routes.indexOf("router.use(operatorAuthRouter)") >= 0 && routes.indexOf("router.use(requireOperatorAuth)") > routes.indexOf("router.use(operatorAuthRouter)")],
  ["operator guard runs before health details and every private data route", routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(healthRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(entitiesRouter)") && routes.indexOf("router.use(requireOperatorAuth)") < routes.indexOf("router.use(canonicalAtlasLaunchRouter)")],
  ["Replit browser bundle has an explicit auth bypass and retains the gate when unset", ui.includes('import.meta.env.VITE_APEX_OPERATOR_AUTH_BYPASS === "true"') && ui.includes('if (import.meta.env.VITE_APEX_OPERATOR_AUTH_BYPASS === "true") return desk;') && ui.includes("<OperatorGate>{desk}</OperatorGate>") && ui.includes("<AppRouter />")],
  ["API operator auth bypass requires an explicit Replit runtime flag", operatorAuth.includes('env.APEX_OPERATOR_AUTH_BYPASS === "true"') && operatorAuth.includes("if (isOperatorAuthBypassed(env)) return next();")],
  ["root Replit Run and deployment set both browser and API bypass flags", replit.includes('APEX_OPERATOR_AUTH_BYPASS = "true"') && replit.includes('VITE_APEX_OPERATOR_AUTH_BYPASS = "true"') && replit.includes("env NODE_ENV=development APEX_OPERATOR_AUTH_BYPASS=true VITE_APEX_OPERATOR_AUTH_BYPASS=true bash scripts/replit-boot.sh")],
  ["Replit artifact development environment bypasses both UI and API auth", artifactDevelopmentEnv.includes('APEX_OPERATOR_AUTH_BYPASS = "true"') && artifactDevelopmentEnv.includes('VITE_APEX_OPERATOR_AUTH_BYPASS = "true"')],
  ["Replit artifact production build and run retain the UI and API auth gates", !artifactProductionBuildEnv.includes('VITE_APEX_OPERATOR_AUTH_BYPASS = "true"') && !artifactProductionRunEnv.includes('APEX_OPERATOR_AUTH_BYPASS = "true"') && !artifactProductionRunEnv.includes('VITE_APEX_OPERATOR_AUTH_BYPASS = "true"')],
  ["session bootstrap reports an authenticated bypass to the browser gate", read("artifacts/api-server/src/src/routes/operator-auth.ts").includes("developmentBypass: true") && read("artifacts/apex-finder/src/components/operator-gate.tsx").includes("data.developmentBypass === true")],
  ["development preflight skips operator-auth secrets only with the explicit Replit development flag", developmentBypassPreflight.status === 0 && developmentBypassPreflight.stdout.includes("SKIP operator-auth secrets")],
  ["production preflight rejects the bypass flag and still requires operator secrets", productionBypassPreflight.status !== 0 && productionBypassPreflight.stdout.includes("operator auth: required")],
  ["production preflight still fails closed when the explicit bypass is absent", productionProtectedPreflight.status !== 0 && productionProtectedPreflight.stdout.includes("operator auth: required") && preflight.includes("developmentMode && process.env.APEX_OPERATOR_AUTH_BYPASS")],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Operator-auth enforcement check failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Operator-auth enforcement: " + checks.length + "/" + checks.length + " checks passed");
