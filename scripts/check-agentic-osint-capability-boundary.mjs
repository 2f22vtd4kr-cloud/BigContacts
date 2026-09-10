import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");

const required = [
  '"footprint_username_maigret"',
  '"footprint_username_sherlock"',
  'action === "footprint_username_maigret"',
  'action === "footprint_username_sherlock"',
  'tools.runMaigret(action.username',
  'tools.runSherlock(action.username',
];
for (const marker of required) if (!source.includes(marker)) throw new Error(`OSINT capability boundary invariant failed: missing ${marker}`);
if (/action === "footprint_username"/.test(source)) throw new Error("OSINT capability boundary invariant failed: compound footprint_username remains model-selectable");
if (/\["footprint_email", "footprint_username",/.test(source)) throw new Error("OSINT capability boundary invariant failed: legacy username action remains in schema");

console.log("agentic OSINT capability boundary: PASS");
