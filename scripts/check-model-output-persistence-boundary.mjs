#!/usr/bin/env node
import fs from "node:fs";

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, "utf8");

const canonical = {
  target: read("artifacts/api-server/src/src/lib/target-contact-agent.ts"),
  bureau: read("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
  atlas: read("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"),
  discoveryRoute: read("artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts"),
};

const checks = [
  ["target uses strict persistence", canonical.target.includes("persistSourceBackedBureauContactsForEntity")],
  ["target never legacy-rehydrates a card", !canonical.target.includes("rehydrateEntityCardFromEvidence")],
  ["target never imports the legacy contact projector", !/from [\"']\.\/bureau-contact-persist[\"']/.test(canonical.target)],
  ["bureau uses strict persistence", canonical.bureau.includes("persistSourceBackedBureauContactsForEntity")],
  ["bureau never legacy-rehydrates a card", !canonical.bureau.includes("rehydrateEntityCardFromEvidence")],
  ["bureau never imports the legacy contact projector", !/from [\"']\.\/bureau-contact-persist[\"']/.test(canonical.bureau)],
  // Discovery is intentionally an admission/data-plane boundary. It must not
  // mutate trusted contact vectors. Trusted promotion occurs later only after
  // strict provenance validation by the target/bureau persistence boundary.
  ["canonical Atlas discovery does not directly promote trusted contacts", !canonical.atlas.includes("persistSourceBackedBureauContactsForEntity")],
  ["canonical case discovery does not directly promote trusted contacts", !canonical.discoveryRoute.includes("persistSourceBackedBureauContactsForEntity")],
  ["canonical Atlas discovery materializes review-only admissions", canonical.atlas.includes('reviewOnly: true') && canonical.atlas.includes('admission: "investigator-explicit-promotion"')],
  ["canonical Atlas discovery records observed source evidence", canonical.atlas.includes("sourceUrl") && canonical.atlas.includes("evidenceRows")],
  ["canonical case discovery does not use the non-strict contact projector", !/persistBureauContactsForEntity/.test(canonical.discoveryRoute)],
  ["canonical target has no direct contact-field card mutation", !/\.set\(\{[^}]*\b(?:email|phone|linkedinUrl|twitterHandle|instagramHandle|telegramHandle|personalWebsite)\s*:/.test(canonical.target)],
  ["canonical bureau has no direct contact-field card mutation", !/\.set\(\{[^}]*\b(?:email|phone|linkedinUrl|twitterHandle|instagramHandle|telegramHandle|personalWebsite)\s*:/.test(canonical.bureau)],
];

let failed = false;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failed = true; }
}

if (failed) process.exit(1);
console.log("MODEL-OUTPUT PERSISTENCE BOUNDARY: PASS — discovery remains review-only; trusted contact promotion is isolated behind strict provenance persistence");
