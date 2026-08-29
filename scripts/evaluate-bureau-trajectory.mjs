#!/usr/bin/env node
/**
 * Evaluate a recorded Apex Bureau Dig trajectory without judging the research
 * answer itself. This is intentionally deterministic and model-agnostic.
 *
 * Input: JSON array of steps, or {steps:[...]}. Each step should contain
 * action and may contain provider, summary, query, url, findings, forced.
 *
 * The evaluator answers: did the recorded run actually contain model/tool
 * decisions and useful trajectory variation, and did it avoid explicit forced
 * research markers? It does NOT declare Apex better than a baseline.
 */

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/evaluate-bureau-trajectory.mjs <trajectory.json>");
  process.exit(2);
}

const raw = fs.readFileSync(file, "utf8");
const input = JSON.parse(raw);
const steps = Array.isArray(input) ? input : input?.steps;
if (!Array.isArray(steps)) {
  console.error("FAIL: trajectory must be an array or {steps:[]}");
  process.exit(2);
}

const actions = steps.map((s) => String(s?.action ?? "").toLowerCase()).filter(Boolean);
const allowed = new Set([
  "web_search", "visit", "browser_fetch", "footprint_email", "footprint_username",
  "domain_lookup", "harvest_domain", "registry_search", "reverse_whois", "done",
]);
const forbidden = /(force_(?:company|related|visit|search|hop)|groK-parity|mandatory|required)\s+(?:step|hop|search)/i;

const invalid = actions.filter((a) => !allowed.has(a));
const forced = steps.filter((s) => s?.forced === true || forbidden.test(JSON.stringify(s ?? {})));
const researchActions = actions.filter((a) => a !== "done");
const uniqueResearchActions = new Set(researchActions);
const searches = actions.filter((a) => a === "web_search").length;
const visits = actions.filter((a) => ["visit", "browser_fetch"].includes(a)).length;
const doneCount = actions.filter((a) => a === "done").length;

const result = {
  verdict: invalid.length || forced.length || !doneCount ? "FAIL" : "PASS",
  steps: steps.length,
  researchSteps: researchActions.length,
  uniqueResearchActions: uniqueResearchActions.size,
  searches,
  visits,
  doneCount,
  invalidActions: invalid,
  forcedMarkers: forced.length,
  modelChoiceEvidence: steps.filter((s) => typeof s?.thought === "string" || typeof s?.provider === "string").length,
  note: "Autonomy verdict only. Research quality requires a separate blind outcome comparison.",
};

console.log(JSON.stringify(result, null, 2));
if (result.verdict === "FAIL") process.exit(1);
