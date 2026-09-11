import fs from "node:fs";

const rootPackage = JSON.parse(fs.readFileSync("package.json", "utf8"));
const apiPackage = JSON.parse(fs.readFileSync("artifacts/api-server/package.json", "utf8"));
const launchGate = fs.readFileSync("scripts/check-apex-launch-gate.mjs", "utf8");

const scripts = [
  rootPackage.scripts?.build ?? "",
  rootPackage.scripts?.check\:bureau ?? "",
  apiPackage.scripts?.build ?? "",
  apiPackage.scripts?.test ?? "",
  launchGate,
].join("\n");

if (/\bapply-[a-z0-9-]+\.mjs\b/.test(scripts) || /execFileSync\([^\n]*apply-/.test(scripts)) {
  console.error("BUILD SOURCE MUTATION: FAIL — canonical build/test gates must not execute source mutators");
  process.exit(1);
}

console.log("BUILD SOURCE MUTATION: PASS — canonical gates are observation-only");
