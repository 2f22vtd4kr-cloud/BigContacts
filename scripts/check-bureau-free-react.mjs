#!/usr/bin/env node
/**
 * Static integrity guard for Apex Bureau's canonical agentic Dig.
 *
 * This guard inspects the actual ReAct core, not the thin SSRF wrapper. It does
 * not prescribe a research path; it only fails when the controller regresses
 * into explicit force-hop/playbook machinery or when its action surface or
 * free first-turn contract disappears.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const dig = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");

if (!fs.existsSync(dig)) {
  console.error(`FAIL: missing ${dig}`);
  process.exit(1);
}

const source = fs.readFileSync(dig, "utf8");
const forbidden = [
  /force_(?:company|related|visit|search|hop)/i,
  /GROK-PARITY/i,
  /force_company_surface/i,
  /(?:mandatory|required)\s+(?:step|hop|search)/i,
  /Begin\. Choose an initial web_search query/i,
  /Prefer\s+Serper.*Tavily.*Exa/i,
  /Serper\s*[→>-]+\s*Tavily\s*[→>-]+\s*Exa/i,
  /action === "footprint_username"/,
];

const failures = forbidden
  .filter((pattern) => pattern.test(source))
  .map((pattern) => pattern.toString());

const requiredActions = [
  'action: "web_search"',
  'action: "visit"',
  'action: "footprint_email"',
  'action: "footprint_username_maigret"',
  'action: "footprint_username_sherlock"',
  'action: "domain_lookup"',
  'action: "registry_search"',
  'action: "harvest_domain"',
  'action: "browser_fetch"',
  'action: "done"',
];

for (const marker of requiredActions) {
  if (!source.includes(marker)) failures.push(`missing action surface: ${marker}`);
}

if (failures.length) {
  console.error("FAIL: Bureau free-ReAct integrity regression");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: canonical Bureau Dig retains free-ReAct action surface with no explicit force-hop/playbook markers");
