#!/usr/bin/env node
/**
 * Operator helper: POST refresh-surface for an entity and print contact marks.
 * Usage: API_BASE=https://your-api ENTITY_ID=1 node scripts/refresh-entity-surface.mjs
 */
const base = (process.env.API_BASE || process.env.API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const id = process.env.ENTITY_ID || process.argv[2] || "1";

const resp = await fetch(`${base}/api/entities/${id}/refresh-surface`, {
  method: "POST",
  signal: AbortSignal.timeout(120_000),
});
const text = await resp.text();
let json;
try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
console.log("status", resp.status);
console.log("companyName", json.companyName ?? null);
console.log("contactOutcome", json.contactOutcome ?? null);
console.log("secondary", json.secondary ?? null);
const contacts = Array.isArray(json.contacts) ? json.contacts : [];
console.log("contacts", contacts.length);
for (const c of contacts.slice(0, 30)) {
  console.log(`  [${c.mark}] ${c.label} | ${c.vectorType} | ${c.value}`);
}
if (resp.status >= 400) process.exitCode = 1;
