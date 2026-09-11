import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const packageJson = fs.readFileSync("artifacts/api-server/package.json", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(source.includes('"footprint_username_maigret"'), "Maigret is not a model-selectable username action");
assert(source.includes('"footprint_username_sherlock"'), "Sherlock is not a model-selectable username action");
assert(!/action === "footprint_username"/.test(source), "legacy compound footprint_username action remains executable");
assert(!/action:\s*"footprint_username"/.test(source), "legacy compound footprint_username action remains parseable");
assert(/action === "footprint_username_maigret"[\s\S]*?runMaigret\([^\n]*signal:\s*runController\.signal/.test(source), "Maigret action is not directly wired to the run cancellation signal");
assert(/action === "footprint_username_sherlock"[\s\S]*?runSherlock\([^\n]*signal:\s*runController\.signal/.test(source), "Sherlock action is not directly wired to the run cancellation signal");
assert(!packageJson.includes("apply-agentic-username-capability-split.mjs"), "username capability migration hardener remains in API build/test scripts");

if (failures.length) {
  console.error("AGENTIC USERNAME CAPABILITY BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AGENTIC USERNAME CAPABILITY BOUNDARY: PASS");
console.log("- Maigret and Sherlock are individually model-selectable in canonical source");
console.log("- Legacy compound username action is absent from parser and execution");
console.log("- Both individual subprocess actions receive run cancellation");
console.log("- Migration hardener is absent from API build/test scripts");
