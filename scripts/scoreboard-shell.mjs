#!/usr/bin/env node
/**
 * Offline scoreboard shell — records fixture rows for COMPARE_*.md (Vol 68/76/87).
 * Usage: node scripts/scoreboard-shell.mjs
 * Does not call network; paste live card fields after Replit re-cook.
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
