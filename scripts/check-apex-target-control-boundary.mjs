import fs from "node:fs";
const runner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts", "utf8");
const oversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");
const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const targetAgent = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const strictPromotion = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts", "utf8");
const mutationGuard = fs.readFileSync("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts", "utf8");
const checks = [
  ["canonical runner does not consume stale targetControlDecisions", !/readContinuationControl\(/.test(runner)],
  ["canonical target case lookup is explicitly target-scoped", /eq\(researchCasesTable\.caseType,\s*["']target["']\)/.test(runner)],
  ["canonical target case reuse is bound to atlasJobId", /state\.atlasJobId === atlasJobId/.test(runner)],
  ["canonical runner can explicitly continue an existing target case", /existingCaseId\?: number/.test(runner) && /ensureTargetCase\([^)]*options\.existingCaseId/.test(runner)],
  ["continuation route passes the explicit case into the canonical runner", /existingCaseId: caseId/.test(continuation)],
  ["continuation direction is passed as an objective, not durable stale control", /initialDirection: direction/.test(continuation) && /options\.initialDirection/.test(runner)],
  ["canonical runner passes caseId into target Investigator", /runTargetContactAgent\(\{[^}]*caseId: caseRow\.id/.test(runner)],
  ["canonical runner consumes only current run and control turn oversight", /readOversight\(caseState, latestResult\.executionId \?\? null, actNumber\)/.test(runner) && /value\.runId === runId && Number\(value\.controlTurn\) === controlTurn/.test(runner)],
  ["target oversight loads by exact case id", /eq\(researchCasesTable\.id,caseId\).*eq\(researchCasesTable\.caseType,\s*["']target["']\)/.test(oversight)],
  ["target oversight has no target-name fallback query", !/orderBy\(desc\(researchCasesTable\.updatedAt\)\)/.test(oversight) && !/like\(researchCasesTable\.caseFile/.test(oversight)],
  ["agentic wrapper requires case identity for target mode", /input\.caseId \? await loadTargetActOversightContext\(input\.caseId/.test(wrapper)],
  ["agentic wrapper creates and returns one durable execution id", /const executionId =/.test(wrapper) && /executionId \}/.test(wrapper)],
  ["agentic wrapper carries the execution id into oversight", /runId: executionId/.test(wrapper)],
  ["target Investigator receives canonical case identity", /caseId: input\.caseId/.test(targetAgent)],
  ["target Investigator uses the same execution id for promotion provenance", /const runId = input\.caseId \? \(agentic\.executionId \?\? null\)/.test(targetAgent)],
  ["target promotion receives same-case run provenance", /const provenance: InvestigatorPromotionProvenance \| undefined/.test(targetAgent) && /persistSourceBackedBureauContactsForEntity\([^;]*provenance\)/s.test(targetAgent)],
  ["strict promotion requires exact event payload run identity", /String\(payload\.runId\?\?""\)\.trim\(\)!==provenance\.runId/.test(strictPromotion)],
  ["strict promotion binds claims to observed source material", /observationText\.toLowerCase\(\)\.includes\(cleanValue\.toLowerCase\(\)\)/.test(strictPromotion) && /validObservationIds\.length/.test(strictPromotion)],
  ["strict promotion records immutable claim and observation event IDs", /claimEventId:support\.claimEventId/.test(strictPromotion) && /observationEventIds:support\.observationEventIds/.test(strictPromotion)],
  ["target Investigator no longer writes contact card fields directly", !/db\.update\(entitiesTable\)\.set\(\{ contactOutcome: outcome/.test(targetAgent)],
  ["generic Apex entity creation contact fields are blocked", /req\.path === "\/entities"/.test(mutationGuard) && /touchesApexContactFields\(body\)/.test(mutationGuard)],
  ["manual Apex batch contact fields are blocked", /req\.path === "\/entities\/import\/batch"/.test(mutationGuard) && /draftTouchesApexContactFields/.test(mutationGuard)],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
