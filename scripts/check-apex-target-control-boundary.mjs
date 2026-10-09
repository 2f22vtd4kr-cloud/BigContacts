import fs from "node:fs";
const runner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts", "utf8");
const oversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");
const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const targetAgent = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const strictPromotion = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts", "utf8");
const targetControlDecision = fs.readFileSync("artifacts/api-server/src/src/lib/target-control-decision.ts", "utf8");
const mutationGuard = fs.readFileSync("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts", "utf8");
const checks = [
  ["durable target control requires live canonical lease before and during persistence", (targetControlDecision.match(/await isCanonicalJobOwner\("atlas-run", input\.jobId\)/g) ?? []).length >= 3 && /ownershipFile\.atlasJobId \?\? ownershipFile\.jobId/.test(targetControlDecision)],

  ["canonical runner does not consume stale targetControlDecisions", !/readContinuationControl\(/.test(runner)],
  ["canonical target case lookup is explicitly target-scoped", /eq\(researchCasesTable\.caseType,\s*["']target["']\)/.test(runner)],
  ["canonical target case reuse is bound to atlasJobId", /state\.atlasJobId === atlasJobId/.test(runner)],
  ["canonical runner can explicitly continue an existing target case", /existingCaseId\?:\s*number/.test(runner) && /ensureTargetCase\([^)]*options\.existingCaseId/.test(runner)],
  ["continuation route passes the explicit case into the canonical runner", /existingCaseId:\s*caseId/.test(continuation)],
  ["continuation direction is passed as an objective, not durable stale control", /initialDirection:\s*direction/.test(continuation) && /options\.initialDirection/.test(runner)],
  ["canonical runner passes caseId into target Investigator", /runTargetContactAgent\(\{[^}]*caseId:\s*caseRow\.id/.test(runner)],
  ["canonical runner consumes only current run and control turn oversight", /readOversight\(caseState,\s*latestResult\.executionId\s*\?\?\s*null,\s*actNumber\)/.test(runner) && /value\.runId === runId && Number\(value\.controlTurn\) === controlTurn/.test(runner)],
  ["target oversight loads by exact case id", /eq\(researchCasesTable\.id\s*,\s*caseId\).*eq\(researchCasesTable\.caseType,\s*["']target["']\)/s.test(oversight)],
  ["target oversight has no target-name fallback query", !/orderBy\(desc\(researchCasesTable\.updatedAt\)\)/.test(oversight) && !/like\(researchCasesTable\.caseFile/.test(oversight)],
  ["agentic wrapper requires case identity for target mode", /input\.caseId\s*\?\s*await loadTargetActOversightContext\(input\.caseId/.test(wrapper)],
  ["agentic wrapper creates and returns one durable execution id", /const executionId =/.test(wrapper) && /executionId \}/.test(wrapper)],
  ["agentic wrapper carries the execution id into oversight", /runId:\s*executionId/.test(wrapper)],
  ["target Investigator receives canonical case identity", /caseId:\s*input\.caseId/.test(targetAgent)],
  ["target Investigator uses the same execution id for promotion provenance", /const runId = input\.caseId \? \(agentic\.executionId \?\? null\)/.test(targetAgent)],
  ["target promotion preserves same-case run provenance through deferred post-oversight persistence", /const provenance: InvestigatorPromotionProvenance \\| undefined/.test(targetAgent) && /persistSourceBackedBureauContactsForEntity\\([^;]*provenance[^;]*\\)/s.test(targetAgent) && targetAgent.includes("promotionProvenance: provenance") && runner.includes("latestResult.promotionProvenance") && runner.indexOf("await persistSourceBackedBureauContactsForEntity(", runner.indexOf("lastOversight = await reviewTargetInvestigationAct({")) > runner.indexOf("lastOversight = await reviewTargetInvestigationAct({"))],
  ["strict promotion requires exact event payload run identity", /String\(payload\.runId\?\?\s*""\)\.trim\(\)!==provenance\.runId/.test(strictPromotion)],
  ["strict promotion binds candidate identity and exact contact to observed source material", strictPromotion.includes("supportsContactClaimAcrossObservations(observedClaimMaterials,item,cleanValue,vectorType)") && /hasExactObservedToken\((?:observationText|observation\.observationText),\s*personName\)/.test(strictPromotion) && strictPromotion.includes("identityAndValueBoundTogether") && strictPromotion.includes("return identityObserved && valueObserved && identityAndValueBoundTogether") && strictPromotion.includes("[...cited].every") && /validObservationIds\.length/.test(strictPromotion)],
  ["strict promotion records immutable claim and observation event IDs", /claimEventId\s*:\s*support\.claimEventId/.test(strictPromotion) && /observationEventIds\s*:\s*support\.observationEventIds/.test(strictPromotion)],
  ["PersonCandidate contact promotion revalidates eligibility at both read and locked-write boundaries", strictPromotion.includes("!isContactPromotionEligibleEntityType(entity.type)") && strictPromotion.includes("!isContactPromotionEligibleEntityType(lockedEntity.type)")],
  ["contact card writes require target-case ownership inside the transaction", strictPromotion.includes('eq(researchCasesTable.caseType,"target")') && strictPromotion.includes("eq(researchCasesTable.id,provenance.caseId)")],
  ["candidate identity and contact value must co-occur on one claim-grade observation", strictPromotion.includes("identityAndValueBoundTogether") && strictPromotion.includes("return identityObserved && valueObserved && identityAndValueBoundTogether") && strictPromotion.includes("hasBoundIdentityAndValue(observation.observationText,personName,cleanValue,vectorType)")],
  ["target Investigator no longer writes contact card fields directly", !/db\.update\(entitiesTable\)\.set\(\{\s*contactOutcome:\s*outcome/.test(targetAgent)],
  ["generic Apex entity creation contact fields are blocked", /if\s*\(req\.path\s*===\s*"\/entities"\)[\s\S]*?APEX_TYPES\.has\(type\)[\s\S]*?touchesApexContactFields\(body\)/.test(mutationGuard)],
  ["manual Apex batch contact fields are blocked", /if\s*\(req\.path\s*===\s*"\/entities\/import\/batch"\)[\s\S]*?draftTouchesApexContactFields/.test(mutationGuard)],
  ["target continuation validates the exact Right-hand review contract before Boss control", targetControlDecision.includes("normalizeTargetRightHandAdvice(") && targetControlDecision.includes("validateAtlasOpeningRightHandReview(parsed)") && targetControlDecision.includes('if (rightHand.status !== "completed")')],
  ["per-act oversight uses the shared bounded Right-hand contract and range-valid Boss confidence", oversight.includes("validateAtlasOpeningRightHandReview(value)") && oversight.includes("isAtlasConfidenceScore(value!.confidence)") && targetControlDecision.includes("normalizeTargetBossDecision(generated.raw)") && targetControlDecision.includes("isAtlasConfidenceScore(parsed.confidence)")],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
