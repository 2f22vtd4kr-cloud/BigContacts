import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");

const required = [
  '"footprint_username_maigret"',
  '"footprint_username_sherlock"',
  'action === "footprint_username_maigret"',
  'action === "footprint_username_sherlock"',
  'tools.runMaigret(action.username',
  'tools.runSherlock(action.username',
  'action === "footprint_email"',
  'tools.runHolehe(action.email',
];
for (const marker of required) if (!source.includes(marker)) throw new Error(`OSINT capability boundary invariant failed: missing ${marker}`);

if (/action === "footprint_username"/.test(source)) throw new Error("OSINT capability boundary invariant failed: compound footprint_username remains model-selectable");
if (/\["footprint_email", "footprint_username",/.test(source)) throw new Error("OSINT capability boundary invariant failed: legacy username action remains in schema");
if (!/runMaigret\(action\.username, \{ signal: runController\.signal \}\)/.test(source)) throw new Error("OSINT capability boundary invariant failed: Maigret lacks run-scoped cancellation");
if (!/runSherlock\(action\.username, \{ signal: runController\.signal \}\)/.test(source)) throw new Error("OSINT capability boundary invariant failed: Sherlock lacks run-scoped cancellation");
if (!/runHolehe\(action\.email, \{ signal: runController\.signal \}\)/.test(source)) throw new Error("OSINT capability boundary invariant failed: Holehe lacks run-scoped cancellation");
if (/action\.action === "footprint_email"[\s\S]{0,1800}runMaigret\(/.test(source)) throw new Error("OSINT capability boundary invariant failed: email capability fans out to Maigret");
if (/action\.action === "footprint_email"[\s\S]{0,1800}runSherlock\(/.test(source)) throw new Error("OSINT capability boundary invariant failed: email capability fans out to Sherlock");
if (/action\.action === "harvest_domain"[\s\S]{0,1800}runTheHarvester\(/.test(source)) throw new Error("OSINT capability boundary invariant failed: ungovened theHarvester subprocess remains executable");
if (!/HARVEST_DOMAIN blocked: network-capable subprocess egress is not yet governed/.test(source)) throw new Error("OSINT capability boundary invariant failed: harvest_domain is neither governed nor fail-closed");

console.log("agentic OSINT capability boundary: PASS — atomic model actions, cancellation, and fail-closed harvest egress");
