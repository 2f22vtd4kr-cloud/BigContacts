import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corePath = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
if (!fs.existsSync(corePath)) throw new Error(`missing canonical Investigator core: ${corePath}`);

const source = fs.readFileSync(corePath, "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

// Deterministic page/tool extraction may expose facts and provenance, but it must not
// inherit the input target as a person identity. Identity attribution belongs to the
// Investigator model's explicit done/promotion decision.
const proxyStart = source.indexOf("function findingsFromProxyPage(");
const contactStart = source.indexOf("function extractContactFactsFromHtml(");
const loopStart = source.indexOf("export async function runAgenticWebResearch(");
const proxyEnd = contactStart > proxyStart ? contactStart : source.length;
const contactEnd = loopStart > contactStart ? loopStart : source.length;
const proxy = proxyStart >= 0 ? source.slice(proxyStart, proxyEnd) : "";
const contact = contactStart >= 0 ? source.slice(contactStart, contactEnd) : "";
const loop = loopStart >= 0 ? source.slice(loopStart) : "";

assert(proxyStart >= 0, "canonical proxy observation extractor is missing or renamed without guard update.");
assert(contactStart >= 0, "canonical contact-facts observation extractor is missing or renamed without guard update.");
assert(loopStart >= 0, "canonical Investigator ReAct loop is missing or renamed without guard update.");

assert(!/personName:\s*targetName\b/.test(proxy), "proxy extractor inherits targetName as person identity.");
assert(!/personName:\s*targetName\b/.test(contact), "contact-facts extractor inherits targetName as person identity.");
assert(!/personName:\s*name\b/.test(loop), "ReAct tool observation branches inherit the target name as person identity.");

// Candidate scope is an identity claim too. Deterministic observations may use unknown/
// organization scope, but candidate scope must not be manufactured solely from target input.
assert(!/scope:\s*["']candidate["'][\s\S]{0,220}personName:\s*(?:targetName|name)\b/.test(proxy), "proxy observation manufactures candidate scope together with inherited target identity.");
assert(!/scope:\s*["']candidate["'][\s\S]{0,220}personName:\s*(?:targetName|name)\b/.test(contact), "contact-facts observation manufactures candidate scope together with inherited target identity.");
assert(!/personName:\s*name\b[\s\S]{0,220}scope:\s*["']candidate["']/.test(loop), "ReAct tool observation manufactures candidate identity from target input.");

// Preserve the real boundary: only explicit model findings are eligible for persistence.
assert(/modelFindings:\s*AgenticFinding\[\]/.test(source), "modelFindings persistence boundary is missing from the canonical result type.");
assert(/action=done|action === ["']done["']/.test(source), "canonical Investigator has no explicit done action boundary.");

if (failures.length) {
  console.error("INVESTIGATOR IDENTITY BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("INVESTIGATOR IDENTITY BOUNDARY: PASS");
console.log("- deterministic observations do not inherit target identity");
console.log("- candidate/person scope remains model-authored");
console.log("- explicit modelFindings/action=done boundary remains present");
