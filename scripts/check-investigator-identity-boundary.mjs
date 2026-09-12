import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corePath = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
if (!fs.existsSync(corePath)) throw new Error(`missing canonical Investigator core: ${corePath}`);

const source = fs.readFileSync(corePath, "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

// Deterministic page/tool extraction may expose facts and provenance, but it must not
// author person identity, candidate scope, or promotion. Those belong to the model's
// explicit action=done finding boundary.
const contactStart = source.indexOf("function extractContactFactsFromHtml(");
const loopStart = source.indexOf("export async function runAgenticWebResearch(");
const parseStart = source.indexOf("function parseAction(");
const contactEnd = loopStart > contactStart ? loopStart : source.length;
const loop = loopStart >= 0 ? source.slice(loopStart) : "";
const toolObservationRegion = source.slice(0, Math.max(0, parseStart));
const contact = contactStart >= 0 ? source.slice(contactStart, contactEnd) : "";

assert(contactStart >= 0, "canonical contact-facts observation extractor is missing or renamed without guard update.");
assert(loopStart >= 0, "canonical Investigator ReAct loop is missing or renamed without guard update.");
assert(parseStart >= 0, "canonical action parser boundary is missing or renamed without guard update.");

assert(!/personName:\s*targetName\b/.test(toolObservationRegion), "deterministic observation code inherits targetName as person identity.");
assert(!/personName:\s*name\b/.test(toolObservationRegion), "deterministic observation code inherits target name as person identity.");
assert(!/scope:\s*["']candidate["']/.test(contact), "contact-facts observation extractor authors candidate identity scope.");
assert(!/promotionDecision\s*:\s*["']promote["']/.test(toolObservationRegion), "deterministic observation code authors promotion decisions.");
assert(!/promotionReason\s*:/.test(toolObservationRegion), "deterministic observation code authors promotion reasons.");

// Candidate scope and person identity are accepted only from the explicit model finding
// payload parsed by action=done, never from the observation/tool boundary.
const doneRegion = parseStart >= 0 ? source.slice(parseStart, source.indexOf("async function callGroqJson(", parseStart)) : "";
assert(/action === ["']done["']/.test(doneRegion), "action parser has no explicit done boundary for model-authored findings.");
assert(/personName:\s*typeof f\.personName/.test(doneRegion), "model-authored personName is not confined to the explicit done parser boundary.");
assert(/scope:\s*f\.scope === ["']candidate["']/.test(doneRegion), "model-authored candidate scope is not confined to the explicit done parser boundary.");
assert(/modelFindings:\s*AgenticFinding\[\]/.test(source), "modelFindings persistence boundary is missing from the canonical result type.");

// The live ReAct loop must preserve the same separation after observations: tool results
// become observations, then the model chooses the next action/finding.
assert(/const action = parseAction\(llm\.raw\)/.test(loop) || /const action = parseAction\(llm\.raw\)/.test(source), "ReAct loop does not visibly cross the model action parser boundary.");
assert(/if \(action\.action === ["']done["']\)/.test(loop), "ReAct loop has no explicit model-controlled done branch.");

if (failures.length) {
  console.error("INVESTIGATOR IDENTITY BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("INVESTIGATOR IDENTITY BOUNDARY: PASS");
console.log("- deterministic observations do not inherit target identity");
console.log("- candidate/person scope remains model-authored");
console.log("- promotion remains outside deterministic observation extraction");
console.log("- explicit modelFindings/action=done boundary remains present");
