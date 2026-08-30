import fs from "node:fs";

const readText = (file) => {
  try { return fs.readFileSync(file, "utf8"); }
  catch { return ""; }
};
const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
};

const log = readText("/tmp/apex-api.log");
const entities = readJson("/tmp/entities.json", {});
const rows = Array.isArray(entities) ? entities : (entities.entities || entities.rows || []);
const status = readJson("/tmp/atlas-status.json", {});
const health = readJson("/tmp/health.json", {});
const launch = readJson("/tmp/launch.json", {});

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
const isHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
};

// Do not misclassify a build/startup failure as an LLM or research failure.
// This matters because a broken binary can otherwise produce the misleading
// assertion that Apex had no model trajectory. A research-quality verdict only
// begins after the API accepted an actual Bureau launch.
const launchAccepted = Boolean(launch.jobId);
const runtimeHealthy = Boolean(health && typeof health === "object" && Object.keys(health).length > 0);
if (!launchAccepted && (!runtimeHealthy || !status || Object.keys(status).length === 0)) {
  fail("infra/runtime failure before a Bureau launch; no research-quality verdict is possible");
  console.log("LIVE_AUDIT class=infra_prelaunch_failure researchQuality=inconclusive");
  process.exit();
}

// The API status endpoint carries authoritative live BUREAU telemetry. The
// server log is a secondary source. Missing files are audit-data problems.
const telemetry = [
  ...(Array.isArray(status.log) ? status.log : []),
  ...(Array.isArray(status.recentSpans) ? status.recentSpans.map((s) => JSON.stringify(s)) : []),
].join("\n");

const bureauRecords = [];
for (const line of [...log.split(/\r?\n/), ...(Array.isArray(status.log) ? status.log : [])]) {
  const marker = line.indexOf("BUREAU|");
  if (marker < 0) continue;
  try { bureauRecords.push(JSON.parse(line.slice(marker + "BUREAU|".length))); } catch {}
}

const discoverySpans = (status.recentSpans || []).filter((s) => s && (
  s.agentName === "discovery" || s.targetName === "discovery" || s.operationName === "invoke_agent"
));
const discoveryModel = discoverySpans.some((s) => s.spanType === "llm" || s.name === "llm_step")
  || bureauRecords.some((r) => r?.targetName === "discovery" && r?.kind === "tool");
const discoveryTools = discoverySpans.some((s) => s.spanType === "tool" && ["web_search", "visit"].includes(s.toolName || s.name))
  || bureauRecords.some((r) => r?.targetName === "discovery" && ["search", "page-fetch", "tool"].includes(r?.kind));
if (!discoveryModel || !discoveryTools) fail("no model-selected discovery trajectory with actual web tooling");

const forbidden = [
  /Phase 0/i,
  /Pre-run cross-references/i,
  /DISCOVERY_SOURCES/i,
  /European venue owners/i,
  /MODEL TARGET:\s*(security issues|Chief Executive Officer|of Vista Equity Partners|as talented and unique as)/i,
  /det_(search|visit)/i,
  /auto[_-]domain/i,
  /seed(?:ed)?[_-](?:contact|path)/i,
  /llm[_-]all[_-]failed/i,
];
for (const re of forbidden) if (re.test(log) || re.test(telemetry)) fail(`forbidden autonomy/research marker: ${re}`);

// Forbes is not forbidden as a source. What is forbidden is using a generic
// billionaire/richest/list ranking as the actual discovery action. A model may
// legitimately use a Forbes profile as one source for a specifically named
// person after discovering that person elsewhere.
const actualSearches = [...log.split(/\r?\n/), ...(Array.isArray(status.log) ? status.log : [])]
  .filter((line) => /(?:web_search|search)\s+/i.test(line));
for (const line of actualSearches) {
  const query = line.replace(/^.*?(?:web_search|search)\s+/i, "").trim();
  if (/\bforbes\b/i.test(query) && /\b(?:billionaires?|richest|wealthiest)\b/i.test(query) && /\b(?:list|ranking|rankings|202[0-9]|real[- ]?time)\b/i.test(query)) {
    fail(`low-yield fame/list discovery query: ${query.slice(0, 240)}`);
  }
}

if (status.status !== "done" && status.outcome !== "complete") fail(`Bureau did not finish cleanly: ${status.status || status.outcome || "unknown"}`);
if (rows.length < 1) fail("discovery-first audit produced zero entities");

let sourceBacked = 0;
let direct = 0;
let org = 0;
for (const entity of rows) {
  const contacts = Array.isArray(entity.contacts) ? entity.contacts : [];
  const bad = contacts.filter((c) => c && c.sourceUrl && !isHttpUrl(c.sourceUrl));
  if (bad.length) fail(`entity ${entity.name || entity.id} has contact evidence without HTTP(S) provenance`);
  sourceBacked += contacts.filter((c) => isHttpUrl(c?.sourceUrl)).length;
  if (entity.contactOutcome === "direct_contact") direct++;
  if (entity.contactOutcome === "organization_contact") org++;
  console.log(`QUALITY entity=${entity.name || entity.id} outcome=${entity.contactOutcome || "none"} sourcedContacts=${contacts.length}`);
}

console.log(`LIVE_AUDIT class=research_quality entities=${rows.length} sourceBackedContacts=${sourceBacked} direct=${direct} organization=${org}`);
console.log(`LIVE_AUDIT discoveryModel=${discoveryModel} discoveryTools=${discoveryTools} status=${status.status || status.outcome || "unknown"}`);
console.log(`LIVE_AUDIT discoverySpans=${discoverySpans.length} bureauRecords=${bureauRecords.length}`);
if (org > 0 && direct === 0) console.log("QUALITY_NOTE organization-contact only; do not count as direct-person reachability");
if (process.exitCode) process.exit();
