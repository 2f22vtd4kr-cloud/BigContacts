import fs from "node:fs";

const log = fs.readFileSync("/tmp/apex-api.log", "utf8");
const entities = JSON.parse(fs.readFileSync("/tmp/entities.json", "utf8"));
const rows = Array.isArray(entities) ? entities : (entities.entities || entities.rows || []);
const status = JSON.parse(fs.readFileSync("/tmp/atlas-status.json", "utf8"));

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
const isHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Production telemetry is structured around BUREAU spans; older audits incorrectly
// required the removed DISCOVERY_MODEL_STEP marker.
const discoveryModel = /agentName["']?\s*[:=]\s*["']discovery|targetName["']?\s*[:=]\s*["']discovery/.test(log);
const discoveryTools = /toolName["']?\s*[:=]\s*["'](?:web_search|visit)["']/.test(log);
if (!discoveryModel || !discoveryTools) fail("no model-selected discovery trajectory with actual web tooling");

const forbidden = [
  /Phase 0/i,
  /Pre-run cross-references/i,
  /DISCOVERY_SOURCES/i,
  /European venue owners/i,
  /MODEL TARGET:\s*(security issues|Chief Executive Officer|of Vista Equity Partners|as talented and unique as)/i,
  /forbes.{0,100}(billionaire|richest)/i,
  /billionaire.{0,100}(list|ranking)/i,
  /det_(search|visit)/i,
  /auto[_-]domain/i,
  /seed(?:ed)?[_-](?:contact|path)/i,
  /llm[_-]all[_-]failed/i,
];
for (const re of forbidden) if (re.test(log)) fail(`forbidden autonomy/research marker: ${re}`);

if (status.status !== "done" && status.outcome !== "complete") fail(`Bureau did not finish cleanly: ${status.status || status.outcome}`);
if (rows.length < 1) fail("discovery-first audit produced zero entities");

let sourceBacked = 0;
let direct = 0;
let org = 0;
for (const entity of rows) {
  const contacts = Array.isArray(entity.contacts) ? entity.contacts : [];
  const bad = contacts.filter(c => c && c.sourceUrl && !isHttpUrl(c.sourceUrl));
  if (bad.length) fail(`entity ${entity.name || entity.id} has contact evidence without HTTP(S) provenance`);
  sourceBacked += contacts.filter(c => isHttpUrl(c?.sourceUrl)).length;
  if (entity.contactOutcome === "direct_contact") direct++;
  if (entity.contactOutcome === "organization_contact") org++;
  console.log(`QUALITY entity=${entity.name || entity.id} outcome=${entity.contactOutcome || "none"} sourcedContacts=${contacts.length}`);
}

console.log(`LIVE_AUDIT entities=${rows.length} sourceBackedContacts=${sourceBacked} direct=${direct} organization=${org}`);
console.log(`LIVE_AUDIT discoveryModel=${discoveryModel} discoveryTools=${discoveryTools} status=${status.status || status.outcome}`);

// Organization routes are legitimate public contact routes, but are not equivalent
// to direct personal contact. Keep that distinction explicit for scoreboard/comparison.
if (org > 0 && direct === 0) console.log("QUALITY_NOTE organization-contact only; do not count as direct-person reachability");

if (process.exitCode) process.exit();
