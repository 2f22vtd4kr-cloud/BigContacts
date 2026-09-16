import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const python = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const sandbox = fs.readFileSync("artifacts/api-server/src/src/lib/python-sandbox-contract.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-canonical-live-proof-v3.yml", "utf8");
const rightHand = fs.readFileSync("artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts", "utf8");
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
assert(!/orderedProviders\s*=/.test(source), "Investigator core has no alternate-provider fallback list");
assert(!/TRANSPORT FALLBACK:|groq->mistral|investigatorLlm: \"mistral\"/.test(wrapper), "Investigator wrapper has no sequential Groq-to-Mistral fallback");
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
assert(/RETIRED:/.test(hardener) && /must not mutate Apex source/.test(hardener), "historical concurrency hardener remains non-executable");
assert(!/push\(`PERSON:/.test(hardener), "retired hardener does not manufacture PERSON findings");

// DeepSeek is the mandatory Right Hand in production. Keep its transport contract
// explicit in the source guard so a coordination checker cannot silently drift.
assert(/deepseek-ai\/deepseek-v4-flash-0731/.test(rightHand), "DeepSeek production model is canonical");
assert(/https:\/\/integrate\.api\.nvidia\.com\/v1\/chat\/completions/.test(rightHand), "DeepSeek production endpoint is canonical");
assert(/temperature:\s*1/.test(rightHand) && /top_p:\s*0\.95/.test(rightHand), "DeepSeek production sampling contract is exact");
assert(/max_tokens:\s*16384/.test(rightHand), "DeepSeek production token budget is exact");
assert(/reasoning_effort:\s*\"high\"/.test(rightHand) && /stream:\s*false/.test(rightHand), "DeepSeek production reasoning/stream contract is exact");
assert(/response\.status === 202/.test(rightHand) && /integrate\.api\.nvidia\.com\/v1\/status\//.test(rightHand), "DeepSeek production client polls NVIDIA asynchronous 202 responses");

// Static contract only: the live proof must contain a real runtime/evidence gate.
// The actual external-provider result belongs to the live-proof job, not this source guard.
assert(/Provider readiness/.test(workflow), "canonical live proof performs provider readiness");
assert(/generativelanguage\.googleapis\.com/.test(workflow) && /integrate\.api\.nvidia\.com/.test(workflow), "canonical live proof covers mandatory Gemini and DeepSeek control-plane providers");
assert(/api\.groq\.com\/openai\/v1\/chat\/completions/.test(workflow) && /api\.mistral\.ai\/v1\/chat\/completions/.test(workflow), "canonical live proof covers the explicit Investigator provider pool");
assert(/Reply READY only\./.test(workflow) && /max_tokens:8/.test(workflow), "provider readiness is a bounded generation, not a research strategy");
assert(/v1\/status\//.test(workflow) && /r\.status === 202/.test(workflow), "live proof polls asynchronous NVIDIA readiness responses");
assert(/Open fresh discovery case/.test(workflow) && /POST http:\/\/127\.0\.0\.1:8080\/api\/research\/bureau\/cases/.test(workflow), "canonical live proof opens a real durable discovery case");
assert(/Start canonical case discovery/.test(workflow) && /\/run-discovery/.test(workflow), "canonical live proof invokes the canonical discovery route");
assert(/Enforce genuine live evidence gate/.test(workflow) && /hasSearch/.test(workflow) && /hasVisit/.test(workflow) && /sourceBacked/.test(workflow), "canonical live proof requires genuine search, visit, and source-backed evidence");
assert(/canonical-discovery-failure-boundary\.test\.ts/.test(workflow), "canonical live proof includes the discovery failure regression test");
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
