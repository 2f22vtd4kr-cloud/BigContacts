#!/usr/bin/env node
/**
 * Idempotent: strengthen buildBossOpeningPrompt with primary-source OSINT discipline.
 * Run: node scripts/apply-boss-opening-osint.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");

const marker = "Operate with trained OSINT discipline even on the opening pass:";
let text = fs.readFileSync(target, "utf8");
if (text.includes(marker)) {
  console.log("apply-boss-opening-osint: already applied");
  process.exit(0);
}

const insertAt = text.indexOf("Opening research must:\n1. Discover promising candidates");
if (insertAt < 0) {
  console.error("apply-boss-opening-osint: fallback marker not found");
  process.exit(1);
}
const discipline = `Operate with trained OSINT discipline even on the opening pass:
- Plan multi-angle public searches (not one superficial query).
- Prefer primary sources (official sites, registries, filings, named articles) and fetch them rather than stopping at snippets.
- Extract named entities, organizations, roles, and any public contact routes with exact source URLs.
- Separate personal vs organization contacts; label uncertainty and identity collisions.
- Record negative findings and search gaps.
- Produce output that can seed the living case context document (entities, contact vectors, relationships, research log, open questions).

`;
text = text.slice(0, insertAt) + discipline + text.slice(insertAt);
text = text.replace(
  "You are the Boss Investigator opening a new discovery-first public-web research case.",
  "You are the Boss Investigator opening a new discovery-first public-web research case for Apex Atlas (Case Bureau).",
);
text = text.replace(
  "5. Recommend the strongest next investigation directions after the first broad pass.",
  "5. Recommend the strongest next investigation directions after the first broad pass (primary-source follow-ups preferred).",
);
text = text.replace(
  "- strongest next research directions\n\nDo not claim that a person is wealthy",
  "- strongest next research directions (with suggested primary sources / vectors)\n\nDo not claim that a person is wealthy",
);
if (!text.includes("Do not invent contacts, names, or URLs.")) {
  text = text.replace(
    "Do not claim that a person is wealthy, connected, or reachable unless the public evidence supports that specific claim.`;",
    "Do not claim that a person is wealthy, connected, or reachable unless the public evidence supports that specific claim. Do not invent contacts, names, or URLs.`;",
  );
}

fs.writeFileSync(target, text);
console.log("apply-boss-opening-osint: applied", target);
