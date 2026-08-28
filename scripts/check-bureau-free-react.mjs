#!/usr/bin/env node
/**
 * Static integrity guard for Apex Bureau's agentic Dig.
 *
 * This is deliberately narrow: it does not prescribe a research path. It only
 * fails when the Dig controller regresses into explicit force-hop/playbook
 * machinery or when its action surface disappears.
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname, "..");
const dig = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");

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
];

const failures = forbidden
  .filter((pattern) => pattern.test(source))
  .map((pattern) => pattern.toString());

const requiredActions = [
  'action: "web_search"',
  'action: "visit"',
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

console.log("OK: Bureau Dig retains free-ReAct action surface with no explicit force-hop/playbook markers");
