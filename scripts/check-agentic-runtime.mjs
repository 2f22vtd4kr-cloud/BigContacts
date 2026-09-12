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

assert(/INVESTIGATOR_LLM_CAPABILITY_POOL/.test(source), "Investigator capability pool is explicit");
assert(/const AGENTIC_ACTION_SCHEMA\s*=/.test(source) && /function parseAction/.test(source), "action schema/parser are fail-closed");
assert(/const MAX_ITER = 40/.test(source) && /Math\.min\(MAX_ITER, Math\.max\(1, requestedIterations\)\)/.test(source), "iteration ceiling is hard and caller input is clamped");
assert(/new AbortController\(\)/.test(source) && /input\.signal\?\.addEventListener\("abort", abortExternal/.test(source), "run-scoped cancellation is wired");
assert(/setTimeout\(\(\) => runController\.abort\(\), hardTimeoutMs\)/.test(source), "hard timeout aborts the run");
assert(/runController\.signal\.aborted/.test(source) && /input\.shouldCancel && await input\.shouldCancel\(\)/.test(source), "turn boundaries honor cancellation");
assert(/MAX_NETWORK_RESPONSE_BYTES/.test(source) && /readResponseTextCapped/.test(source), "network observations are bounded");
assert(/trajectoryRecords: AgenticTrajectoryRecord\[\]/.test(source), "structured trajectory is durable output");
assert(/runHolehe\(action\.email, \{ signal: runController\.signal \}\)/.test(source), "email footprint receives cancellation");
assert(/runMaigret\(action\.username, \{ signal: runController\.signal \}\)/.test(source), "Maigret receives cancellation");
assert(/runSherlock\(action\.username, \{ signal: runController\.signal \}\)/.test(source), "Sherlock receives cancellation");
assert(!/callGeminiJson|callNvidiaJson|GEMINI_API_KEY_|async function callGeminiJson\b|async function callNvidiaJson\b/.test(source), "Boss/Right-Hand providers are absent from Investigator runtime");
assert(!/orderedProviders\s*=/.test(source), "Investigator has no alternate-provider fallback list");
assert(/const fn = selectedInvestigatorLlm === "groq"/.test(source), "selected Investigator reaches direct provider boundary");
assert(/investigatorLlm\?: "groq" \| "mistral"/.test(source), "selected Investigator is explicit in ReAct input");
assert(/authorizePythonSandboxRequest/.test(python) && /const authorization = authorizePythonSandboxRequest/.test(python), "Python capability uses sandbox authorization");
assert(/capability: "network_osint"/.test(python) && /destinationPolicy: "approved-public-web-only"/.test(python), "Python OSINT egress policy is constrained");
assert(/state === "attested"/.test(python) && /allowedCapabilities\.includes\("network_osint"\)/.test(python), "Python availability requires attested capability");
assert(/function authorizePythonSandboxRequest/.test(sandbox) && /attested/.test(sandbox), "sandbox contract defines attestation boundary");
for (const name of ["runHolehe", "runMaigret", "runSherlock", "runTheHarvester"]) {
  assert(new RegExp(`${name}[\\s\\S]*?authorizeNetworkPython`).test(python), `${name} is governed by sandbox authorization`);
}
assert(/available: false/.test(python), "Python capabilities default unavailable");
assert(/return \{ holehe: enabled, maigret: enabled, sherlock: enabled, theHarvester: enabled, openDeepResearch: enabled \}/.test(python), "Python availability derives from attested capability");
assert(/Compatibility shim only/.test(shim) && /export \* from "\.\.\/\.\.\/api-server\/src\/src\/lib\/agentic-web-research\.ts"/.test(shim), "apex-runtime is compatibility-only");

// The historical source mutator is deliberately retired. Keeping this assertion
// prevents a future change from silently reintroducing a deterministic mutation
// pass that encoded Investigator provider fallback or research strategy.
assert(/RETIRED:/.test(hardener) && /must not mutate Apex source/.test(hardener), "historical concurrency hardener remains non-executable");
assert(!/push\(`PERSON:/.test(hardener), "retired hardener does not manufacture PERSON findings");

// The live audit must exercise the current architecture: an explicit Groq/Mistral
// generation preflight, then a real discovery-first Atlas launch with research
// enabled. Do not encode the old `digReady` variable or a specific provider order.
assert(/async function probe\(url,key,model,provider\)/.test(workflow), "live audit performs an actual Investigator-provider generation preflight");
assert(/api\.groq\.com\/openai\/v1\/chat\/completions/.test(workflow) && /api\.mistral\.ai\/v1\/chat\/completions/.test(workflow), "live audit covers the explicit Investigator provider pool");
assert(/Reply READY only\./.test(workflow) && /max_tokens:32/.test(workflow), "provider preflight is a bounded generation, not a search strategy");
assert(/Launch bounded 3-target discovery-first smoke/.test(workflow) && /"discoveryFirst":true/.test(workflow) && /"runResearch":true/.test(workflow), "live audit launches the real discovery-first research path");
assert(/POST http:\/\/127\.0\.0\.1:8080\/api\/ingest\/atlas-run/.test(workflow), "live audit invokes the canonical Atlas launch route");
assert(/node scripts\/audit-live-bureau\.mjs/.test(workflow), "live audit applies the research-quality/provenance verifier after execution");
assert(/discoveryModel/.test(liveAudit) && /discoveryTools/.test(liveAudit) && /actual web tooling/.test(liveAudit), "live verifier requires model-selected discovery with actual web tooling");
assert(/discoveryAgent !== true/.test(liveAudit) && /sourceUrls/.test(liveAudit), "live verifier requires discovery admission provenance");

for (const [label, pattern] of [
  ["stagnation nudge", /\[STAGNATION\]/],
  ["first-search completion gate", /done_rejected \(no research yet\)/],
  ["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],
  ["Gemini temperature clamp", /generationConfig:[\s\S]{0,250}temperature:\s*0\.25/],
  ["forced initial web search", /Begin\. Choose an initial web_search query/],
]) assert(!pattern.test(source), `${label} is absent`);

if (failures.length) {
  console.error("AGENTIC RUNTIME: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AGENTIC RUNTIME: PASS — Investigator authority, cancellation, capability gating, bounded live execution and autonomy invariants align");
