import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const orientation = fs.readFileSync("artifacts/api-server/src/src/lib/apex-bureau-orientation.ts", "utf8");
const canonicalDiscovery = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const launchDefaults = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-launch-defaults.ts", "utf8");
const launchUi = fs.readFileSync("artifacts/apex-finder/src/lib/launch-atlas.ts", "utf8");
const discoveryContinuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts", "utf8");
const aiCompaction = fs.readFileSync("artifacts/api-server/src/src/lib/ai-investigation-context-compaction.ts", "utf8");
const rightHand = fs.readFileSync("artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts", "utf8");
const targetOversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");
const stepPromptStart = core.indexOf("export function buildStepPrompt(");
const stepPromptEnd = core.indexOf("export function discoveryLeadInspectionRequirement", stepPromptStart);
const stepPromptBuilder = stepPromptStart >= 0 && stepPromptEnd > stepPromptStart
  ? core.slice(stepPromptStart, stepPromptEnd)
  : "";
const preservesCompleteLatestEvidence = stepPromptBuilder.includes("serializeDurablePromptRecord(latestRecord)")
  && stepPromptBuilder.includes("serializeDurablePromptRecord(carryForwardRecord)")
  && stepPromptBuilder.includes("serializeDurablePromptRecord(latestSuccessfulFetchRecord)")
  && stepPromptBuilder.includes("const rawObservation = record.observation ?? \"\"")
  && stepPromptBuilder.includes("const boundedObservation = searchActions.has(record.action)")
  && stepPromptBuilder.includes("? compactDurablePromptObservation(rawObservation)")
  && stepPromptBuilder.includes(": rawObservation")
  && stepPromptBuilder.includes("observation: boundedObservation")
  && stepPromptBuilder.includes("observationCharsOmittedFromPrompt")
  && !stepPromptBuilder.includes("compactEmergencyTrajectoryObservation(record.observation")
  && !stepPromptBuilder.includes("record.observation.slice(");
const preservesHistoricalSearchLeadWithoutReplayingCompactedObservation =
  stepPromptBuilder.includes("const searchRecordAlreadyCompacted = Boolean(aiHistoricalMemory)")
  && stepPromptBuilder.includes("carryForwardSuccessfulSearch.turn <= (input.aiCompactedHistoricalThroughTurn ?? 0)")
  && stepPromptBuilder.includes('{ ...carryForwardSuccessfulSearch, observation: "" }');
const appendsLatestEvidenceAfterComposedPrompt = stepPromptBuilder.includes("const composedPrompt = [")
  && stepPromptBuilder.includes("const latestRecordTail = [")
  && stepPromptBuilder.includes("[composedPrompt, latestRecordTail].filter(Boolean).join(\"\\n\\n\")");
