#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("artifacts/api-server/src/src/app.ts");
const routes = read("artifacts/api-server/src/src/routes/index.ts");
const auth = read("artifacts/api-server/src/src/lib/operator-auth.ts");
const authRoute = read("artifacts/api-server/src/src/routes/operator-auth.ts");
const gate = read("artifacts/apex-finder/src/components/operator-gate.tsx");
const ui = read("artifacts/apex-finder/src/App.tsx");
const preflight = read("scripts/replit-preflight.mjs");

const checks = [
  ["all API routes mount through the single guarded route aggregator", /app\.use\(["']\/api["'],\s*router\)/.test(app)],
  ["operator auth router runs before the guard, and the guard before every operational router", /router\.use\(operatorAuthRouter\);[\s\S]*?router\.use\(requireOperatorAuth\);[\s\S]*?router\.use\(healthRouter\);/.test(routes) && !routes.includes("apiAuthMiddleware") && !routes.includes("authRouter")],
  ["public auth exemptions are narrowly method-and-path scoped", /req\.method\s*===\s*"GET"[\s\S]*?req\.path\s*===\s*"\/healthz"[\s\S]*?req\.path\s*===\s*"\/auth\/session"/.test(auth) && /req\.method\s*===\s*"POST"[\s\S]*?req\.path\s*===\s*"\/auth\/login"[\s\S]*?req\.path\s*===\s*"\/auth\/logout"/.test(auth)],
  ["missing auth configuration fails closed and unauthorized requests do not continue", auth.includes("OPERATOR_AUTH_NOT_CONFIGURED") && auth.includes("OPERATOR_AUTH_REQUIRED") && /if\s*\(!config\)/.test(auth) && /if\s*\(!isOperatorAuthorized\(req,\s*config\)\)/.test(auth)],
  ["session signatures are cryptographic, nonce-backed, and time-bounded", auth.includes("createHmac(") && auth.includes("randomBytes(") && auth.includes("OPERATOR_SESSION_TTL_SECONDS") && auth.includes("verifyOperatorSessionToken")],
  ["session cookies are HttpOnly, SameSite strict, and Secure in production", authRoute.includes("HttpOnly") && authRoute.includes("SameSite=Strict") && authRoute.includes("; Secure") && authRoute.includes("Max-Age=0")],
  ["password guessing receives bounded throttling", authRoute.includes("MAX_FAILED_LOGINS_PER_WINDOW = 8") && authRoute.includes("LOGIN_BLOCK_MS") && authRoute.includes("Retry-After")],
  ["the only operator-auth endpoints are session, login, and logout", (authRoute.match(/router\.(?:get|post|put|patch|delete)\(/g) ?? []).length === 3 && authRoute.includes('"/auth/session"') && authRoute.includes('"/auth/login"') && authRoute.includes('"/auth/logout"')],
  ["the desk gates all product routes on the server-verified operator session", ui.includes("<OperatorGate><AppRouter /></OperatorGate>") && gate.includes('API + "/auth/session"') && gate.includes("data.authenticated === true")],
  ["the browser posts the password only for sign-in and does not persist it", gate.includes('API + "/auth/login"') && gate.includes("JSON.stringify({ password })") && gate.includes('credentials: "same-origin"') && !/localStorage|sessionStorage/.test(gate)],
  ["logout keeps the session view until the server confirms cookie clearing", gate.includes('API + "/auth/logout"') && gate.includes('if (!response.ok) throw new Error("Logout was rejected.")')],
  ["preflight checks the three required auth controls without printing their values", ["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"].every((name) => preflight.includes(name)) && preflight.includes("presence/length only")],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Operator auth boundary failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Operator auth boundary: " + checks.length + "/" + checks.length + " checks passed");
