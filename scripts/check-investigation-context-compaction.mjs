import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const discoveryContinuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts", "utf8");
const aiCompaction = fs.readFileSync("artifacts/api-server/src/src/lib/ai-investigation-context-compaction.ts", "utf8");
const targetOversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");
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
  ["canonical Investigator prompt requests a bounded working-context layer", /maxChars: 3_500/.test(core)],
  ["canonical Investigator prompt reserves a bounded intelligence-state layer", /boundInvestigatorPromptSection\(\s*input\.intelligenceContext[\s\S]*?1_200/.test(core)],
  ["current findings retain both early and recent entries", /headTail\(input\.findings, 6\)/.test(source)],
  ["archived trajectory retains both early and recent entries", /headTail\(input\.trajectoryRecords \?\? \[\], 10\)/.test(source)],
  ["shared URL-safe reducer enforces requested prompt bounds", /export function compactPromptSectionPreservingUrlTokens/.test(source) && /const limit = Math\.max\(0, requested\)/.test(source) && /source\.length <= limit/.test(source) && /return source\.slice\(0, limit\)/.test(source)],
  ["unbounded whole-trajectory prompt assembly is absent", !/trajectoryRecords\.map\(.*observation.*join\(/s.test(source)],
  ["canonical continuation uses Boss-generated semantic memory compaction", discoveryContinuation.includes("summarizeInvestigatorContextWithBoss") && /await summarizeInvestigatorContextWithBoss\(\{rawContext:initialContext,maxChars:7000,jobId:jobId!,caseId\}\)/.test(discoveryContinuation) && !discoveryContinuation.includes("compactCanonicalDiscoveryContinuationContext(context,7000)")],
  ["AI compaction preserves exact source URLs and refuses invented provenance", /summaryUrlsAreGrounded\(summary, allowedSource\)/.test(aiCompaction) && /Every URL in the summary must be an exact URL token copied from the source/.test(aiCompaction)],
  ["Groq strict summary schema avoids unsupported maxLength and enforces the character cap locally", /summary: \{ type: "string" \}/.test(aiCompaction) && !/maxLength/.test(aiCompaction) && /summary\.length > maxChars/.test(aiCompaction)],
  ["continuation compaction fails closed rather than substituting a deterministic excerpt", discoveryContinuation.includes("refusing a deterministic excerpt of durable case context") && /Do not invent, strengthen, merge, or infer facts/.test(aiCompaction)],
  ["Boss compaction has bounded token headroom, a safe character target, and explicit constraint-aware repair", /MAX_SUMMARY_CHARS = 7_000/.test(aiCompaction) && /const outputBudget = Math.min\(2_048, Math.max\(1_024, Math.ceil\(maxChars \* 0\.85\)\)\)/.test(aiCompaction) && /const repairOutputBudget = Math.min\(2_048, Math.max\(outputBudget, Math.ceil\(outputBudget \* 1\.25\)\)\)/.test(aiCompaction) && /const safeTargetChars = Math.max\(160, Math.floor\(maxChars \* 0\.65\)\)/.test(aiCompaction) && /Include at most two exact URL tokens/.test(aiCompaction) && /previous summary included URL tokens that were not copied exactly from the source/.test(aiCompaction) && /maxOutputTokens: outputBudget/.test(aiCompaction) && /maxOutputTokens: repairOutputBudget/.test(aiCompaction)],
  ["oversized recent observations use cached Boss-generated semantic summaries with a 1,200-character bounded limit before prompt construction", core.includes("const RECENT_OBSERVATION_COMPACTION_MAX_CHARS = 1_200;") && (core.match(/maxChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS/g) || []).length === 2 && core.includes("recentObservationChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS") && core.includes("const sourceToSummarize = [") && core.includes("ai_recent_observation_compaction_unavailable") && core.includes("promptRecord.observation = compactedObservation") && core.includes("aiCompactedObservationBySource.set(cacheKey, compactedObservation)")],
  ["recent-observation compaction fails closed instead of sending a code-truncated substitute", /No action was sent with a deterministically truncated substitute observation/.test(core)],
  ["Boss-compacted latest observation has an explicit larger working-context allowance without changing the default prompt tier", source.includes("recentObservationChars?: number") && source.includes("budget.recentObservationChars = Math.min(3_000, Math.max(600, Math.floor(input.recentObservationChars)))") && source.includes("Math.min(1_400, Math.max(700, Math.floor(budget.maxChars * 0.7)))") && core.includes("recentObservationChars: RECENT_OBSERVATION_COMPACTION_MAX_CHARS")],
  ["full AI historical memory must survive final prompt budgeting or be model-condensed/fail-closed", /if \(aiCompactedHistoricalContext && !prompt\.includes\(aiCompactedHistoricalContext\)\)/.test(core) && /maxChars: 900/.test(core) && /AI historical memory still did not fit in the full Investigator prompt/.test(core) && /No action was sent with memory silently omitted/.test(core)],
  ["complete prior trajectory reaches Boss memory before live prompt record limits", /const completePriorTrajectoryRecords = \[\.\.\.\(input\.priorTrajectoryRecords \?\? \[\]\)\]/.test(core) && /const completePromptRecords = \[\.\.\.completePriorTrajectoryRecords, \.\.\.records\]/.test(core) && /const historicalRecords = completePromptRecords\.slice/.test(core) && /const allPromptRecords = sanitizeObservableValue\(\[\.\.\.priorTrajectoryRecords, \.\.\.records\]\.slice\(-MAX_TRAJECTORY_RECORDS\)\)/.test(core)],
  ["Right-hand review preserves active objective, shared state, recent acts and current observations via Boss summaries", /summarizeInvestigatorContextWithBoss/.test(targetOversight) && /Boss could not produce a bounded provenance-safe summary of shared case state/.test(targetOversight) && /Boss could not semantically compact the current act observation/.test(targetOversight) && /Boss could not semantically compact the active objective for Right-hand review/.test(targetOversight) && /Boss could not semantically compact recent Investigator acts/.test(targetOversight) && /shouldSummarizeCurrentAct/.test(targetOversight)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
