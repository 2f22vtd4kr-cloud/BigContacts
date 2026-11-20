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
assert(/maxChars: input\.mode === "discovery" \? 350 : 3_000/.test(core), "discovery working context is compacted without changing target-stage evidence headroom");
assert(/const cognitiveState = boundInvestigatorPromptSection\(/.test(core) && /input\.intelligenceContext \|\| "RESEARCH INTELLIGENCE STATE: not yet populated\."/s.test(core) && /input\.mode === "discovery" \? 150 : 700/.test(core), "discovery intelligence state is compacted while target-stage state retains its larger bound");
assert(/const capabilityGuidance = boundInvestigatorPromptSection\(renderAtlasCapabilityGuidanceCompact\(promptCapabilities\), input\.mode === "discovery" \? \(availablePythonActions\.size > 0 \? 450 : 350\) : \(availablePythonActions\.size > 0 \? 2_200 : 1_000\)\)/.test(core), "discovery capability guidance is compact while target research retains the larger attested worker inventory");
assert(/const providerBoundedPrompt = \[[\s\S]*?preserveFetchedClaimAtProviderBoundary\(/.test(core) && /return (?:reportPromptMeasurement\(providerBoundedPrompt\)|providerBoundedPrompt);/.test(core), "preferred prompt size is advisory; the complete action schema and latest durable evidence are never clipped to meet it");
assert(/PREFERRED_INVESTIGATOR_REQUEST_CHARS = 10_000/.test(core) && /PREFERRED_INVESTIGATOR_USER_PROMPT_CHARS = 4_000/.test(core) && /INVESTIGATOR_SCHEMA_OVERHEAD_CHARS = 4_000/.test(core), "the schema-inclusive preferred request/user prompt targets reserve the observed strict response schema overhead");
assert(/function investigatorUserPromptBudget\(systemPromptChars: number\)/.test(core) && /PREFERRED_INVESTIGATOR_REQUEST_CHARS - systemChars - INVESTIGATOR_SCHEMA_OVERHEAD_CHARS/.test(core), "one shared helper derives the provider-safe user-message budget including structured schema overhead");
assert(/const maxUserPromptChars = investigatorUserPromptBudget\(systemPrompt.length\)/.test(core), "request-body construction uses the shared system-aware prompt budget");
assert(/const userPromptBudget = Math.min\([\s\S]*?investigatorUserPromptBudget\(INVESTIGATOR_SYSTEM_PROMPT\(\)\.length\)/.test(core), "step prompt budget must account for the exact system message transmitted to Groq");
assert(/const maxUserPromptChars = investigatorUserPromptBudget\(systemPromptChars\)/.test(core), "live transport uses the shared system-aware prompt budget");
const providerBoundedPromptStart = core.indexOf("const providerBoundedPrompt = [");
const providerBoundedPromptEnd = core.indexOf("const mandatorySuffix = providerBoundedPrompt.slice(outputContractIndex)", providerBoundedPromptStart);
const providerBoundedPromptSource = providerBoundedPromptStart >= 0 && providerBoundedPromptEnd > providerBoundedPromptStart
  ? core.slice(providerBoundedPromptStart, providerBoundedPromptEnd)
  : "";
const appendsCompleteLatestEvidenceEnvelope = providerBoundedPromptSource.includes("preserveFetchedClaimAtProviderBoundary")
  && providerBoundedPromptSource.includes("[composedPrompt, latestRecordTail]")
  && providerBoundedPromptSource.includes("providerGuidance")
  && providerBoundedPromptSource.includes("modelOwnedScopeGuidance")
  && providerBoundedPromptSource.includes("compactWorkerCapabilityGuidance")
  && /return (?:reportPromptMeasurement\(boundedPrompt\)|boundedPrompt);/.test(core)
  && /return (?:reportPromptMeasurement\(providerBoundedPrompt\)|providerBoundedPrompt);/.test(core)
  && /const latestRecordTail = \[/.test(core);
assert(appendsCompleteLatestEvidenceEnvelope, "live Investigator prompt composition preserves the full authored prompt, latest durable action, fetched evidence and URL context");
assert(/function buildStepPrompt/.test(core), "Investigator prompt builder is present");
assert(core.includes("const allPromptRecords = sanitizeObservableValue(") && core.includes("const { pageArtifact: _pageArtifact, ...promptRecord } = record;") && core.includes("const promptTrajectoryRecords = allPromptRecords.map(") && /trajectoryRecords: promptTrajectoryRecords/.test(core), "each act prompt must include prior durable observations and current-act records in the AI-prepared, bounded model-facing projection, excluding full fetched-page artifacts");
assert(core.includes("const latestRecordTail = [") && core.includes("buildLatestRecordTail()"), "latest durable evidence envelope is assembled from the trajectory record");
assert(/buildGroqInvestigatorRequestBody[\s\S]*?boundInvestigatorProviderPrompt\(modelSpecificPrompt, maxUserPromptChars, inferredMode, model, actionAllowlist\)/.test(core), "provider request-body boundary must use the best-effort, stage-aware prompt optimizer and model-specific contract");
assert(/buildInvestigatorOutputContractForModel[\s\S]*?ACTION-SPECIFIC OUTPUT CONTRACT[\s\S]*?unused keys may be omitted/.test(core) && /structuredActionResponseFormat\(model, actionAllowlist, promptMode\)\.type === "json_schema"/.test(core) && /if \(model && structuredActionResponseFormat\(model, actionAllowlist, _promptMode\)\.type !== "json_schema"\)/.test(core) && /const supportsSearchArrays = availableActions\.includes\("parallel_web_search"\)/.test(core) && /const supportsFindings = _promptMode === "discovery" \|\| actionAllowlist\.includes\("done"\)/.test(core) && /const supportsFindings = promptMode === "discovery" \|\| availableActions\.includes\("done"\)/.test(core), "provider-enforced schemas and prompt contracts expose provisional findings on discovery actions while target findings remain tied to done eligibility; non-strict models receive the reduced action-specific contract");
assert(/export function buildActionParseFailureObservation[\s\S]*?Follow the active model output contract/.test(core) && !/export function buildActionParseFailureObservation[\s\S]*?20 required top-level fields|export function buildActionParseFailureObservation[\s\S]*?all schema keys/.test(core), "parse-recovery guidance must not reintroduce the 20-key strict contract for GPT-OSS 20B");
assert(/function boundInvestigatorProviderPrompt[\s\S]*?if \(!completeSchemaPresent\)[\s\S]*?throw new Error\([\s\S]*?\)[\s\S]*?return normalized;/.test(core), "provider boundary validates the complete action schema but never compacts to an internal character target");
assert(!/tightenInvestigatorPrompt\(\s*workingPrompt/.test(core) && /upstream_request_size_rejected/.test(core), "HTTP 413 must not trigger deterministic deletion of arbitrary prompt content");
const stepStart = core.indexOf("export function buildStepPrompt");
const stepEnd = core.indexOf("export function discoveryTerminalGate", stepStart);
const stepPrompt = stepStart >= 0 && stepEnd > stepStart ? core.slice(stepStart, stepEnd) : "";
assert(!/apexOrientationCompact\("dig_agent"\)/.test(stepPrompt), "institutional orientation must not be duplicated inside the dynamic user prompt");
assert(!/JSON\.stringify\(AGENTIC_ACTION_SCHEMA\)/.test(stepPrompt), "full action schema must not be duplicated inside the dynamic user prompt");
assert(
  /SEARCH ACTIVITY \(telemetry only; no fixed search cap\)/.test(stepPrompt)
    && /DISCOVERY LEAD HANDOFF:/.test(stepPrompt)
    && /provisional/.test(stepPrompt),
  "dynamic discovery prompt must retain observational search activity and review-only handoff state without restricting model-selected searches",
);
assert(
  /MODEL-OWNED RELEVANCE: Investigator decides relevance/.test(orientation)
    && /HYPOTHESES: Form falsifiable public-evidence hypotheses/.test(orientation)
    && /AUTONOMY: No fixed source\/provider\/registry order or mix/.test(orientation)
    && /OPEN DISCOVERY: Turn open objectives into falsifiable hypotheses; generic nouns are not queries/.test(orientation)
    && /Treat web and enabled registries as neutral complementary routes/.test(orientation)
    && /CLAIMS: .*wealth needs sourced ownership, equity or investment/.test(orientation),
  "institutional system contract must preserve objective-led, model-owned discovery, autonomous hypothesis diversity and complementary source choice",
);
assert(/rateLimitRemainingTokens/.test(telemetry) && /rateLimitResetTokensMs/.test(telemetry), "safe token rate-limit telemetry must be emitted");
assert(/systemPromptChars/.test(telemetry) && /userPromptChars/.test(telemetry) && /totalPromptChars/.test(telemetry), "prompt telemetry must distinguish system, user, and total message characters");
assert(/waitForKnownGroqTokenWindow/.test(core) && /token_window_wait_exceeded/.test(core), "known token-window exhaustion must be classified as a bounded temporary wait, not hard quota");
assert(/upstream_token_window_wait_exceeded/.test(core), "local token-window wait ceiling must not emit upstream_quota_exhausted");
assert(/resetMs > Math\.max\(0, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS\)/.test(core), "known token-window waits must reserve time for the actual provider inference");
assert(/remainingRequests.*=== 0/.test(core) && /quota_exceeded/.test(core) && /insufficient_quota/.test(core), "hard Investigator quota must require an explicit request-counter or provider hard-quota signal");
assert(/!hardQuota && tokenWaitMs !== null/.test(core) && /tokenWaitMs <= AGENTIC_PROVIDER_DECISION_TIMEOUT_MS - MIN_GROQ_INFERENCE_BUDGET_MS/.test(core), "provider token-window 429s must receive one bounded wait/retry while reserving time for inference and without being relabeled as hard quota");
assert(/const totalPromptChars = systemPromptChars \+ userPromptChars/.test(core) && /const totalRequestChars = totalPromptChars \+ responseFormatChars/.test(core) && /waitForKnownGroqTokenWindow\(\s*quotaAccount,\s*model,\s*promptMeasurement\.totalRequestChars,/s.test(core), "known token-window estimation must include the actual transmitted system/user messages and structured response schema");
assert(/const userPromptBudget = Math\.min\([\s\S]*?4_000,[\s\S]*?\);/.test(core) && /const boundedPrefix = compactPromptSectionPreservingUrlTokens\(/.test(core) && /const maxUserPromptChars = investigatorUserPromptBudget\(systemPrompt\.length\)/.test(core), "provider-bound prompt softly compacts auxiliary context while preserving mandatory evidence and the shared provider-size estimate");
const promptBudgetTest = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.test.ts", "utf8");
assert(/4,000 is the preferred compaction target, not a hard ceiling/.test(promptBudgetTest) && /expect\(userPrompt\.length\)\.toBeLessThanOrEqual\(4_500\)/.test(promptBudgetTest), "the 4,000-character target remains advisory while a bounded 4,500-character ceiling protects complete mandatory prompt context");
assert(/ACTIVE SCOPE & RECOVERY:/.test(orientation), "institutional orientation must define how active scope survives blocks and recovery");
assert(/export const APEX_COMPANY_REALISM_GUIDANCE_COMPACT/.test(orientation) && /role === "investigator" \|\| role === "dig_agent"[\s\S]*?APEX_COMPANY_REALISM_GUIDANCE_COMPACT/.test(orientation), "compact company-realism guidance must remain included in the Investigator and dig-agent system orientation");
assert(orientation.includes("OUTPUT: Return one JSON action object only; follow the model-specific output contract in the user message.") && !orientation.includes("OUTPUT: JSON action object; include all schema keys"), "the shared Investigator system prompt must defer strict all-fields formatting to model-specific user contracts so 20B does not inherit it");
const investigatorCoreStart = orientation.indexOf("export function apexInvestigatorSystemCore");
const investigatorCoreEnd = orientation.indexOf("export function apexOrientationCompact", investigatorCoreStart);
const investigatorCore = investigatorCoreStart >= 0 && investigatorCoreEnd > investigatorCoreStart ? orientation.slice(investigatorCoreStart, investigatorCoreEnd) : "";
assert(investigatorCore.includes("APEX_COMPANY_REALISM_GUIDANCE_COMPACT"), "compact company-realism guidance must be part of the active ReAct Investigator system prompt, not only an unused orientation helper");
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
const promptCoreMatch = orientation.match(/export function apexInvestigatorSystemCore\(\): string \{\s*return \[([\s\S]*?)\]\.join\("\\n"\);\s*\}/);
if (!promptCoreMatch) throw new Error("INVESTIGATOR PROMPT BUDGET: unable to extract system prompt sections");
const promptSections = [...promptCoreMatch[1].matchAll(/^\s*("(?:\\.|[^"\\])*")\s*,?\s*$/gm)]
  .map((match) => JSON.parse(match[1]));
if (!promptSections.length) throw new Error("INVESTIGATOR PROMPT BUDGET: system prompt sections were not measurable");
const companyGuidanceMatch = orientation.match(/export const APEX_COMPANY_REALISM_GUIDANCE_COMPACT = ("(?:\\.|[^"\\])*");/);
if (!companyGuidanceMatch || !promptCoreMatch[1].includes("APEX_COMPANY_REALISM_GUIDANCE_COMPACT")) {
  throw new Error("INVESTIGATOR PROMPT BUDGET: active system prompt must include the compact company-realism guidance");
}
const companyGuidance = JSON.parse(companyGuidanceMatch[1]);
const systemPromptChars = promptSections.reduce((total, section) => total + section.length, 0)
  + Math.max(0, promptSections.length - 1)
  + companyGuidance.length + 1
  + "\nReturn one JSON action object only.".length;
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
const schemaStart = core.indexOf("const AGENTIC_STRUCTURED_SCHEMA = {");
const schemaEnd = core.indexOf("} as const;", schemaStart);
if (schemaStart < 0 || schemaEnd < 0) throw new Error("INVESTIGATOR PROMPT BUDGET: unable to measure the 120B structured schema source");
const schemaSourceChars = schemaEnd + "} as const;".length - schemaStart;
// Conservative source-size proxy only: runtime JSON.stringify(response_format)
// is logged as responseFormatChars, and provider-reported usage is authoritative.
const estimated120bSchemaTokens = Math.ceil(schemaSourceChars / 3.4);
const estimated120bInputTokens = estimatedPromptTokens + estimated120bSchemaTokens;
const defaultCompletionBudget = 1024;
const estimatedTotalTokensPerTurn = estimatedPromptTokens + defaultCompletionBudget;
const estimated120bTotalTokensPerTurn = estimated120bInputTokens + defaultCompletionBudget;
const legacyObservedPromptTokens = 3565;
const legacyObservedCompletionTokens = 509;
const legacyCompletionCap = 512;
console.log("INVESTIGATOR PROMPT MEASUREMENT (offline; no live provider call)");
console.log("  Tokenizer: not available in this offline check; estimate = ceil(characters / 3.4).");
console.log("  System prompt: " + systemPromptChars + " characters / " + Math.ceil(systemPromptChars / 3.4) + " estimated tokens (" + (promptSections.length + 1) + " sections).");
console.log("  User/context allowance: " + userPromptBudgetChars + " characters / " + Math.ceil(userPromptBudgetChars / 3.4) + " estimated tokens.");
console.log("  GPT-OSS 20B response schema overhead: 0 characters (provider response_format omitted; local parser remains authoritative).");
console.log("  Estimated GPT-OSS 20B input per routine Investigator turn: " + estimatedPromptTokens + " tokens.");
console.log("  GPT-OSS 120B structured-schema source proxy: " + schemaSourceChars + " characters / " + estimated120bSchemaTokens + " estimated tokens (conservative source-size proxy; excludes runtime enum expansion and is not a provider tokenizer result).");
console.log("  Estimated GPT-OSS 120B input including schema proxy: " + estimated120bInputTokens + " tokens; actual serialized response_format size is recorded as responseFormatChars and provider usage is authoritative.");
console.log("  Default reasoning effort: low; completion cap: " + defaultCompletionBudget + " tokens (environment-configurable).");
console.log("  Estimated 20B input + completion ceiling: " + estimatedTotalTokensPerTurn + " tokens; estimated 120B input + completion ceiling: " + estimated120bTotalTokensPerTurn + " tokens.");
console.log("  2026-11-14 baseline: provider-reported input=" + legacyObservedPromptTokens + " tokens; completion cap=" + legacyCompletionCap + "; one observed successful empty completion=" + legacyObservedCompletionTokens + " tokens (including reasoning).");
console.log("  Comparison: the historical 3,565-token figure is provider-reported; current values above are offline character-based estimates, so no percentage reduction is claimed. The outbound-request regression test separately reports exact current system/user/schema character counts; actual provider usage still requires the user live Replit run.");
console.log("INVESTIGATOR PROMPT BUDGET: PASS");
