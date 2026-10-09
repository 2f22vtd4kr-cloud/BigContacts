import fs from "node:fs";
const runner=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8");
const atlas=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts","utf8");
const agentic=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts","utf8");
const oversight=fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts","utf8");
const evidence=fs.readFileSync("artifacts/api-server/src/src/lib/source-corroboration.ts","utf8");
const intelligence=fs.readFileSync("artifacts/api-server/src/src/lib/research-intelligence-engine.ts","utf8");
const mutationGuard=fs.readFileSync("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts","utf8");
const core=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8");
const control=fs.readFileSync("artifacts/api-server/src/src/lib/target-control-decision.ts","utf8");
const atlasDecision=fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts","utf8");
const continuation=fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts","utf8");
const checks=[
["target continuation row lock fences completion and every cancellation marker before remount",/\.for\("update"\)[\s\S]*locked\.status === "complete"[\s\S]*locked\.status === "cancelled"/.test(continuation)&&/locked\.status === "review" && \["canonical-atlas-cancelled", "canonical-lease-lost", "canonical-continuation-cancelled"\]\.includes\(String\(locked\.currentAction \?\? ""\)\)/.test(continuation)],
["target control persistence rechecks durable cancellation fence under row lock",/status: researchCasesTable\.status[\s\S]*currentAction: researchCasesTable\.currentAction/.test(control)&&/caseRow\.status === "complete"/.test(control)&&/caseRow\.status === "cancelled"/.test(control)],
["canonical runner gives each Investigator act a bounded multi-step budget",/const actIterations = Math\.min\(depth\.investigatorIterationsPerAct, remainingInvestigatorIterations\)/.test(runner)&&/maxIterations:\s*Math\.max\(1, actIterations - quotaRecoveryIterations\)/.test(runner)],
["canonical runner reads durable act oversight after each act with exact run and turn",/readOversight\(caseState,\s*latestResult\.executionId\s*\?\?\s*null,\s*actNumber\)/.test(runner)],
["canonical runner does not consume stale targetControlDecisions",!/readContinuationControl\(/.test(runner)],
["canonical target case reuse is bound to current atlas job",/state\.atlasJobId === atlasJobId/.test(runner)],
["canonical target runner fails closed before acts when case is not active",/const caseRow = await ensureTargetCase\([\s\S]{0,500}?\);[\s\S]{0,220}caseRow\.status !== "active"/.test(runner)],
["inactive target case terminalizes its owned job",/if \(manageJobLifecycle\)[\s\S]*?Target runner refused to start because durable case status/.test(runner)],
["canonical runner passes exact case identity into Investigator",/caseId: caseRow\.id/.test(runner)],
["canonical target context is rebuilt from durable Investigator observations",/loadDurableTargetTrajectory\(caseRow\.id\)/.test(runner)&&/buildInvestigatorContext\(\{ targetName: target\.name/.test(runner)],
["canonical target control iteration is durably monotonic",/iteration:\s*sql<number>\`\$\{researchCasesTable\.iteration\}\s*\+\s*\$\{completedActs\}\`/.test(runner)],
["canonical runner blocks on stop",/if \(lastOversight\.action === "stop"\) break/.test(runner)],
["canonical runner fails closed when oversight is unavailable",/!lastOversight \|\| lastOversight\.status !== "completed"/.test(runner)],
["redirect becomes a research objective, not a tool command",/Investigator research objective/.test(runner)],
["canonical runner establishes one global target deadline",/const deadline = Date\.now\(\) \+ hardTimeoutMs/.test(runner)],
["canonical target act deadline preserves provider decision window unless remaining job budget is shorter",/import \{ AGENTIC_PROVIDER_DECISION_TIMEOUT_MS, deriveProviderBoundedActTimeoutMs/.test(runner)&&/deriveProviderBoundedActTimeoutMs\(remainingMs, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS\)/.test(runner)&&/return Math\.min\(remaining, Math\.max\(providerBudget, Math\.min\(actMaximum, Math\.floor\(remaining \/ 2\)\)\)\)/.test(core)],
["canonical runner refuses to start a sub-30-second act",/remainingMs < 30_000/.test(runner)],
["canonical target finalization is fenced to its active job and cancellation state", (() => { const start = runner.indexOf("const finalCase = await db.update(researchCasesTable)"); const end = runner.indexOf("returning({ status: researchCasesTable.status });", start); const block = start >= 0 && end >= 0 ? runner.slice(start, end) : ""; return block.includes("eq(researchCasesTable.status, \"active\")") && block.includes("atlasJobId") && block.includes("currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost', 'canonical-continuation-cancelled')"); })()],
["canonical agentic target wrapper actively aborts at its deadline",/setTimeout\(\(\) => overallController\.abort\(\), requestedHardTimeout\)/.test(agentic)],
["canonical agentic target wrapper clears its deadline timer",/clearTimeout\(deadlineTimer\)/.test(agentic)],
["canonical target wrapper has a finite action-turn ceiling",!/Number\.POSITIVE_INFINITY/.test(agentic)&&/const MAX_TARGET_ACTION_TURNS = 64/.test(agentic)],
["canonical target wrapper does not auto-fan-out fixed mission briefs",!/runParallelMissionPass\(/.test(agentic)],
["canonical runner owns complete-episode oversight",/oversightMode: "caller"/.test(runner)&&/callerOwnsOversight = input\.oversightMode === "caller"/.test(agentic)],
["target completion requires an accepted Investigator terminal and completed oversight stop",/isCanonicalTargetEpisodeComplete\(\{[\s\S]*stopReason: latestResult\?\.stopReason \?\? null[\s\S]*oversightAction: lastOversight\?\.action \?\? null/.test(runner)],
["target completion requires immutable act-anchored claim-grade evidence graphs",/evidenceGraphCount: lastOversight\?\.evidenceGraphCount \?\? 0/.test(runner)&&/evidenceGraphCount: Array\.isArray\(\(latest as Record<string, unknown>\)\.evidenceGraphs\)/.test(runner)],
["target resource and deadline ceilings cannot become complete",runner.includes("const incomplete = !stopped") && runner.includes("resourceLimited, deadlineExceeded")],
["Investigator episode does not invoke internal oversight when caller owns it",/if \(callerOwnsOversight\) return \{ stop: false, unavailable: false \}/.test(agentic)],
["Investigator act proposals receive canonical oversight after each complete episode",/await reviewTargetInvestigationAct\(/.test(runner)],
["next Atlas control turn receives target investigation state",/latestTargetInvestigation = \{/.test(atlas)&&/targetInvestigation: latestTargetInvestigation/.test(atlas)],
["target control context includes durable target case status",/status: targetCase\?\.status/.test(atlas)&&/caseId: targetCase\?\.id/.test(atlas)],
["target control context is mandatory",/if \(!oversightContext\)/.test(agentic)],
["missing target control context fails closed",/(?:CONTROL_CONTEXT_UNAVAILABLE|stopReason:\s*"LLM_UNAVAILABLE")[\s\S]*?Target-scoped agentic research requires a durable control case/.test(agentic)],
["research redirects are validated as objective-only text",/validateResearchObjective/.test(agentic)],
["invalid research redirects fail closed",/Groq Boss produced an invalid research objective/.test(agentic)],
["act cancellation observes the global deadline",/Date\.now\(\) >= deadline/.test(runner)],
["agentic entrypoint performs Right Hand + Boss review after an act",/await reviewTargetInvestigationAct\(/.test(agentic)],
["completed act is atomically committed with oversight and projection",/async function persistActOversight[\s\S]*db\.transaction\(async\(tx\)/.test(oversight)&&/tx\.update\(researchCasesTable\)/.test(oversight)],
["observation event is written as head-investigator tool observation",/actorRole\s*:\s*"head_investigator"/.test(oversight)&&/eventType\s*:\s*"tool_observation"/.test(oversight)],
["observation event is idempotently correlated by case, run and turn",/investigator-act:case:\$\{caseId\}:job:\$\{jobId\?\?\"legacy\"\}:run:\$\{runId\}:turn:\$\{turn\}/.test(oversight)],
["oversight event is correlated by case, run and turn",/target-oversight:case:\$\{caseId\}:job:\$\{jobId\?\?\"legacy\"\}:run:\$\{runId\}:turn:\$\{turn\}/.test(oversight)],
["agentic wrapper passes execution identity to oversight",/runId: executionId/.test(agentic)],
["agentic wrapper loads oversight by exact case id",/loadTargetActOversightContext\(input\.caseId/.test(agentic)],
["target oversight has no target-name fallback",!/like\(researchCasesTable\.caseFile/.test(oversight)&&!/orderBy\(desc\(researchCasesTable\.updatedAt\)\)/.test(oversight)],
["evidence graph observations can carry immutable event IDs",/eventId\?\s*:\s*number\s*\|\s*null/.test(evidence)],
["canonical act graphs require immutable observation anchors",/validateClaimSupportGraph\(graph,\s*true\)/.test(oversight)],
["Right Hand is mandatory before Boss continuation",/if\(rightHand\.status!=="completed"\)/.test(oversight)],
["target per-act Right-hand contract is exact-field validated",/validateTargetActRightHandAdvice\(rightParsed\)/.test(oversight)&&/export function validateTargetActRightHandAdvice\(value:[^\n]*\):boolean\s*\{\s*return validateAtlasOpeningRightHandReview\(value\);\s*\}/.test(oversight)&&/validateExactObjectFields\(value,\s*\["decision",\s*"reason",\s*"focusLanes",\s*"confidence"\]\)/.test(atlasDecision)],
["target per-act Boss contract is exact-field validated",/validateTargetActBossOversight\(parsed\)/.test(oversight)&&/validateExactFields\(value,\s*\["action",\s*"direction",\s*"reason",\s*"confidence"\]\)/.test(oversight)],
["completed-act observation compaction preserves its tail",/function compactOversightText/.test(oversight)&&/ACT OBSERVATION MIDDLE OMITTED/.test(oversight)],
["per-act control prompt bounds current act",/boundOversightPromptSection\(JSON\.stringify\(currentAct\),3500\)/.test(oversight)],
["per-act control prompt bounds Right-hand advice",/boundOversightPromptSection\(JSON\.stringify\(rightHand\),1200\)/.test(oversight)],
["per-act control prompt bounds recent acts",/boundOversightPromptSection\(JSON\.stringify\(trajectory\),4500\)/.test(oversight)],
["completed-act observed URLs are sanitized and retain recent entries",/observedUrls: headTail\(safeRecord\.observedUrls\.map\(\(url\) => sanitizeUrlForEvidence\(url\)\), 6\)/.test(oversight)],
["target oversight persistence requires an active locked case",/eq\(researchCasesTable\.status,"active"\)/.test(oversight)&&/\.for\("update"\)/.test(oversight)&&/no longer active; refusing stale oversight persistence/.test(oversight)],
["target oversight refuses cancelled/fenced cases before provider calls",/status:researchCasesTable\.status/.test(oversight)&&/if\(row\.status!=="active"\)return null/.test(oversight)&&/findTargetCase\(input\.caseId,input\.targetName\)/.test(oversight)],
["Right Hand failure stops the next Investigator act",/Groq Right-hand oversight was unavailable/.test(oversight)],
["discovery is not accidentally target-gated",/input\.mode === "discovery"/.test(agentic)],
["selected Investigator executes only the Boss-selected capability",/const fn = selectedInvestigatorLlm && investigatorCapabilityKeyName\(selectedInvestigatorLlm\)/.test(core)&&/callGroqJson\(promptValue, signalValue, cognitiveTask, selectedInvestigatorLlm\)/.test(core)&&!/orderedProviders/.test(core)&&!/for\s*\(const \[name, fn\] of orderedProviders\)/.test(core)],
["selected Investigator records no cross-provider fallback",/fallback: \[\]/.test(core)],
["canonical ReAct domain lookup receives cancellation",/lookupDomainSurface\(action\.domain, \{ provider: action\.provider, signal: runController\.signal \}\)/.test(core)],
["canonical ReAct registry lookup receives cancellation",/searchRegistry\(\{ query: action\.query, registry: action\.registry as any, limit: 8, signal: runController\.signal \}\)/.test(core)],
["direct Apex entity contact PATCH is guarded",/isDirectEntityCardPatch\(req\.path\)/.test(mutationGuard)],
["Apex contact fields are explicitly enumerated at the card boundary",/DIRECT_CONTACT_FIELDS/.test(mutationGuard)&&/contactOutcome/.test(mutationGuard)&&/metadata/.test(mutationGuard)],
["legacy enrichment routes remain retired",/RETIRED_MUTATING_ENRICHMENT_PATHS/.test(mutationGuard)&&/status\(410\)/.test(mutationGuard)],
];
checks.push(["structured intelligence only receives grounded Investigator findings",/groundedFindingsForTrajectory/.test(agentic)&&/recordResult\(intelligence, normalizedRecord, \[\.\.\.historyRecords, \.\.\.records\]\)/.test(agentic)&&/sourceObservations: history\.map/.test(agentic)&&/sourceObservationsByUrl/.test(intelligence)]);
checks.push(["durable target trajectory replay excludes search findings",/const rawFindings = Array\.isArray\(payload\.findings\) && !\["web_search", "parallel_web_search"\]\.includes\(action\)/.test(runner)],);
checks.push(["target Investigator act turns resume monotonically from durable trajectory",/const durableActTurn = durableTrajectory\.records\.reduce/.test(runner)&&/const firstActNumber = Math\.max\(1, durableActTurn \+ 1\)/.test(runner)&&/for \(let actNumber = firstActNumber;/.test(runner)]);
checks.push(["canonical target unexpected failures close the durable case",/catch \(error\)/.test(runner)&&/investigator-execution-failed/.test(runner)&&/status: "review"/.test(runner)]);
checks.push(["child target runner does not terminalize parent Atlas job",/manageJobLifecycle\?: boolean/.test(runner)&&/const manageJobLifecycle = options\.manageJobLifecycle !== false/.test(runner)&&/if \(manageJobLifecycle\) await updateJob/.test(runner)&&/manageJobLifecycle: false/.test(atlas)]);
checks.push(["target hard-quota recovery charges failed turns exactly once",/quotaRecoveryIterations \+= Math\.max\(0, latestResult\.iterations/.test(runner)&&/const finalActIterations = isHardQuotaResult\(latestResult\) \? 0/.test(runner)&&/investigatorIterationsUsed \+= quotaRecoveryIterations \+ finalActIterations/.test(runner)]);
checks.push(["target reassignment durable state survives finalization",/const reassignedCaseState = await db\.transaction\(/.test(runner)&&/return nextFile;/.test(runner)&&/caseState = reassignedCaseState;/.test(runner)]);
checks.push(["target and discovery reassignment history remains bounded",/investigatorCapabilityHistory:[^;]*\.slice\(-15\)/.test(runner)&&/investigatorCapabilityHistory:[^;]*\.slice\(-15\)/.test(atlas)]);
checks.push(["discovery hard-quota recovery consumes remaining Investigator budget",/let iterationsConsumed = Math\.max\(0, result\.iterations/.test(atlas)&&/const remainingIterations = Math\.max\(0, maxIterations - iterationsConsumed\)/.test(atlas)&&/maxIterations: remainingIterations/.test(atlas)]);
checks.push(["target hard-quota exclusions propagate to the parent Atlas job",/exhaustedInvestigatorLlm/.test(runner)&&/for \(const exhausted of targetResult\.exhaustedInvestigatorLlm\)/.test(atlas)&&/quotaExhaustedInvestigators\.add\(exhausted\)/.test(atlas)]);
checks.push(["target remount refuses a capability already excluded by the current Atlas job",/initialExcludedInvestigators = new Set<InvestigatorCapability>/.test(runner)&&/storedInvestigatorCapability && !initialExcludedInvestigators\.has\(storedInvestigatorCapability\)/.test(runner)&&/investigatorLlm: InvestigatorCapability \| null = storedInvestigatorCapability && !initialExcludedInvestigators\.has\(storedInvestigatorCapability\)/.test(runner)]);
checks.push(["target result early exits preserve quota-recovery metadata contract",!(/return \{ investigatorIterationsUsed: 0, resourceLimited: false, status: "review" \};/.test(runner))]);
checks.push(["target case reconciliation uses authoritative state and distinguishes missing, cancelled, and unavailable",/job = await getJobStrict\(atlasJobId\)/.test(runner)&&/const cancelled = job\?\.status === "cancelled"/.test(runner)&&/canonical-atlas-job-missing/.test(runner)&&/canonical-job-state-unavailable/.test(runner)&&/target case creation cannot be reconciled safely/.test(runner)&&/target case creation is blocked/.test(runner)]);
checks.push(["target acts require an authoritative running job before model work",/const job = await getJobStrict\(atlasJobId\); if \(!job\) throw new Error\("Canonical Atlas job record missing/.test(runner)&&/if \(job\.status !== "running"\) throw new Error\("Canonical Atlas job is not running/.test(runner)]);
checks.push(["cancelled target episodes are verified against durable state before further control work",/if \(latestResult\.status === "cancelled"\) \{[\s\S]{0,800}const stoppedJob = await getJobStrict\(atlasJobId\)[\s\S]{0,600}stoppedJob\.status === "cancelled"/.test(runner)]);
checks.push(["target investigation errors cannot classify generic cancellation words as operator cancellation",/const cancelledByJob = currentJob\?\.status === "cancelled" \|\| rawMessage\.startsWith\("Canonical Atlas job cancelled;"\)/.test(runner)&&!/\/cancelled\|canceled\/i\.test\(rawMessage\)/.test(runner)]);
checks.push(["contact evidence processing uses strict job state before contact extraction",/getJobStrict\(input\.jobId\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts","utf8"))&&!/getJob\(input\.jobId\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts","utf8"))]);
checks.push(["shared ReAct cancellation checks surface unknown job state and lease loss",/getJobStrict\(input\.jobId\)/.test(agentic)&&/Canonical agentic job lease was lost/.test(agentic)&&/if \(input\.shouldCancel && await input\.shouldCancel\(\)\) return true/.test(agentic)]);
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);
