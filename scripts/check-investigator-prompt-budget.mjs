#!/usr/bin/env node
import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const telemetry = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts", "utf8");
const compaction = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const orientation = fs.readFileSync("artifacts/api-server/src/src/lib/apex-bureau-orientation.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/MAX_PROVIDER_PROMPT_CHARS = 10_000/.test(core), "final Investigator provider prompt ceiling must be 10,000 characters");
assert(/buildBoundedInvestigatorObjective\(\{ base, direction, maxChars: 4_000 \}\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8")), "per-action Investigator objective budget must preserve the complete default objective plus safety text");
assert(/maxChars: 3_000/.test(core), "working Investigator context must preserve room for the complete objective, schema and live evidence");
assert(/const cognitiveState = boundInvestigatorPromptSection\(/.test(core) && /input\.intelligenceContext \|\| "RESEARCH INTELLIGENCE STATE: not yet populated\."/s.test(core) && /900,\n  \);/.test(core), "intelligence state must remain bounded to 900 characters");
assert(/const capabilityGuidance = boundInvestigatorPromptSection\(renderAtlasCapabilityGuidanceCompact\(promptCapabilities\), availablePythonActions\.size > 0 \? 2_200 : 1_000\)/.test(core), "worker capability guidance gets a bounded expansion only when those tools are attested");
assert(/MAX_PROVIDER_PROMPT_CHARS = 10_000/.test(core), "the absolute provider safety ceiling remains 10,000 characters");
assert(/const maxUserPromptChars = Math\.max\(1_000, Math\.min\(6_800, 8_400 - systemPrompt\.length, MAX_PROVIDER_PROMPT_CHARS - systemPrompt\.length\)\)/.test(core), "Groq request-body construction must reserve the stable system prompt inside the 8,400-character total envelope");
assert(/const maxUserPromptChars = Math\.max\(1_000, Math\.min\(6_800, 8_400 - systemPromptChars, MAX_PROVIDER_PROMPT_CHARS - systemPromptChars\)\)/.test(core), "the live request path must use the same 8,400-character total envelope");
assert(/const maxUserPromptChars = Math\.max\(1_000, Math\.min\(8_200, MAX_PROVIDER_PROMPT_CHARS - INVESTIGATOR_SYSTEM_PROMPT\(\)\.length\)\)/.test(core), "internal buildStepPrompt assembly keeps its 8,200-character working budget; final transport applies the stricter 6,800/8,400 envelope");
assert(/function buildStepPrompt/.test(core), "Investigator prompt builder is present");
assert(/const allPromptRecords = sanitizeObservableValue\(\[\.\.\.priorTrajectoryRecords, \.\.\.records\]\.slice\(-MAX_TRAJECTORY_RECORDS\)\)/.test(core) && /const promptTrajectoryRecords = allPromptRecords\.map\(/.test(core) && /trajectoryRecords: promptTrajectoryRecords/.test(core), "each act prompt must include prior durable observations and current-act records in the AI-prepared, bounded model-facing projection");
assert(/INVESTIGATOR_SYSTEM_PROMPT/.test(core) && /MAX_PROVIDER_PROMPT_CHARS - INVESTIGATOR_SYSTEM_PROMPT\(\)\.length/.test(core), "final prompt ceiling must reserve space for the stable system message");
assert(/buildGroqInvestigatorRequestBody[\s\S]*?boundInvestigatorProviderPrompt\(prompt, maxUserPromptChars, inferredMode\)/.test(core), "provider request-body boundary must use the contract-preserving, stage-aware budget reducer");
assert(/if \(prompt\.length > maxUserPromptChars\)[\s\S]*?boundInvestigatorProviderPrompt\(prompt, maxUserPromptChars, actionAllowlist/.test(core) && /contract-aware reducer/.test(core) && !/const boundedPrompt = boundInvestigatorPromptSection\(prompt, maxUserPromptChars\)/.test(core), "oversize prompts must use the contract-aware, stage-aware last-resort reducer, never generic head/tail clipping");
assert(!/tightenInvestigatorPrompt\(\s*workingPrompt/.test(core) && /upstream_request_size_rejected/.test(core), "HTTP 413 must not trigger deterministic deletion of arbitrary prompt content");
const stepStart = core.indexOf("export function buildStepPrompt");
const stepEnd = core.indexOf("export function discoveryTerminalGate", stepStart);
const stepPrompt = stepStart >= 0 && stepEnd > stepStart ? core.slice(stepStart, stepEnd) : "";
assert(!/apexOrientationCompact\("dig_agent"\)/.test(stepPrompt), "institutional orientation must not be duplicated inside the dynamic user prompt");
assert(!/JSON\.stringify\(AGENTIC_ACTION_SCHEMA\)/.test(stepPrompt), "full action schema must not be duplicated inside the dynamic user prompt");
assert(/DISCOVERY (?:QUALITY|TARGETABILITY) GATE:/.test(stepPrompt), "discovery targetability/anchor quality gate must remain explicit");
assert(/rateLimitRemainingTokens/.test(telemetry) && /rateLimitResetTokensMs/.test(telemetry), "safe token rate-limit telemetry must be emitted");
assert(/systemPromptChars/.test(telemetry) && /userPromptChars/.test(telemetry) && /totalPromptChars/.test(telemetry), "prompt telemetry must distinguish system, user, and total message characters");
assert(/waitForKnownGroqTokenWindow/.test(core) && /token_window_wait_exceeded/.test(core), "known token-window exhaustion must be classified as a bounded temporary wait, not hard quota");
assert(/upstream_token_window_wait_exceeded/.test(core), "local token-window wait ceiling must not emit upstream_quota_exhausted");
assert(/resetMs > Math\.max\(0, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS\)/.test(core), "known token-window waits must reserve time for the actual provider inference");
assert(/remainingRequests.*=== 0/.test(core) && /quota_exceeded/.test(core) && /insufficient_quota/.test(core), "hard Investigator quota must require an explicit request-counter or provider hard-quota signal");
assert(/!hardQuota && tokenWaitMs !== null/.test(core) && /tokenWaitMs <= AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS/.test(core), "provider token-window 429s must receive one bounded wait/retry while reserving time for inference and without being relabeled as hard quota");
assert(/waitForKnownGroqTokenWindow\([\s\S]*?workingPrompt\.length \+ INVESTIGATOR_SYSTEM_PROMPT\(\)\.length/.test(core), "known token-window estimation must include the transmitted Investigator system prompt");
assert(/Absolute last-resort recovery: do not abort a canonical discovery run/.test(core), "prompt-budget overflow must degrade to a schema-preserving emergency prompt instead of aborting the run");
assert(/ACTIVE SCOPE & RECOVERY:/.test(orientation), "institutional orientation must define how active scope survives blocks and recovery");
assert(/const absoluteMinimumObjective = \[[\s\S]*?SCOPE RECOVERY: preserve Boss-approved subject\/geography; source class may vary; no silent pivot/.test(core), "the absolute-minimum prompt must preserve scope-recovery rules even under the tightest budget");
assert(/genericDiscoveryCompanyLabel/.test(core) && /Generic case labels including Case Co are metadata/.test(core), "generic case labels must not become discovery entity anchors");
assert(/const DEFAULT_MAX_CHARS = 4_200/.test(compaction), "context compaction default must remain reduced");
assert(/LATEST TRAJECTORY RECORD \(must remain visible to the next Investigator\)/.test(compaction), "latest trajectory record must have an explicit prompt-preservation section");
if (failures.length) {
  console.error("INVESTIGATOR PROMPT BUDGET: FAIL");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("INVESTIGATOR PROMPT BUDGET: PASS");
