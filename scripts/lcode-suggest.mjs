#!/usr/bin/env node
/**
 * CLI L-code triage (Vol 402–406). Usage:
 *   node scripts/lcode-suggest.mjs --phone '+1…' --source EDGAR-Phone --better-public
 *   node scripts/lcode-suggest.mjs --no-dig
 *   node scripts/lcode-suggest.mjs --evidence 3
 */
function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i < 0) return def;
  if (name.startsWith("--") && (name === "--better-public" || name === "--no-dig" || name === "--script" || name === "--critical" || name === "--wrong-person")) {
    return true;
  }
  return process.argv[i + 1] ?? def;
}
const has = (name) => process.argv.includes(name);

// Inline pure logic (keep in sync with lcode-suggest.ts)
function suggestLcode(input) {
  if (input.integrityCritical) return "L-INTEGRITY";
  if (input.forceScriptDetected) return "L-SCRIPT";
  if (input.wrongPerson) return "L-COLLISION";
  const hadDig = Boolean(input.hadSearchSpan || input.hadVisitSpan);
  if (!hadDig) return "L-NO-DIG";
  const hasCard = Boolean((input.cardPhone || "").trim() || (input.cardEmail || "").trim());
  const evidenceN = input.evidenceContactCount ?? 0;
  if (!hasCard && evidenceN > 0) return "L-EMPTY";
  if (!hasCard && hadDig) return "L-EMPTY";
  const src = String(input.phoneSource ?? "");
  const issuerLike = src === "EDGAR-Phone" || src === "EDGAR-Issuer-Phone" || src === "CompaniesHouse-Phone";
  if (issuerLike && input.betterPublicRouteKnown) return "L-ISSUER";
  const outcome = String(input.contactOutcome ?? "");
  if (
    (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
    (src === "agentic-web-org" || src.endsWith("-org") || issuerLike)
  ) {
    return "L-ORG-AS-DIRECT";
  }
  return "none";
}

const noDig = has("--no-dig");
const out = suggestLcode({
  hadSearchSpan: !noDig,
  hadVisitSpan: !noDig,
  cardPhone: arg("--phone"),
  cardEmail: arg("--email"),
  phoneSource: arg("--source"),
  contactOutcome: arg("--outcome"),
  evidenceContactCount: arg("--evidence") != null ? Number(arg("--evidence")) : 0,
  betterPublicRouteKnown: has("--better-public"),
  forceScriptDetected: has("--script"),
  integrityCritical: has("--critical"),
  wrongPerson: has("--wrong-person"),
});
console.log(out);
