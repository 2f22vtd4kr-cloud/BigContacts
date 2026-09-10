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
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/export function setAuthTokenGetter/.test(client), "shared API client no longer exposes its auth-token hook");
assert(!/setAuthTokenGetter\(/.test(application), "frontend application still has no registered bearer/session token getter");
assert(!/VITE_APEX_API_AUTH_TOKEN|VITE_.*APEX.*AUTH.*TOKEN/i.test(application), "frontend appears to expose the server API bearer secret through a Vite environment variable");

if (failures.length) {
  console.error("FRONTEND API AUTH CONTRACT: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("FRONTEND API AUTH CONTRACT: PASS");
