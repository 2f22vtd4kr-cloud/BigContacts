import fs from "node:fs";
const runner=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8");
const atlas=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts","utf8");
const agentic=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts","utf8");
const oversight=fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts","utf8");
const evidence=fs.readFileSync("artifacts/api-server/src/src/lib/source-corroboration.ts","utf8");
const mutationGuard=fs.readFileSync("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts","utf8");
const core=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8");
const checks=[
["canonical runner gives each Investigator act a bounded multi-step budget",/const actIterations = Math\.min\(depth\.investigatorIterationsPerAct, remainingInvestigatorIterations\)/.test(runner)&&/maxIterations: actIterations/.test(runner)],
["canonical runner reads durable act oversight after each act with exact run and turn",/readOversight\(caseState,\s*latestResult\.executionId\s*\?\?\s*null,\s*actNumber\)/.test(runner)],
["canonical runner does not consume stale targetControlDecisions",!/readContinuationControl\(/.test(runner)],
["canonical target case reuse is bound to current atlas job",/state\.atlasJobId === atlasJobId/.test(runner)],
["canonical target runner fails closed before acts when case is not active",/const caseRow = await ensureTargetCase\([\s\S]{0,500}?\);[\s\S]{0,220}caseRow\.status !== "active"/.test(runner)],
["canonical runner passes exact case identity into Investigator",/caseId: caseRow\.id/.test(runner)],
["canonical target context is rebuilt from durable Investigator observations",/loadDurableTargetTrajectory\(caseRow\.id\)/.test(runner)&&/buildInvestigatorContext\(\{ targetName: target\.name/.test(runner)],
["canonical target control iteration is durably monotonic",/iteration: caseRow\.iteration \+ completedActs/.test(runner)],
["canonical runner blocks on stop",/if \(lastOversight\.action === "stop"\) break/.test(runner)],
["canonical runner fails closed when oversight is unavailable",/!lastOversight \|\| lastOversight\.status !== "completed"/.test(runner)],
["redirect becomes a research objective, not a tool command",/Investigator research objective/.test(runner)],
["canonical runner establishes one global target deadline",/const deadline = Date\.now\(\) \+ hardTimeoutMs/.test(runner)],
["canonical runner refuses to start a sub-30-second act",/remainingMs < 30_000/.test(runner)],
["canonical target finalization is fenced to an active case",/\.where\(and\(eq\(researchCasesTable\.id, caseRow\.id\), eq\(researchCasesTable\.status, \"active\"\)\)\)/.test(runner)],
["canonical agentic target wrapper actively aborts at its deadline",/setTimeout\(\(\) => overallController\.abort\(\), requestedHardTimeout\)/.test(agentic)],
["canonical agentic target wrapper clears its deadline timer",/clearTimeout\(deadlineTimer\)/.test(agentic)],
["canonical target wrapper has a finite action-turn ceiling",!/Number\.POSITIVE_INFINITY/.test(agentic)&&/const MAX_TARGET_ACTION_TURNS = 64/.test(agentic)],
["canonical target wrapper does not auto-fan-out fixed mission briefs",!/runParallelMissionPass\(/.test(agentic)],
["canonical runner owns complete-episode oversight",/oversightMode: "caller"/.test(runner)&&/callerOwnsOversight = input\.oversightMode === "caller"/.test(agentic)],
["target completion requires an Investigator terminal decision",/latestResult\?\.stopReason === "MODEL_DECIDED_DONE"/.test(runner)],
["target completion requires promoted evidence graphs",/\(latestResult\.evidenceGraphs\?\.length \?\? 0\) > 0/.test(runner)],
["target resource ceiling is never reported as complete",/const incomplete = cancelled \|\| resourceLimited \|\| !latestResult/.test(runner)],
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
["observation event is idempotently correlated by case, run and turn",/investigator-act:case:\$\{caseId\}:run:\$\{runId\}:turn:\$\{turn\}/.test(oversight)],
["oversight event is correlated by case, run and turn",/target-oversight:case:\$\{caseId\}:run:\$\{runId\}:turn:\$\{turn\}/.test(oversight)],
["agentic wrapper passes execution identity to oversight",/runId: executionId/.test(agentic)],
["agentic wrapper loads oversight by exact case id",/loadTargetActOversightContext\(input\.caseId/.test(agentic)],
["target oversight has no target-name fallback",!/like\(researchCasesTable\.caseFile/.test(oversight)&&!/orderBy\(desc\(researchCasesTable\.updatedAt\)\)/.test(oversight)],
["evidence graph observations can carry immutable event IDs",/eventId\?\s*:\s*number\s*\|\s*null/.test(evidence)],
["canonical act graphs require immutable observation anchors",/validateClaimSupportGraph\(graph,true\)/.test(oversight)],
["Right Hand is mandatory before Boss continuation",/if\(rightHand\.status!=="completed"\)/.test(oversight)],
["target per-act Right-hand contract is exact-field validated",/validateRightHandAdvice\(rightParsed\)/.test(oversight)&&/validateExactFields\(value,\["decision","reason","focusLanes","confidence"\]\)/.test(oversight)],
["target per-act Boss contract is exact-field validated",/validateBossOversight\(parsed\)/.test(oversight)&&/validateExactFields\(value,\["action","direction","reason","confidence"\]\)/.test(oversight)],
["completed-act observation compaction preserves its tail",/function compactOversightText/.test(oversight)&&/ACT OBSERVATION MIDDLE OMITTED/.test(oversight)],
["completed-act observed URLs retain recent entries",/observedUrls: headTail\(record\.observedUrls, 6\)/.test(oversight)],
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
checks.push(["structured intelligence only receives grounded Investigator findings",/groundedFindingsForTrajectory/.test(agentic)&&/recordResult\(intelligence, normalizedRecord, records\)/.test(agentic)]);
checks.push(["durable target trajectory replay excludes search findings",/const rawFindings = Array\.isArray\(payload\.findings\) && !\["web_search", "parallel_web_search"\]\.includes\(action\)/.test(runner)],);
checks.push(["canonical target unexpected failures close the durable case",/catch \(error\)/.test(runner)&&/investigator-execution-failed/.test(runner)&&/status: "review"/.test(runner)]);
checks.push(["child target runner does not terminalize parent Atlas job",/manageJobLifecycle\?: boolean/.test(runner)&&/const manageJobLifecycle = options\.manageJobLifecycle !== false/.test(runner)&&/if \(manageJobLifecycle\) await updateJob/.test(runner)&&/manageJobLifecycle: false/.test(atlas)]);
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);
