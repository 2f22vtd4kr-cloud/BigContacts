import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const client = fs.readFileSync(path.join(root, "lib/api-client-react/src/custom-fetch.ts"), "utf8");
const app = [
  "artifacts/apex-finder/src",
  "artifacts/mockup-sandbox/src",
].map((dir) => path.join(root, dir));

function walk(dir) {
  if (!fs.existsSync(dir)) return "";
  let out = "";
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out += walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out += `\n${fs.readFileSync(full, "utf8")}`;
  }
  return out;
}

const application = app.map(walk).join("\n");
const router = fs.readFileSync(path.join(root, "artifacts/apex-finder/src/router.tsx"), "utf8");
const authRoute = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/auth.ts"), "utf8");
const apiAuth = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/api-auth.ts"), "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/export function setAuthTokenGetter/.test(client), "shared API client no longer exposes its auth-token hook");
assert(/function OperatorGate/.test(router) && /\/api\/auth\/session/.test(router), "browser application does not gate the desk on an authenticated operator session");
assert(/\/api\/auth\/login/.test(router) && /credentials:\s*["']include["']/.test(router), "browser login does not establish a credentialed same-origin session");
assert(/verifyOperatorSession/.test(authRoute) && /HttpOnly/.test(authRoute) && /SameSite=Strict/.test(authRoute), "operator auth route does not issue a hardened HttpOnly session cookie");
assert(/verifyOperatorSession\(session\)/.test(apiAuth), "API auth middleware does not accept the browser operator session");
assert(/Cross-site mutation blocked/.test(apiAuth) && /sameOrigin/.test(apiAuth), "cookie-authenticated API mutations lack a same-origin CSRF boundary");
assert(!/VITE_APEX_API_AUTH_TOKEN|VITE_.*APEX.*AUTH.*TOKEN/i.test(application), "frontend appears to expose the server API bearer secret through a Vite environment variable");

if (failures.length) {
  console.error("FRONTEND API AUTH CONTRACT: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("FRONTEND API AUTH CONTRACT: PASS");
