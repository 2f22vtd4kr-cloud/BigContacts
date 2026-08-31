import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "artifacts", "apex-finder", "src");
const files = {
  model: path.join(src, "lib", "reactor-live-model.ts"),
  surface: path.join(src, "components", "reactor-live-surface.tsx"),
  bureau: path.join(src, "components", "bureau-ops-stage.tsx"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Missing Reactor Live source: ${name} (${file})`);
}

const read = (file) => fs.readFileSync(file, "utf8");
const model = read(files.model);
const surface = read(files.surface);
const bureau = read(files.bureau);

const syntheticQueryPatterns = [
  /`\$\{\s*e\.targetName\s*\}\s+contact\s+email\s+phone/i,
  /`\$\{\s*event\.targetName\s*\}\s+contact\s+email\s+phone/i,
  /targetName\s*\?\s*`[^`]*(?:contact|email|phone|search\s+for)[^`]*`/i,
  /targetName\s*\?\s*["'][^"']*(?:contact|email|phone|search\s+for)[^"']*["']/i,
];

const checks = [
  ["live model has explicit research-query extraction", /explicitResearchQuery/.test(model)],
  ["live model rejects non-HTTP evidence", /https\?:/.test(model) && /sourceList/.test(model)],
  ["live surface renders semantic events rather than raw logs", /eventIsRenderable/.test(surface)],
  ["browser scene uses an event-backed URL", /event\.url|sourceList\(event\)/.test(surface)],
  ["browser scene identifies itself as an Apex research view", /Apex research view/.test(surface)],
  ["query playback is presentation-only and uses recorded text", /useTypedPlayback/.test(surface) && /explicitResearchQuery/.test(surface)],
  ["source links are rendered from event evidence", /sourceList\(event\)/.test(surface)],
  ["desktop/mobile stage delegates to the semantic renderer", /ReactorLiveSurface/.test(bureau)],
  ["legacy stage extracts queries only from explicit query/search text", /function recordedQuery/.test(bureau)],
  ["legacy stage contains no target-name synthetic query", !syntheticQueryPatterns.some((pattern) => pattern.test(bureau))],
  ["legacy stage does not manufacture a Google URL", !/google\.com\/search\?q=\$\{.*target/i.test(bureau)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (/chain[- ]of[- ]thought|hidden reasoning|private reasoning/i.test(surface)) {
  console.error("FAIL  hidden reasoning language detected in Reactor Live surface");
  failed = true;
} else {
  console.log("PASS  Reactor Live surface does not expose hidden reasoning");
}

if (failed) process.exit(1);
console.log(`\nReactor Live integrity contract: ${checks.length + 1} checks passed.`);
