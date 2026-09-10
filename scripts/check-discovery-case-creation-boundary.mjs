import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/routes/research/case-data.ts", "utf8");
const checks = [
  ["case creation is explicitly data-plane", source.includes("Case creation is data-plane work only")],
  ["new discovery cases do not expose a fixed research action", source.includes('currentAction: "awaiting_boss_control"')],
  ["case creation does not copy the legacy initialAction id into currentAction", !source.includes("currentAction: caseFile.initialAction.id")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
