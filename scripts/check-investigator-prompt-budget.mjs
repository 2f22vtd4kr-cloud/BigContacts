#!/usr/bin/env node
import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const telemetry = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts", "utf8");
const compaction = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const orientation = fs.readFileSync("artifacts/api-server/src/src/lib/apex-bureau-orientation.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/PREFERRED_PROVIDER_PROMPT_CHARS = 9_000/.test(core), "provider prompt size must be represented as a preferred optimization target");
assert(/buildBoundedInvestigatorObjective\(\{ base, direction, maxChars: 4_000 \}\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8")), "per-action Investigator objective budget must preserve the complete default objective plus safety text");
assert(/maxChars: input\.mode === "discovery" \? 750 : 3_000/.test(core), "discovery working context is compacted without changing target-stage evidence headroom");
assert(/const cognitiveState = boundInvestigatorPromptSection\(/.test(core) && /input\.intelligenceContext \|\| "RESEARCH INTELLIGENCE STATE: not yet populated\."/s.test(core) && /input\.mode === "discovery" \? 250 : 900/.test(core), "discovery intelligence state is compacted while target-stage state retains its larger bound");
assert(/const capabilityGuidance = boundInvestigatorPromptSection\(renderAtlasCapabilityGuidanceCompact\(promptCapabilities\), input\.mode === "discovery" \? \(availablePythonActions\.size > 0 \? 1_200 : 700\) : \(availablePythonActions\.size > 0 \? 2_200 : 1_000\)\)/.test(core), "discovery capability guidance is compact while target research retains the larger attested worker inventory");
assert(/PREFERRED_PROVIDER_PROMPT_CHARS = 9_000/.test(core) && /PROMPT SIZE TARGET \(ADVISORY, NOT A HARD REQUIREMENT\)/.test(core), "prompt size is advisory and is not a machine-enforced character ceiling");
assert(/PREFERRED_INVESTIGATOR_REQUEST_CHARS = 9_000/.test(core) && /PREFERRED_INVESTIGATOR_USER_PROMPT_CHARS = 4_000/.test(core) && /INVESTIGATOR_SCHEMA_OVERHEAD_CHARS = 3_000/.test(core), "the schema-inclusive preferred request/user prompt targets remain explicit");
assert(/function investigatorUserPromptBudget\(systemPromptChars: number\)/.test(core) && /PREFERRED_INVESTIGATOR_REQUEST_CHARS - systemChars - INVESTIGATOR_SCHEMA_OVERHEAD_CHARS/.test(core), "one shared helper derives the provider-safe user-message budget including structured schema overhead");
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
  /AUTHORITATIVE SAME-CASE SEARCH BUDGET/.test(stepPrompt)
    && /AUTHORITATIVE SAME-CASE SEARCH BUDGET/.test(stepPrompt)
    && /DISCOVERY LEAD HANDOFF:/.test(stepPrompt)
    && /provisional/.test(stepPrompt),
  "dynamic discovery prompt must retain its live search budget and review-only handoff state",
);
assert(
  /DISCOVERY TARGETABILITY \/ REALISM:/.test(orientation)
    && /human objective and explicit constraints govern/.test(orientation)
    && /require direct relevance to the active objective/.test(orientation)
    && /do not force a mixed-source batch or a registry-first order/.test(orientation)
    && /The Investigator decides relevance and chooses whether to search, fetch, use a registry, pivot or stop by expected information gain/.test(orientation)
    && /ranking mentions are contextual leads, not sufficient proof by themselves/.test(orientation),
  "institutional system contract must preserve objective-led, model-owned discovery without duplicating it in each user prompt",
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
// Offline prompt-section measurement. No provider, network, tokenizer package or
// live API is invoked. Token counts are labelled estimates (chars / 3.4).
const promptCoreMatch = orientation.match(/export function apexInvestigatorSystemCore\(\): string \{\\s*return \[([\\s\\S]*?)\]\\.join\("\\n"\);\\s*\}/);
if (!promptCoreMatch) throw new Error("INVESTIGATOR PROMPT BUDGET: unable to extract system prompt sections");
const promptSections = [...promptCoreMatch[1].matchAll(/^\\s*("(?:\\\\.|[^"\\\\])*")\\s*,?\\s*$/gm)]
  .map((match) => JSON.parse(match[1]));
if (!promptSections.length) throw new Error("INVESTIGATOR PROMPT BUDGET: system prompt sections were not measurable");
const systemPromptChars = promptSections.reduce((total, section) => total + section.length, 0)
  + Math.max(0, promptSections.length - 1)
  + "\\nReturn one JSON action object only.".length;
const constant = (name) => {
  const match = core.match(new RegExp("const " + name + " = ([0-9_]+)"));
  if (!match) throw new Error("INVESTIGATOR PROMPT BUDGET: missing " + name);
  return Number(match[1].replaceAll("_", ""));
};
const preferredTotalChars = constant("PREFERRED_INVESTIGATOR_REQUEST_CHARS");
const preferredUserChars = constant("PREFERRED_INVESTIGATOR_USER_PROMPT_CHARS");
const schemaOverheadChars = constant("INVESTIGATOR_SCHEMA_OVERHEAD_CHARS");
const userPromptBudgetChars = Math.max(0, Math.min(
  preferredUserChars,
  preferredTotalChars - systemPromptChars - schemaOverheadChars,
));
const compact20bResponseFormatChars = 0; // GPT-OSS 20B does not receive unsupported response_format.
const estimatedPromptTokens = Math.ceil(
  (systemPromptChars + userPromptBudgetChars + compact20bResponseFormatChars) / 3.4,
);
const defaultCompletionBudget = 1024;
const estimatedTotalTokensPerTurn = estimatedPromptTokens + defaultCompletionBudget;
const legacyObservedPromptTokens = 3565;
const legacyObservedCompletionTokens = 509;
const legacyCompletionCap = 512;
console.log("INVESTIGATOR PROMPT MEASUREMENT (offline; no live provider call)");
console.log("  Tokenizer: not available in this offline check; estimate = ceil(characters / 3.4).");
console.log("  System prompt: " + systemPromptChars + " characters / " + Math.ceil(systemPromptChars / 3.4) + " estimated tokens (" + promptSections.length + " sections).");
console.log("  User/context allowance: " + userPromptBudgetChars + " characters / " + Math.ceil(userPromptBudgetChars / 3.4) + " estimated tokens.");
console.log("  Response schema overhead: 0 characters for the GPT-OSS 20B compatibility request (provider response_format omitted).");
console.log("  Estimated input per 20B Investigator turn at configured prompt allowance: " + estimatedPromptTokens + " tokens.");
console.log("  Default reasoning effort: low; completion cap: " + defaultCompletionBudget + " tokens (environment-configurable).");
console.log("  Estimated input + completion ceiling per turn: " + estimatedTotalTokensPerTurn + " tokens; this is a reservation ceiling, not actual use.");
console.log("  2026-11-14 baseline: provider-reported input=" + legacyObservedPromptTokens + " tokens; completion cap=" + legacyCompletionCap + "; one observed successful empty completion=" + legacyObservedCompletionTokens + " tokens (including reasoning).");
console.log("  Comparison: estimated new prompt allowance is " + Math.round((1 - estimatedPromptTokens / legacyObservedPromptTokens) * 100) + "% below the captured baseline input; actual post-patch usage requires the user's live Replit run.");
console.log("INVESTIGATOR PROMPT BUDGET: PASS");
