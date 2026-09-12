import fs from "node:fs";
const file = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
const source = fs.readFileSync(file, "utf8");
const pythonTools = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
const compatibilityHardener = fs.readFileSync("scripts/apply-agentic-runtime-hardening.mjs", "utf8");
const canonicalHardener = fs.readFileSync("scripts/apply-agentic-concurrency-hardening.mjs", "utf8");
const apexRuntimeShim = fs.readFileSync("artifacts/apex-runtime/lib/agentic-web-research.ts", "utf8");
if (!/^\/\*\*[\s\S]*Compatibility shim only[\s\S]*export \* from \"\.\.\/\.\.\/api-server\/src\/src\/lib\/agentic-web-research\.ts\";\s*$/m.test(apexRuntimeShim)) throw new Error("apex-runtime invariant failed: stale standalone agentic implementation is not quarantined to canonical production source");
const required = [
  ["investigator LLM capability pool is explicit", /INVESTIGATOR_LLM_CAPABILITY_POOL/],
  ["Dig action schema is present", /const AGENTIC_ACTION_SCHEMA\s*=/],
  ["Dig action JSON is fail-closed parsed", /function parseAction/],
  ["provider decision deadline is bounded", /PROVIDER_DECISION_TIMEOUT_MS/],
  ["provider decisions are bounded across concurrent targets", /MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS/],
  ["provider-slot wait is cancellation-aware", /acquireProviderSlot\(signal\?: AbortSignal\)/],
  ["run has a hard iteration ceiling", /const MAX_ITER = 40;/],
  ["caller iterations are clamped to the hard ceiling", /const maxIter = Math\.min\(MAX_ITER, Math\.max\(1, requestedIterations\)\)/],
  ["run has a run-scoped AbortController", /const runController = new AbortController\(\)/],
  ["hard timeout aborts the run", /setTimeout\(\(\) => runController\.abort\(\), hardTimeoutMs\)/],
  ["external cancellation is wired into the run", /input\.signal\?\.addEventListener\("abort", abortExternal/],
  ["cooperative cancellation is checked at the turn boundary", /for \(let i = 0; i < maxIter; i\+\+\) \{[\s\S]{0,700}if \(runController\.signal\.aborted\)[\s\S]{0,900}if \(input\.shouldCancel && await input\.shouldCancel\(\)\)/],
  ["browser escalation receives run cancellation", /browserFetchHtml\(action\.url, \{ signal: runController\.signal \}\)/],
  ["provider HTTP response reads are bounded", /MAX_NETWORK_RESPONSE_BYTES/],
  ["browser/tool observations distinguish failed provenance", /execution=\$\{page\.status\}/],
  ["structured trajectory is durable output", /trajectoryRecords: AgenticTrajectoryRecord\[\]/],
  ["email footprint receives the run signal", /runHolehe\(action\.email, \{ signal: runController\.signal \}\)/],
  ["username footprint receives the run signal", /runMaigret\(action\.username, \{ signal: runController\.signal \}\)/],
  ["supplementary username footprint receives the run signal", /runSherlock\(action\.username, \{ signal: runController\.signal \}\)/],
];
for (const [label, pattern] of required) if (!pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
const pythonBoundaryRequired = [
  ["Python OSINT source explicitly fails closed", /const PYTHON_OSINT_EGRESS_GOVERNED = false;/],
  ["Python OSINT quarantine names the missing sandbox boundary", /subprocess network egress is not yet governed by the Apex sandbox\/egress boundary/],
  ["Holehe is source-gated", /runHolehe\([\s\S]{0,260}if \(!PYTHON_OSINT_EGRESS_GOVERNED\) return \{ \.\.\.base, error: PYTHON_OSINT_EGRESS_ERROR \};/],
  ["Maigret is source-gated", /runMaigret\([\s\S]{0,260}if \(!PYTHON_OSINT_EGRESS_GOVERNED\) return \{ \.\.\.base, error: PYTHON_OSINT_EGRESS_ERROR \};/],
  ["Sherlock is source-gated", /runSherlock\([\s\S]{0,260}if \(!PYTHON_OSINT_EGRESS_GOVERNED\) return \{ \.\.\.base, error: PYTHON_OSINT_EGRESS_ERROR \};/],
  ["theHarvester is source-gated", /runTheHarvester\([\s\S]{0,260}if \(!PYTHON_OSINT_EGRESS_GOVERNED\) return \{ \.\.\.base, error: PYTHON_OSINT_EGRESS_ERROR \};/],
  ["Python deep research is source-gated", /runOpenDeepResearch\([\s\S]{0,360}if \(!PYTHON_OSINT_EGRESS_GOVERNED\) return \{ \.\.\.base, error: PYTHON_OSINT_EGRESS_ERROR \};/],
  ["Python capability health is fail-closed", /holehe: false[\s\S]*maigret: false[\s\S]*sherlock: false[\s\S]*theHarvester: false[\s\S]*openDeepResearch: false/],
];
for (const [label, pattern] of pythonBoundaryRequired) if (!pattern.test(pythonTools)) throw new Error(`python OSINT boundary invariant failed: ${label}`);
const llmStepMatch = source.match(/async function llmStep\([\s\S]*?\n\}\nfunction formatFindingsBag/);
if (!llmStepMatch) throw new Error("agentic runtime invariant failed: llmStep implementation missing");
const llmStep = llmStepMatch[0];
if (!/const providers:/.test(llmStep)) throw new Error("agentic runtime invariant failed: investigator adapter pool is not explicit");
if (/callGeminiJson|callNvidiaJson|\["gemini"|\["nvidia"/.test(llmStep)) throw new Error("agentic runtime invariant failed: Boss/right-hand provider leaked into investigator lane");
if (/GEMINI_API_KEY_|async function callGeminiJson\b/.test(source)) throw new Error("agentic runtime invariant failed: dormant Gemini provider remains in production Dig module");
if (/async function callNvidiaJson\b/.test(source)) throw new Error("agentic runtime invariant failed: dormant NVIDIA investigator HTTP helper remains in production module");
if (/DIG_INVESTIGATOR_FAILOVER_CHAIN:[^\n]*Groq -> Mistral/.test(source)) throw new Error("agentic runtime invariant failed: legacy closed Groq -> Mistral architecture marker remains");
if (source.includes("const maxIter = Math.min(input.maxIterations ?? MAX_ITER, 24)")) throw new Error("agentic runtime invariant failed: hidden 24-iteration ceiling");
if (source.includes("agenticProviderCircuitUntil")) throw new Error("agentic runtime invariant failed: module-global provider circuit can contaminate concurrent targets");
if (!/investigatorLlm\?: "groq" \| "mistral"/.test(source)) throw new Error("agentic runtime invariant failed: selected Investigator field missing from ReAct input");
if (!/const orderedProviders = \[selectedInvestigatorLlm/.test(llmStep)) throw new Error("agentic runtime invariant failed: Boss-selected Investigator is not bound to provider ordering");
if (!/async function probe\(url,key,model,provider\)/.test(workflow)) throw new Error("live audit provider gate missing generic capability probe");
if (!/digReady = groq \|\| mistral;/.test(workflow)) throw new Error("live audit provider gate must derive readiness from configured investigator adapters");
if (!/if\(!digReady\)/.test(workflow)) throw new Error("live audit must gate launch on an actual investigator generation");
if (!/probe\([\s\S]*?["']nvidia-right-hand["']\)/.test(workflow)) throw new Error("live audit right-hand probe is not explicitly capability-scoped");
if (!/const canonical\s*=\s*path\.join\(here,\s*["']apply-agentic-concurrency-hardening\.mjs["']\)/.test(compatibilityHardener)) throw new Error("compatibility hardener does not resolve the canonical hardener");
if (!/spawnSync\(process\.execPath,\s*\[canonical\]/.test(compatibilityHardener)) throw new Error("compatibility hardener does not execute the canonical hardener");
if (!/Observation-only contact enrichment/.test(canonicalHardener)) throw new Error("observation identity boundary missing from canonical hardener");
if (!/const observationBoundaryRe\s*=/.test(canonicalHardener) || !/const observationReplacement\s*=/.test(canonicalHardener)) throw new Error("canonical hardener does not define an explicit observation replacement");
if (!/return facts\.join/.test(canonicalHardener)) throw new Error("canonical hardener observation replacement does not preserve literal contact facts");
if (/push\(`PERSON:/.test(canonicalHardener)) throw new Error("canonical hardener still manufactures PERSON findings from page extraction");
const forbidden = [
  ["forced stagnation nudge", /\[STAGNATION\]/],
  ["forced first-search completion gate", /done_rejected \(no research yet\)/],
  ["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],
  ["Gemini temperature clamp", /generationConfig:[\s\S]{0,250}temperature:\s*0\.25/],
  ["forced initial web search", /Begin\. Choose an initial web_search query/],
  ["fake discovery target convention in canonical core", /Discovery slot/],
];
for (const [label, pattern] of forbidden) if (pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
console.log("agentic runtime invariants: PASS");
