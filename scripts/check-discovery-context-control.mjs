import fs from "node:fs";
const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const compactor = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const bureau = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");
const targetAgent = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const atlas = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const persist = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts", "utf8");
const checks = [
["canonical discovery has a global run deadline", /atlasDeadline/.test(atlas) && /APEX_ATLAS_RUN_TIMEOUT_MS/.test(atlas)],
["canonical discovery honors targetLimit as an operational ceiling", /const targetLimit/.test(atlas) && /researched >= targetLimit/.test(atlas)],
["discovery control imports semantic context compaction", /investigation-context-compaction/.test(control) && /compactInvestigationContext|buildInvestigatorContext/.test(control)],
["discovery control compacts the state before model review", /const compactState = compactInvestigationContext\(/.test(control)],
["discovery control supplies structured trajectory records to compaction", /trajectoryRecords: structuredTrajectory/.test(control)],
["discovery control supplies evidence attribution state", /evidenceGraphSummaries:/.test(control) || /discoveryFindings/.test(control)],
["Right Hand must complete before Gemini controls transition", /if \(rightHand\.status !== "completed"\)/.test(control)],
["discovery transition fails closed when Right Hand is unavailable", /Atlas transition is fail-closed/.test(control)],
["discovery control decisions have idempotent case-turn correlation", /atlas-control:case:\$\{input\.caseId\}:turn:\$\{input\.controlTurn\}/.test(control)],
["compactor is character-bounded and configurable", /DEFAULT_MAX_CHARS/.test(compactor) && /MAX_MAX_CHARS/.test(compactor) && /slice\(0, budget\.maxChars\)/.test(compactor)],
["compactor preserves durable trajectory outside the prompt", /Durable trajectory\/evidence is never deleted/.test(compactor) && /durable (?:run\/evidence )?records retain complete observations/i.test(compactor)],
["compactor preserves source URLs in the archived trajectory index", /ARCHIVED TRAJECTORY INDEX/.test(compactor) && /observedUrls/.test(compactor)],
["compactor preserves evidence attribution summaries", /CURRENT FINDINGS \/ LEADS/.test(compactor) && /sourceUrls/.test(compactor)],
["discovery durable projection is explicit", /DURABLE CASE MEMORY PROJECTION/.test(bureau)],
["discovery full trajectory remains in immutable ledger while caseFile projection is bounded", /complete observations remain in research_case_events/.test(bureau) && /records\.slice\(-64\)/.test(bureau)],
["discovery durable projection stores bounded structured Investigator records", /investigatorTrajectoryRecords:durableProjectionRecords/.test(bureau) && /compactDurableDiscoveryRecords/.test(bureau)],
["discovery trajectory is also retained in the immutable event ledger", /eventType=record\.action==="done"\?"decision":"tool_observation"/.test(bureau) && /researchCaseEventsTable/.test(bureau)],
["discovery trajectory events have run-turn correlation", /\$\{input\.runId\}:turn:\$\{record\.turn\}:trajectory/.test(bureau)],
["discovery claims retain immutable observation-event anchors", /observationEventIds/.test(bureau)],
["discovery promotions reference the immutable claim event", /claimEventId:claimInserted\[0\]\?\.id/.test(bureau)],
["agentic persistence requires immutable promotion provenance", /InvestigatorPromotionProvenance/.test(persist) && /resolveImmutablePromotionSupport/.test(persist) && /if\(!support\)continue/.test(persist)],
["agentic card mutation revalidates immutable promotion support", /const support=await resolveImmutablePromotionSupport/.test(persist) && /if\(!support\)return false/.test(persist)],
["agentic pass threads exact case and run provenance into persistence", /persistSourceBackedBureauContactsForEntity\(input\.entityId,[\s\S]*?\{caseId:durableCaseId,runId:agentic\.runId\?\?runId\}\)/.test(bureau)],
["target contact agent passes exact caseId into Investigator", /caseId: input\.caseId/.test(targetAgent)],
["target contact agent binds promotion provenance to the Investigator execution", /const runId = input\.caseId \? \(agentic\.executionId \?\? null\) : null/.test(targetAgent)],
["target contact persistence receives the exact promotion provenance", /const provenance: InvestigatorPromotionProvenance \| undefined = input\.caseId && runId \? \{ caseId: input\.caseId, runId \} : undefined/.test(targetAgent) && /observedSourceUrls, provenance\)/.test(targetAgent)],
["canonical discovery admission is model-explicit and source-backed", /promotionDecision === "promote"/.test(atlas) && /scope === "candidate"/.test(atlas) && /sourceUrls/.test(atlas)],
["canonical discovery materialization remains evidence-only and review-only", /contactOutcome: "evidence_only"/.test(atlas) && /reviewOnly: true/.test(atlas) && /target-scoped Investigator research required before contact promotion/.test(atlas)],
["promotion metadata records immutable claim and observation event IDs", /claimEventId:support\.claimEventId/.test(persist) && /observationEventIds:support\.observationEventIds/.test(persist)],
["durable discovery projection does not recursively copy the prior context document", !/memoryProjection\s*=\s*\{[^}]*contextDocument/s.test(bureau)]
];
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);