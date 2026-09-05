#!/usr/bin/env node
/**
 * Operator helper: POST refresh-surface for an entity and print contact marks.
 * Usage: API_BASE=https://your-api ENTITY_ID=1 node scripts/refresh-entity-surface.mjs
 * Proof target for Andrew-class recovery: org + related-person surface must appear.
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
const org = contacts.filter((c) => c.mark === "organization").length;
const related = contacts.filter((c) =>
  /^related-person:/i.test(String(c.value ?? "")) || /same filing\/issuer/i.test(String(c.label ?? ""))
).length;
const personal = contacts.filter((c) => c.mark === "personal").length;
const collision = contacts.filter((c) => c.identityCollisionRisk || /collision|weak match/i.test(String(c.label ?? ""))).length;
console.log("contacts", contacts.length, { personal, organization: org, relatedPerson: related, collision });
for (const c of contacts.slice(0, 40)) {
  const display = String(c.value ?? "").replace(/^related-person:/i, "");
  console.log(`  [${c.mark}] ${c.label} | ${c.vectorType} | ${display}`);
}
if (resp.status >= 400) process.exitCode = 1;
// Soft proof signal for Andrew-class: if companyName present, expect org or related surface
if (json.companyName && org + related === 0) {
  console.warn("WARN: companyName present but zero organization/related-person contacts after refresh");
}
