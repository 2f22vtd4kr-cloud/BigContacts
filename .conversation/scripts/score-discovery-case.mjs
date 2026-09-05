#!/usr/bin/env node
/**
 * Single-case discovery scorecard (karpathy-process metric, not overnight runner).
 * Usage:
 *   node scripts/score-discovery-case.mjs /path/to/case.json
 *   curl -s .../cases/N | node scripts/score-discovery-case.mjs -
 *
 * Score is fail-closed: only vectors with sourceUrls count.
 * Does not launch a cohort loop — that is deferred.
 */
import { readFileSync } from "node:fs";

const path = process.argv[2] || "-";
const raw = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
const body = JSON.parse(raw);
const file = body.caseFile
  ? (typeof body.caseFile === "string" ? JSON.parse(body.caseFile) : body.caseFile)
  : body;

const candidates = file.discoveredCandidates || [];
const links = file.entityLinks || [];
const footprint = file.orgFootprint || null;

const allEv = candidates.flatMap((c) => c.contactEvidence || []);
const has = (vt) => allEv.some((e) => e.vectorType === vt && (e.sourceUrls || []).length > 0);
const hasEmail = has("email");
const hasPhone = has("phone");
const hasWeb = has("website") || candidates.some((c) => (c.sourceUrls || []).some((u) => /^https?:\/\//i.test(u)));
const hasAddr = allEv.some((e) => e.vectorType === "other" && /\d/.test(String(e.value || "")) && (e.sourceUrls || []).length > 0);
const persons = candidates.filter((c) => c.type === "person" || c.type === "review_candidate");
const company = candidates.find((c) => c.type === "company");
// Agentic / bureau often attaches principals as contactEvidence.personName on the company
// candidate instead of separate person rows. Count those so relatedPeople is not false-negative.
const evidencePeople = new Set(
  allEv
    .map((e) => (e.personName || "").trim())
    .filter((n) => n.length >= 4 && n.split(/\s+/).length >= 2)
);

// Identity pollution heuristic: evidence host not matching company name tokens
const co = (company?.name || links[0]?.to || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
let pollution = 0;
for (const e of allEv) {
  for (const u of e.sourceUrls || []) {
    try {
      const host = new URL(u).hostname.replace(/^www\./, "").replace(/[^a-z0-9]/g, "");
      if (co.length >= 4 && !host.includes(co.slice(0, 5)) && !/bbb|sec\.gov|facebook|linkedin|opencorporates|google|bing/.test(u)) {
        pollution++;
      }
    } catch { /* ignore */ }
  }
}

const vectors = {
  email: hasEmail,
  phone: hasPhone,
  website: hasWeb,
  address: hasAddr,
  relatedPeople: persons.length >= 2 || links.length >= 1 || evidencePeople.size >= 1,
  entityLinks: links.length > 0,
  orgFootprintRecorded: !!footprint,
  zeroPollution: pollution === 0,
};

const points = Object.values(vectors).filter(Boolean).length;
const total = Object.keys(vectors).length;
const score = Math.round((points / total) * 100);

const out = {
  score,
  points,
  total,
  vectors,
  candidates: candidates.map((c) => c.name),
  entityLinks: links,
  orgFootprint: footprint,
  pollutionCount: pollution,
  note: "Fail-closed scorecard. Karpathy overnight cohort runner is not launched by this script.",
};
console.log(JSON.stringify(out, null, 2));
// Always exit 0 on successful parse so overnight execSync does not treat low scores as hard failures.
// Use vectors/score in JSON for keep/discard; exit 1 only for unrecoverable input errors above.
process.exitCode = 0;
