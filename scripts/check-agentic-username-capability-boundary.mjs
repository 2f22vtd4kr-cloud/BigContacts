import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const hardener = fs.readFileSync("scripts/apply-agentic-username-capability-split.mjs", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(source.includes('"footprint_username"'), "source does not expose the username capability family");
assert(source.includes('"footprint_username_maigret"'), "Maigret is not a model-selectable username action");
assert(source.includes('"footprint_username_sherlock"'), "Sherlock is not a model-selectable username action");
assert(!/action === "footprint_username"/.test(source), "legacy compound footprint_username action remains executable");
assert(!/action:\s*"footprint_username"/.test(source), "legacy compound footprint_username action remains parseable");
assert(/runMaigret\([^\n]*signal:\s*runController\.signal/.test(source), "Maigret action is not wired to the run cancellation signal");
assert(/runSherlock\([^\n]*signal:\s*runController\.signal/.test(source), "Sherlock action is not wired to the run cancellation signal");
assert(hardener.includes("footprint_username_maigret") && hardener.includes("footprint_username_sherlock"), "username hardener does not encode both individual capabilities");

if (failures.length) {
  console.error("AGENTIC USERNAME CAPABILITY BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AGENTIC USERNAME CAPABILITY BOUNDARY: PASS");
console.log("- Maigret and Sherlock are individually model-selectable");
console.log("- Legacy compound username action is absent");
console.log("- Both subprocesses receive run cancellation");
