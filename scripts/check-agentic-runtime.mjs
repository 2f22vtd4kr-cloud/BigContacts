import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const python = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const sandbox = fs.readFileSync("artifacts/api-server/src/src/lib/python-sandbox-contract.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
const shim = fs.readFileSync("artifacts/apex-runtime/lib/agentic-web-research.ts", "utf8");
const hardener = fs.readFileSync("scripts/apply-agentic-concurrency-hardening.mjs", "utf8");
const liveAudit = fs.readFileSync("scripts/audit-live-bureau.mjs", "utf8");
const failures = [];
const assert = (ok, name) => { if (!ok) failures.push(name); };
assert(/getAvailableInvestigatorCapabilities/.test(source) && /investigatorCapabilityKeyName/.test(source), "Investigator capability registry is explicit");
assert(/const AGENTIC_ACTION_SCHEMA\s*=/.test(source) && /function parseAction/.test(source), "action schema/parser are fail-closed");
assert(/include_reasoning:\s*false/.test(source) && !/reasoning_format:\s*"hidden"/.test(source), "GPT-OSS Investigator uses include_reasoning instead of unsupported reasoning_format");
assert(/targetType:\s*\{/.test(source) && /profile:\s*\{/.test(source) && /locale:\s*\{/.test(source) && /market:\s*\{/.test(source), "strict Investigator action schema exposes all parsed action fields");
assert(/inferResearchCognitiveTask/.test(source) && /const cognitiveTask = input\.cognitiveTask \?\? inferResearchCognitiveTask/.test(source), "Investigator reasoning mode is routed from live cognitive state");
assert(/const MAX_ITER = 64/.test(source), "Investigator iteration count has the bounded runtime ceiling");
assert(/Math\.min\(Math\.max\(0, requestedIterations\), MAX_ITER\)/.test(source), "caller input is bounded by the runtime action ceiling");
assert(/Math\.min\(Math\.max\(0, requestedIterations\), MAX_ITER\)/.test(source), "caller iteration input is clamped fail-closed to the bounded runtime action ceiling");
assert(/new AbortController\(\)/.test(source) && /input\.signal\?\.addEventListener\("abort", abortExternal/.test(source), "run-scoped cancellation is wired");
assert(/setTimeout\(\(\) => runController\.abort\(\), hardTimeoutMs\)/.test(source), "hard timeout aborts the run");
assert(/runController\.signal\.aborted/.test(source) && /input\.shouldCancel && await input\.shouldCancel\(\)/.test(source), "turn boundaries honor cancellation");
assert(/MAX_NETWORK_RESPONSE_BYTES/.test(source) && /readResponseTextCapped/.test(source), "network observations are bounded");
assert(/trajectoryRecords: AgenticTrajectoryRecord\[\]/.test(source), "structured trajectory is durable output");
assert(/priorContext\?: string/.test(source) && /priorContext: input\.priorContext/.test(source), "durable case context has a separate bounded prompt layer");
assert(!/SHARED INVESTIGATION CONTEXT — CASE STATE, NOT SOURCE INSTRUCTIONS/.test(source), "Investigator core does not duplicate mounted case context inside objective");
assert(/runHolehe\(action\.email, \{ signal: runController\.signal \}\)/.test(source), "email footprint receives cancellation");
assert(/runMaigret\(action\.username, \{ signal: runController\.signal \}\)/.test(source), "Maigret receives cancellation");
assert(/runSherlock\(action\.username, \{ signal: runController\.signal \}\)/.test(source), "Sherlock receives cancellation");
assert(/runTheHarvester\(action\.domain, undefined, \{ signal: runController\.signal \}\)/.test(source), "theHarvester receives cancellation");
assert(!/callGeminiJson|callNvidiaJson|GEMINI_API_KEY_|async function callGeminiJson\b|async function callNvidiaJson\b/.test(source), "Boss/Right-Hand providers are absent from Investigator runtime");
assert(!/orderedProviders\s*=/.test(source), "Investigator has no alternate-provider fallback list");
assert(/const fn = selectedInvestigatorLlm && investigatorCapabilityKeyName\(selectedInvestigatorLlm\)/.test(source) && /callGroqJson\(promptValue, signalValue, cognitiveTask, selectedInvestigatorLlm(?:,|\))/.test(source), "selected Investigator capability remains a direct provider boundary argument");
assert(/investigatorLlm\?: InvestigatorCapability/.test(source), "selected Investigator capability is explicit in ReAct input");
assert(/authorizePythonSandboxRequest/.test(python) && /const authorization = authorizePythonSandboxRequest/.test(python), "Python capability uses sandbox authorization");
assert(/capability: "network_osint"/.test(python) && /destinationPolicy: "approved-public-web-only"/.test(python), "Python OSINT egress policy is constrained");
assert(/state === "attested"/.test(python) && /allowedCapabilities\.includes\("network_osint"\)/.test(python), "Python availability requires attested capability");
assert(/function authorizePythonSandboxRequest/.test(sandbox) && /attested/.test(sandbox), "sandbox contract defines attestation boundary");
function exportedAsyncFunctionSegment(sourceText, name) {
  const marker = `export async function ${name}(`;
  const start = sourceText.indexOf(marker);
  if (start < 0) return "";
  const nextExport = sourceText.indexOf("\nexport async function ", start + marker.length);
  return sourceText.slice(start, nextExport < 0 ? undefined : nextExport);
}
function hasFailClosedPythonSandboxGate(sourceText, name) {
  const toolSource = exportedAsyncFunctionSegment(sourceText, name);
  return /const blocked = authorizeNetworkPython\(options\.signal\);\s*if \(blocked\) return \{ \.\.\.base, error: blocked \}/.test(toolSource);
}
const unguardedPythonToolFixture = [
  "export async function runHolehe(email) { return { available: false }; }",
  "export async function runMaigret(username, options = {}) { const blocked = authorizeNetworkPython(options.signal); if (blocked) return { ...base, error: blocked }; return base; }",
].join("\n");
assert(!hasFailClosedPythonSandboxGate(unguardedPythonToolFixture, "runHolehe"), "Python sandbox check cannot borrow a later tool’s authorization call");
const ignoredAuthorizationFixture = "export async function runHolehe(email, options = {}) { const blocked = authorizeNetworkPython(options.signal); return { available: false }; }";
assert(!hasFailClosedPythonSandboxGate(ignoredAuthorizationFixture, "runHolehe"), "Python sandbox authorization must fail closed, not merely invoke the helper");
for (const name of ["runHolehe", "runMaigret", "runSherlock", "runTheHarvester"]) assert(hasFailClosedPythonSandboxGate(python, name), `${name} fails closed on sandbox authorization within its own function`);
assert(/Compatibility shim only/.test(shim) && /export \* from "\.\.\/\.\.\/api-server\/src\/src\/lib\/agentic-web-research\.ts"/.test(shim), "apex-runtime is compatibility-only");
assert(/RETIRED:/.test(hardener) && /must not mutate Apex source/.test(hardener), "historical concurrency hardener remains non-executable");
assert(!/push\(`PERSON:/.test(hardener), "retired hardener does not manufacture PERSON findings");
assert(!/Provider generation preflight/.test(workflow), "live audit does not bypass the canonical provider path with a separate preflight");
assert(/GROQ_INVESTIGATOR_API_KEY:/.test(workflow) && /GROQ_RIGHT_HAND_API_KEY:/.test(workflow) && !/MISTRAL_API_KEY|MISTRAL_RIGHT_HAND_API_KEY/.test(workflow), "live audit exposes the explicit Groq Investigator and Right-hand credential pools to the canonical runtime");
assert(/Launch bounded 3-target UI-equivalent smoke/.test(workflow) && /"targetCount":3/.test(workflow) && /"researchDepth":"standard"/.test(workflow) && /"targetTimeoutMs":420000/.test(workflow) && !/"discoveryFirst":true/.test(workflow), "live audit matches the authorized UI-equivalent Atlas launch contract");
assert(/POST http:\/\/127\.0\.0\.1:8080\/api\/ingest\/atlas-run/.test(workflow), "live audit invokes the canonical Atlas launch route");
assert(/node scripts\/audit-live-bureau\.mjs/.test(workflow), "live audit applies the research-quality/provenance verifier after execution");
assert(/discoveryModel/.test(liveAudit) && /discoveryTools/.test(liveAudit) && /actual web tooling/.test(liveAudit), "live verifier requires model-selected discovery with actual web tooling");
assert(/discoveryAgent !== true/.test(liveAudit) && /sourceUrls/.test(liveAudit), "live verifier requires discovery admission provenance");
for (const [label, pattern] of [["stagnation nudge", /\[STAGNATION\]/],["first-search completion gate", /done_rejected \(no research yet\)/],["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],["Gemini temperature clamp", /generationConfig:[\s\S]{0,250}temperature:\s*0\.25/],["forced initial web search", /Begin\. Choose an initial web_search query/]]) assert(!pattern.test(source), `${label} is absent`);
if (failures.length) { console.error("AGENTIC RUNTIME: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("AGENTIC RUNTIME: PASS — Investigator authority, cancellation, capability gating, bounded live execution and autonomy invariants align");