const checks = [
  ["bounded Investigator working context exists", /export function buildInvestigatorContext/.test(source)],
  ["working-context budget is configurable and bounded", /APEX_INVESTIGATOR_CONTEXT_MAX_CHARS/.test(source) && /MIN_MAX_CHARS/.test(source) && /MAX_MAX_CHARS/.test(source)],
  ["durable trajectory is explicitly retained outside the prompt", /Durable trajectory\/evidence is never deleted/.test(source) && /durable (?:run\/evidence )?records retain complete observations/i.test(source)],
  ["recent observations are bounded", /recentObservationChars/.test(source) && /RECENT TRAJECTORY/.test(source)],
  ["latest trajectory is explicitly reserved during compaction", /const latestReserve = Math\.min\(budget\.maxChars, latestSection\.length\)/.test(source) && /- latestReserve/.test(source)],
  ["older trajectory keeps source URLs", /ARCHIVED TRAJECTORY INDEX/.test(source) && /observedUrls/.test(source)],
  ["context management law forbids treating omission as negative evidence", /Do not treat omitted raw detail as negative evidence/.test(source)],
  ["emergency provider-size reducer exists", /export function tightenInvestigatorPrompt/.test(source) && /EMERGENCY REQUEST-SIZE COMPACTION/.test(source)],
  ["mounted durable context has its own bounded section", /priorContext\?: string/.test(source) && /PRIOR DURABLE CASE CONTEXT/.test(source) && /trim\(input\.priorContext, 1_000\)/.test(source)],
  ["explicit model-facing context budget override exists", /maxChars\?: number/.test(source) && /input\.maxChars/.test(source)],
  ["canonical Investigator prompt requests a bounded working-context layer", /maxChars: input\.mode === "discovery" \? 1_600 : 3_000/.test(core)],
  ["canonical Investigator prompt reserves a bounded intelligence-state layer", /boundInvestigatorPromptSection\(\s*input\.intelligenceContext[\s\S]*?input\.mode === "discovery" \? 600 : 900/.test(core)],
  ["current findings retain both early and recent entries", /headTail\(input\.findings, 6\)/.test(source)],
  ["archived trajectory retains both early and recent entries", /headTail\(input\.trajectoryRecords \?\? \[\], 10\)/.test(source)],
  ["shared URL-safe reducer enforces requested prompt bounds", /export function compactPromptSectionPreservingUrlTokens/.test(source) && /const limit = Math\.max\(0, requested\)/.test(source) && /source\.length <= limit/.test(source) && /return source\.slice\(0, limit\)/.test(source)],
  ["unbounded whole-trajectory prompt assembly is absent", !/trajectoryRecords\.map\(.*observation.*join\(/s.test(source)],
  ["canonical continuation uses AI-generated semantic memory compaction on the separate Right-hand credential lane", discoveryContinuation.includes("summarizeInvestigatorContextWithAiCompactor") && /await summarizeInvestigatorContextWithAiCompactor\(\{rawContext:initialContext,trustedSourceContext:trustedCaseContextDocument,maxChars:7000,jobId:jobId!,caseId\}\)/.test(discoveryContinuation) && aiCompaction.includes("runGroqRightHandFreeJson") && !aiCompaction.includes("runGroqBossMemoryCompaction") && !discoveryContinuation.includes("compactCanonicalDiscoveryContinuationContext(context,7000)")],
  ["continuation fetch provenance comes only from the persisted case document", /trustedCaseContextDocument\s*=\s*contextOf\(lockedFile\)/.test(discoveryContinuation) && /trustedSourceContext:trustedCaseContextDocument/.test(discoveryContinuation) && /sourceSuccessfulFetchUrls\(input\.trustedSourceContext \?\? ""\)/.test(aiCompaction)],
  ["AI compaction preserves exact source URLs and refuses invented provenance", /summaryUrlsAreGrounded\(summary, allowedSource\)/.test(aiCompaction) && /Every URL in the summary must be an exact URL token copied from the source/.test(aiCompaction)],
  ["Right-hand strict summary schema avoids unsupported maxLength and enforces the character cap locally", /properties:\s*\{\s*summary:\s*\{\s*type:\s*"string"\s*\}\s*,?\s*\}/.test(aiCompaction) && !/maxLength/.test(aiCompaction) && /summary\.length > maxChars/.test(aiCompaction)],
  ["continuation compaction fails closed rather than substituting a deterministic excerpt", discoveryContinuation.includes("refusing a deterministic excerpt of durable case context") && /Do not invent, strengthen, merge, or infer facts/.test(aiCompaction)],
  ["AI memory compaction uses strict Right-hand 20B requests with one bounded Right-hand 120B recovery", /MAX_SUMMARY_CHARS = 7_000/.test(aiCompaction) && /maxCompletionTokens: 768/.test(aiCompaction) && /const safeTargetChars = Math.max\(160, Math.floor\(maxChars \* 0\.65\)\)/.test(aiCompaction) && /Include at most two exact URL tokens/.test(aiCompaction) && /summary_contains_ungrounded_url/.test(aiCompaction) && /summary_contains_unproven_fetch_claim/.test(aiCompaction) && (aiCompaction.match(/requestRightHandSummary\([^;]+openai\/gpt-oss-20b/g) || []).length >= 2 && /requestRightHandSummary\([^;]+openai\/gpt-oss-120b/.test(aiCompaction) && /runGroqRightHandFreeJson/.test(aiCompaction) && !/runGroqBossMemoryCompaction/.test(aiCompaction) && /preferredModel\?: string/.test(rightHand) && /allowModelFallback\?: boolean/.test(rightHand) && /requestOptions\?\.allowModelFallback === false/.test(rightHand) && /cognitiveTask: "context_compaction"/.test(aiCompaction) && /GROQ_RIGHT_HAND_MAX_PROMPT_CHARS/.test(aiCompaction)],
  ["multi-chunk AI memory summaries keep a bounded 1,500-character minimum intermediate budget", /const partialTarget = Math\.min\(1_600, Math\.max\(1_500,/.test(aiCompaction)],
  ["AI compaction binds page-retrieval claims to exact successful visit/browser_fetch URLs", /function sourceSuccessfulFetchUrls/.test(aiCompaction) && /function summaryClaimsFetchedEvidence/.test(aiCompaction) && /summaryClaimsFetchedEvidence\(summary, successfulFetchUrls\)/.test(aiCompaction) && /successful fetch of one URL never authorizes claims about another lead URL/.test(aiCompaction) && /const negativeRetrieval =/.test(aiCompaction) && /summary\s*\.split\(/.test(aiCompaction)],
  ["oversized recent observations use cached AI semantic summaries with a 1,200-character bounded limit before prompt construction", core.includes("const RECENT_OBSERVATION_COMPACTION_MAX_CHARS = 1_200;") && (core.match(/maxChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS/g) || []).length === 2 && (core.match(/recentObservationChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS/g) || []).length === 2 && core.includes("const sourceToSummarize = [") && core.includes("ai_recent_observation_compaction_unavailable") && core.includes("promptRecord.observation = compactedObservation") && core.includes("aiCompactedObservationBySource.set(cacheKey, compactedObservation)")],
  ["recent-observation compaction uses a non-semantic provenance-safe fallback when AI compaction is unavailable", core.includes("compactRecentObservationWithFallback") && core.includes("deterministic_observation_compaction_fallback") && /full source remains durable; omitted content is unknown/i.test(core) && !/No action was sent with a deterministically truncated substitute observation/.test(core) && /allowRecoveryModel: false/.test(aiCompaction) && /buildDeterministicContextProjection/.test(aiCompaction)],
  ["latest search-result observations are bounded while fetched-page observations remain complete and untrusted", preservesCompleteLatestEvidence && stepPromptBuilder.includes("serializeDurablePromptRecord(latestRecord)") && stepPromptBuilder.includes("serializeDurablePromptRecord(latestSuccessfulFetchRecord)")],
  ["no smallest emergency tier replaces or slices the full latest trajectory record", stepPromptBuilder.includes("const latestRecordTail = [") && stepPromptBuilder.includes("buildLatestRecordTail()") && !stepPromptBuilder.includes("buildShortestEmergencyRecordTail") && !stepPromptBuilder.includes("compactRecordEnvelope(latestRecord")],
  ["full Investigator prompt carries the latest action, bounded search leads and complete fetched observations without size-selected emergency tiers", core.includes("const latestRecord = orderedTrajectoryRecords.at(-1);") && preservesCompleteLatestEvidence && appendsLatestEvidenceAfterComposedPrompt],
  ["historical unvisited search leads survive AI compaction without replaying their already-summarized observation", preservesHistoricalSearchLeadWithoutReplayingCompactedObservation],
  ["latest durable record, complete fetch evidence and all latest-action URLs are appended to the live Investigator prompt", stepPromptBuilder.includes("const latestRecord = orderedTrajectoryRecords.at(-1);") && stepPromptBuilder.includes("buildLatestRecordTail()") && stepPromptBuilder.includes("serializeDurablePromptRecord(carryForwardRecord)") && preservesHistoricalSearchLeadWithoutReplayingCompactedObservation && stepPromptBuilder.includes("serializeDurablePromptRecord(latestSuccessfulFetchRecord)") && stepPromptBuilder.includes("[composedPrompt, latestRecordTail].filter(Boolean).join(\"\\n\\n\")")],
  ["Investigator prompt qualification follows the active objective and preserves conditional wealth evidence rules", ["people are the ultimate mission", "People—not companies or executive prestige", "CASE OBJECTIVE: source-backed real-person research", "CASE OBJECTIVE: find real people with credible ownership evidence", "Seek source-backed ownership/equity/control/investment clues during target research", "owner/operator, ownership/investment or transaction signal"].every((forbidden) => !core.includes(forbidden)) && orientation.includes("human objective/Boss scope govern") && orientation.includes("B2B needs fetched role/company evidence") && orientation.includes("wealth objectives need sourced ownership/equity/investment") && core.includes("DISCOVERY LEAD HANDOFF CONTRACT") && orientation.includes("B2B needs fetched role/company evidence") && orientation.includes("Target research verifies role/relationship/materiality, counter-evidence and route before promotion") && orientation.includes("Target-scoped research independently corroborates or falsifies claims required by the active objective")],
  ["canonical launch defaults preserve the same caller-owned objective across UI and API", (() => {
    const objectiveLiteral = (text) => text.match(/export const DEFAULT_ATLAS_DISCOVERY_OBJECTIVE = ("(?:[^"\\\\]|\\\\.)*");/)?.[1] ?? null;
    const uiObjective = objectiveLiteral(launchUi);
    const apiObjective = objectiveLiteral(launchDefaults);
    return Boolean(uiObjective)
      && uiObjective.includes("Discover lesser-known people with credible wealth potential and public/professional routes.")
      && uiObjective.length <= 1_202
      && uiObjective.includes("use only human-specified geography")
      && apiObjective === uiObjective
      && launchDefaults.includes("discoveryObjective: DEFAULT_ATLAS_DISCOVERY_OBJECTIVE")
      && canonicalDiscovery.includes("opts.discoveryObjective?.trim() || DEFAULT_ATLAS_DISCOVERY_OBJECTIVE")
      && !canonicalDiscovery.includes("Discover lesser-known people with credible wealth potential");
  })()],
  ["human case objective has explicit verbatim protection markers", source.includes("VERBATIM_CASE_OBJECTIVE_BEGIN") && source.includes("VERBATIM_CASE_OBJECTIVE_END") && source.includes("export function buildAuthoritativeCaseObjectiveBlock") && source.includes("containsVerbatimCaseObjective")],
  ["canonical Investigator prompt separates the complete objective from auxiliary context and appends the latest action plus complete fetched evidence", core.includes("buildAuthoritativeCaseObjectiveBlock(input.objective)") && core.includes("authoritativeCaseObjective") && core.includes("objective: \"\"") && core.includes("const composedPrompt = [") && core.includes("activeBossScopeSection") && preservesCompleteLatestEvidence && appendsLatestEvidenceAfterComposedPrompt],
  ["wealth-discovery relevance guidance rejects mission descriptors as query hypotheses without prescribing a source or sequence", orientation.includes("MISSION DESCRIPTORS ARE NOT SEARCH HYPOTHESES") && orientation.includes("concrete, falsifiable public-evidence hypothesis") && orientation.includes("other objectives use their own evidence criteria")],
  ["full Investigator prompt retains objective, Boss scope, complete fetched evidence and bounded unverified search context without size-driven emergency tiers", core.includes("const composedPrompt = [") && core.includes("authoritativeCaseObjective") && core.includes("activeBossScopeSection") && preservesCompleteLatestEvidence && appendsLatestEvidenceAfterComposedPrompt],
  ["emergency prompt sizing remains advisory while objective and output contracts remain intact", core.includes("authoritativeCaseObjective") && core.includes("containsVerbatimCaseObjective") && core.includes("PROMPT SIZE TARGET (ADVISORY, NOT A HARD REQUIREMENT)") && !/Cannot preserve the complete human case objective within maxPromptChars/.test(core)],
  ["complete discovery prompt retains model-owned falsifiable evidence-hypothesis guidance without a fixed source or action itinerary", orientation.includes("concrete, falsifiable public-evidence hypothesis") && orientation.includes("No fixed action sequence.") && orientation.includes("do not force a mixed-source batch or a registry-first order") && orientation.includes("The Investigator decides relevance and chooses whether to search, fetch, use a registry, pivot or stop by expected information gain") && core.includes("DISCOVERY SEARCH ECONOMY") && orientation.includes("source class need not appear in every discovery query")],
  ["provider-boundary prompt validation checks the complete action schema and preserves the original prompt verbatim", /function boundInvestigatorProviderPrompt[\s\S]*?if \(!completeSchemaPresent\)[\s\S]*?return normalized;/.test(core)],
  ["AI summary URL extraction treats escaped LF and CRLF sequences as token boundaries", aiCompaction.includes("escapedLineBreak") && aiCompaction.includes("const serializedToken = escapedLineBreak >= 0")],
  ["Boss-compacted latest observation has an explicit larger working-context allowance without changing the default prompt tier", source.includes("recentObservationChars?: number") && source.includes("budget.recentObservationChars = Math.min(3_000, Math.max(600, Math.floor(input.recentObservationChars)))") && source.includes("Math.min(1_400, Math.max(700, Math.floor(budget.maxChars * 0.7)))") && (core.match(/recentObservationChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS/g) || []).length === 2],
  ["full historical memory survives final prompt budgeting through semantic compaction or a labelled deterministic projection", /if \(aiCompactedHistoricalContext && !prompt\.includes\(aiCompactedHistoricalContext\)\)/.test(core) && /compactInvestigationContextWithFallback/.test(core) && /maxChars: 900/.test(core) && /deterministic_historical_memory_projection/.test(core) && /Historical research context could not be shortened enough to fit the complete Investigator prompt/.test(core)],
  ["deterministic historical excerpts do not advance the semantic-through turn marker", core.includes("previouslySemanticallyCompactedThroughTurn") && core.includes("if (compactedMemory.method === \"ai_semantic\")") && core.includes("aiCompactedHistoricalThroughTurn = previouslySemanticallyCompactedThroughTurn") && core.includes("Shortening an AI summary deterministically can omit facts from that") && core.includes("summary too, so do not advance the semantic-through marker.")],
  ["complete prior trajectory reaches Boss memory before live prompt record limits", /const completePriorTrajectoryRecords = \[\.\.\.\(input\.priorTrajectoryRecords \?\? \[\]\)\]/.test(core) && /const completePromptRecords = \[\.\.\.completePriorTrajectoryRecords, \.\.\.records\]/.test(core) && /const historicalRecords = completePromptRecords\.slice/.test(core) && /const allPromptRecords = sanitizeObservableValue\(\[\.\.\.priorTrajectoryRecords, \.\.\.records\]\.slice\(-MAX_TRAJECTORY_RECORDS\)\)/.test(core)],
  ["Right-hand review keeps objective compaction fail-closed while using safe projections for shared state, acts and history", /summarizeInvestigatorContextWithAiCompactor/.test(targetOversight) && /allowRecoveryModel: false/.test(targetOversight) && (targetOversight.match(/compactInvestigationContextWithFallback\(/g) || []).length === 3 && /observationCompactionMethod/.test(targetOversight) && /DETERMINISTIC PROJECTION\/EXCERPT/.test(targetOversight) && /AI memory compactor could not semantically compact the active objective for Right-hand review/.test(targetOversight) && /runGroqRightHandFreeJson/.test(targetOversight) && /rightHand.status!==\"completed\"/.test(targetOversight) && /shouldSummarizeCurrentAct/.test(targetOversight)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
