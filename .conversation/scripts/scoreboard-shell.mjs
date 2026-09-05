#!/usr/bin/env node
/**
 * Offline scoreboard shell + optional scoring (Vol 68/76/87/100).
 * Usage:
 *   node scripts/scoreboard-shell.mjs
 *   node scripts/scoreboard-shell.mjs --score examples
 * Paste live card fields after Replit re-cook into COMPARE_*.md.
 */

const FIXTURES = [
  { id: "A1", class: "A-notice", name: "Notice-line SC13 class", notes: "expect EDGAR-Notice-Phone candidate" },
  { id: "A2", class: "A-notice", name: "Notice-line variant", notes: "" },
  { id: "B1", class: "B-issuer", name: "Issuer HQ only", notes: "expect organization_contact" },
  { id: "B2", class: "B-issuer", name: "Issuer + dig org", notes: "agentic-web-org → org outcome" },
  { id: "C1", class: "C-collision", name: "Common surname trap", notes: "must not wrong-person direct" },
  { id: "C2", class: "C-collision", name: "Aggregator host", notes: "identity collision" },
  { id: "D1", class: "D-empty", name: "Thin public surface", notes: "empty card OK if baseline also empty" },
  { id: "D2", class: "D-social", name: "LinkedIn only", notes: "social_only" },
];

/** Mirrors scoreboard-rubric.ts pure logic for offline node use */
function scoreFixtureCard(input) {
  if (input.wrongPerson || input.identityCollisionRisk) return -1;
  const outcome = String(input.contactOutcome ?? "none");
  const hasContact = Boolean((input.phone || "").trim() || (input.email || "").trim());
  if (input.baselineBetterPrimary && !hasContact) return 0;
  if (
    (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
    hasContact &&
    input.hasSourceUrls !== false &&
    !String(input.phoneSource ?? "").endsWith("-org") &&
    input.phoneSource !== "agentic-web-org"
  ) {
    return 2;
  }
  if (outcome === "organization_contact" && hasContact) return 1;
  if (outcome === "social_only" && (input.linkedinUrl || "").trim()) return 1;
  if (hasContact && outcome !== "none") return 1;
  if (input.baselineBetterPrimary) return 0;
  return 0;
}

function meanScore(scores) {
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function passesScoreboardMilestone(scores) {
  if (scores.length < 8) return false;
  if (scores.some((s) => s === -1)) return false;
  return meanScore(scores) >= 1.0;
}

const EXAMPLES = [
  { id: "ex1", contactOutcome: "organization_contact", phone: "+1 202", phoneSource: "EDGAR-Phone", hasSourceUrls: true },
  { id: "ex2", contactOutcome: "direct_contact_candidate", phone: "+1 609", phoneSource: "EDGAR-Notice-Phone", hasSourceUrls: true },
  { id: "ex3", contactOutcome: "direct_contact_candidate", phone: "+1 408", phoneSource: "agentic-web-org", hasSourceUrls: true },
  { id: "ex4", contactOutcome: "evidence_only", hasSourceUrls: false, baselineBetterPrimary: true },
  { id: "ex5", contactOutcome: "direct_contact_candidate", phone: "+1 999", phoneSource: "agentic-web", wrongPerson: true },
  { id: "ex6", contactOutcome: "social_only", linkedinUrl: "https://linkedin.com/in/x", hasSourceUrls: true },
  { id: "ex7", contactOutcome: "organization_contact", phone: "+44", phoneSource: "CompaniesHouse-Phone", hasSourceUrls: true },
  { id: "ex8", contactOutcome: "direct_contact_candidate", phone: "+1 212", phoneSource: "agentic-web", hasSourceUrls: true },
];

const mode = process.argv[2];

if (mode === "--score" || mode === "examples") {
  console.log("# Scoreboard rubric self-check (examples)");
  const scores = [];
  for (const row of EXAMPLES) {
    const s = scoreFixtureCard(row);
    scores.push(s);
    console.log(`${row.id}\tscore=${s}\toutcome=${row.contactOutcome}\tsource=${row.phoneSource ?? "—"}`);
  }
  console.log(`mean=${meanScore(scores).toFixed(2)} milestone=${passesScoreboardMilestone(scores) ? "PASS" : "FAIL"}`);
  console.log("Expected: ex5=-1 (wrong person); ex3=1 not 2 (org dig); ex2/ex8=2");
  process.exit(0);
}

console.log("# Apex Atlas scoreboard shell");
console.log("Tip SHA: fill after git rev-parse HEAD");
console.log("integrity: fill from /healthz bureauIntegrity");
console.log("");
console.log("| id | class | name | outcome | phone | phoneSource | score | notes |");
console.log("|----|-------|------|---------|-------|-------------|-------|-------|");
for (const f of FIXTURES) {
  console.log(`| ${f.id} | ${f.class} | ${f.name} |  |  |  |  | ${f.notes} |`);
}
console.log("");
console.log("Scoring: -1 wrong person · 0 empty/loss · 1 org/social/tie · 2 attributable direct");
console.log("Milestone: ≥8 fixtures, mean ≥ 1.0, zero -1s");
console.log("Self-check: node scripts/scoreboard-shell.mjs --score");
