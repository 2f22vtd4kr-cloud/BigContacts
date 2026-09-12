import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const auth = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/api-auth.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/auth.ts"), "utf8");
const app = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/app.ts"), "utf8");
const checks = [
  ["API is mounted behind apiAuth", /app\.use\("\/api", apiAuth, router\)/.test(app)],
  ["CI does not bypass API authentication", !/process\.env\.CI|isLoopbackAddress|NODE_ENV !== "production"/.test(auth)],
  ["bearer authentication uses constant-time comparison", /timingSafeEqual/.test(auth) && /tokenMatches/.test(auth)],
  ["operator session mutations require same origin", /Cross-site mutation blocked/.test(auth) && /sameOrigin/.test(auth)],
  ["authentication token has a minimum length", /length < 32/.test(auth)],
  ["operator login has bounded brute-force state", /LOGIN_FAILURE_LIMIT\s*=\s*8/.test(login) && /MAX_LOGIN_TRACKERS\s*=\s*4096/.test(login) && /status\(429\)/.test(login)],
  ["login failure tracker is cleared on successful authentication", /clearLoginFailures\(req\)/.test(login)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("API AUTH BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("API AUTH BOUNDARY: PASS");
