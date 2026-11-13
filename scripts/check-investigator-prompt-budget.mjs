#!/usr/bin/env node
import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const telemetry = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts", "utf8");
const compaction = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const orientation = fs.readFileSync("artifacts/api-server/src/src/lib/apex-bureau-orientation.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/PREFERRED_PROVIDER_PROMPT_CHARS = 10_000/.test(core), "provider prompt size must be represented as a preferred optimization target");
assert(/buildBoundedInvestigatorObjective\(\{ base, direction, maxChars: 4_000 \}\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8")), "per-action Investigator objective budget must preserve the complete default objective plus safety text");
assert(/maxChars: 3_000/.test(core), "working Investigator context must preserve room for the complete objective, schema and live evidence");
assert(/const cognitiveState = boundInvestigatorPromptSection\(/.test(core) && /input\.intelligenceContext \|\| "RESEARCH INTELLIGENCE STATE: not yet populated\."/s.test(core) && /900,\n  \);/.test(core), "intelligence state must remain bounded to 900 characters");
assert(/const capabilityGuidance = boundInvestigatorPromptSection\(renderAtlasCapabilityGuidanceCompact\(promptCapabilities\), availablePythonActions\.size > 0 \? 2_200 : 1_000\)/.test(core), "worker capability guidance gets a bounded expansion only when those tools are attested");
assert(/PREFERRED_PROVIDER_PROMPT_CHARS = 10_000/.test(core) && /PROMPT SIZE TARGET \(ADVISORY, NOT A HARD REQUIREMENT\)/.test(core), "prompt size is advisory and is not a machine-enforced character ceiling");
assert(/PREFERRED_INVESTIGATOR_REQUEST_CHARS = 8_400/.test(core) && /PREFERRED_INVESTIGATOR_USER_PROMPT_CHARS = 6_800/.test(core), "the preferred 8,400/6,800 character targets remain explicit");
assert(/function investigatorUserPromptBudget\(systemPromptChars: number\)/.test(core), "one shared helper derives the provider-safe user-message budget");
assert(/const maxUserPromptChars = investigatorUserPromptBudget\(systemPrompt.length\)/.test(core), "request-body construction uses the shared system-aware prompt budget");
assert(/const maxUserPromptChars = investigatorUserPromptBudget\(systemPromptChars\)/.test(core), "live transport uses the shared system-aware prompt budget");
const appendsCompleteLatestEvidenceEnvelope = /return preserveFetchedClaimAtProviderBoundary\(\s*\[\s*composedPrompt,\s*latestRecordTail\s*\]\.filter\(Boolean\)\.join\("\\n\\n"\),?\s*\);/.test(core) && /const latestRecordTail = \[/.test(core);
assert(appendsCompleteLatestEvidenceEnvelope, "live Investigator prompt composition preserves the full authored prompt, latest durable action, fetched evidence and URL context");
assert(/function buildStepPrompt/.test(core), "Investigator prompt builder is present");
assert(/const allPromptRecords = sanitizeObservableValue\(\[\.\.\.priorTrajectoryRecords, \.\.\.records\]\.slice\(-MAX_TRAJECTORY_RECORDS\)\)/.test(core) && /const promptTrajectoryRecords = allPromptRecords\.map\(/.test(core) && /trajectoryRecords: promptTrajectoryRecords/.test(core), "each act prompt must include prior durable observations and current-act records in the AI-prepared, bounded model-facing projection");
assert(core.includes("const latestRecordTail = [") && core.includes("buildLatestRecordTail()"), "latest durable evidence envelope is assembled from the trajectory record");
assert(/buildGroqInvestigatorRequestBody[\s\S]*?boundInvestigatorProviderPrompt\(prompt, maxUserPromptChars, inferredMode\)/.test(core), "provider request-body boundary must use the best-effort, stage-aware prompt optimizer");
assert(/function boundInvestigatorProviderPrompt[\s\S]*?if \(!completeSchemaPresent\)[\s\S]*?throw new Error\([\s\S]*?\)[\s\S]*?return normalized;/.test(core), "provider boundary validates the complete action schema but never compacts to an internal character target");
assert(!/tightenInvestigatorPrompt\(\s*workingPrompt/.test(core) && /upstream_request_size_rejected/.test(core), "HTTP 413 must not trigger deterministic deletion of arbitrary prompt content");
const stepStart = core.indexOf("export function buildStepPrompt");
const stepEnd = core.indexOf("export function discoveryTerminalGate", stepStart);
const stepPrompt = stepStart >= 0 && stepEnd > stepStart ? core.slice(stepStart, stepEnd) : "";
assert(!/apexOrientationCompact\("dig_agent"\)/.test(stepPrompt), "institutional orientation must not be duplicated inside the dynamic user prompt");
assert(!/JSON\.stringify\(AGENTIC_ACTION_SCHEMA\)/.test(stepPrompt), "full action schema must not be duplicated inside the dynamic user prompt");
assert(
  /DISCOVERY TARGETABILITY \/ REALISM:/.test(stepPrompt)
    && /objective\/Boss scope sets target class\/geography/.test(stepPrompt)
    && /require direct relevance to the active objective/.test(stepPrompt)
    && /No name blacklist, preset targets or invented geography/.test(stepPrompt)
    && /Web\/registry sources have neutral standing; no registry-first\/fixed order/.test(stepPrompt)
    && /runtime safety ceiling is/.test(stepPrompt)
    && /not a stopping target or fixed sequence/.test(stepPrompt)
    && /source class may vary by query/.test(stepPrompt)
    && /Do not force a mixed-source batch/.test(stepPrompt)
    && /Investigator chooses whether to search, fetch, use a registry, pivot or stop by expected information gain/.test(stepPrompt),
  "discovery targetability and source-choice guidance must remain explicit while preserving model-owned investigative decisions",
);
assert(/rateLimitRemainingTokens/.test(telemetry) && /rateLimitResetTokensMs/.test(telemetry), "safe token rate-limit telemetry must be emitted");
assert(/systemPromptChars/.test(telemetry) && /userPromptChars/.test(telemetry) && /totalPromptChars/.test(telemetry), "prompt telemetry must distinguish system, user, and total message characters");
assert(/waitForKnownGroqTokenWindow/.test(core) && /token_window_wait_exceeded/.test(core), "known token-window exhaustion must be classified as a bounded temporary wait, not hard quota");
assert(/upstream_token_window_wait_exceeded/.test(core), "local token-window wait ceiling must not emit upstream_quota_exhausted");
assert(/resetMs > Math\.max\(0, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS\)/.test(core), "known token-window waits must reserve time for the actual provider inference");
assert(/remainingRequests.*=== 0/.test(core) && /quota_exceeded/.test(core) && /insufficient_quota/.test(core), "hard Investigator quota must require an explicit request-counter or provider hard-quota signal");
assert(/!hardQuota && tokenWaitMs !== null/.test(core) && /tokenWaitMs <= AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS/.test(core), "provider token-window 429s must receive one bounded wait/retry while reserving time for inference and without being relabeled as hard quota");
assert(/waitForKnownGroqTokenWindow\([\s\S]*?workingPrompt\.length \+ INVESTIGATOR_SYSTEM_PROMPT\(\)\.length/.test(core), "known token-window estimation must include the transmitted Investigator system prompt");
assert(/PROMPT SIZE TARGET \(ADVISORY, NOT A HARD REQUIREMENT\)/.test(core) && /actual provider context\/token limits/.test(core), "prompt size is guidance only; real provider context/token limits remain binding");
assert(/ACTIVE SCOPE & RECOVERY:/.test(orientation), "institutional orientation must define how active scope survives blocks and recovery");
assert(/const composedPrompt = \[[\s\S]*?authoritativeCaseObjective[\s\S]*?activeBossScopeSection/.test(core), "the complete objective and current Boss scope remain separate in the full Investigator prompt");
assert(/genericDiscoveryCompanyLabel/.test(core) && /Generic case labels including Case Co are metadata/.test(core), "generic case labels must not become discovery entity anchors");
assert(/const DEFAULT_MAX_CHARS = 4_200/.test(compaction), "context compaction default must remain reduced");
assert(/LATEST TRAJECTORY RECORD \(must remain visible to the next Investigator\)/.test(compaction), "latest trajectory record must have an explicit prompt-preservation section");
if (failures.length) {
  console.error("INVESTIGATOR PROMPT BUDGET: FAIL");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("INVESTIGATOR PROMPT BUDGET: PASS");
