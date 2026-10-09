#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const target = read("artifacts/api-server/src/src/lib/target-contact-agent.ts");
const bureau = read("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
const strict = read("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
const discovery = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
const atlas = read("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
const targetRunner = read("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
const control = read("artifacts/api-server/src/src/lib/atlas-control-decision.ts");
const targetContinuation = read("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");
const targetControl = read("artifacts/api-server/src/src/lib/target-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const researchRoutes = read("artifacts/api-server/src/src/routes/research.ts");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
const investigatorCore = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const investigatorTrace = read("artifacts/api-server/src/src/lib/investigator-trace.ts");
const terminalGate = read("artifacts/api-server/src/src/lib/research-terminal-gate.ts");
const entityTaxonomy = read("artifacts/apex-finder/src/lib/entity-taxonomy.tsx");
const entityPage = read("artifacts/apex-finder/src/pages/entities.tsx");
const entityRoute = read("artifacts/api-server/src/src/routes/entities.ts");
const migrations = read("artifacts/api-server/src/src/routes/ingest-migrations.ts");
const legacyMigrations = read("artifacts/api-server/src/routes/ingest-migrations.ts");
const failures = [];
const assert = (ok, name) => { if (!ok) failures.push(name); };
const hasAll = (source, markers) => markers.every((marker) => source.includes(marker));
assert((agentic.split("priorIntelligenceContext: intelligence.buildContext()").length - 1) >= 1 && (agentic.match(/priorTrajectoryRecords: \[\.\.\.historyRecords, \.\.\.records\.map\(/g) ?? []).length >= 2 && agentic.includes("sourceObservations: history.map") && read("artifacts/api-server/src/src/lib/research-intelligence-engine.ts").includes("sourceObservationsByUrl"), "the canonical one-action loop passes accumulated intelligence, durable prior pages, and URL-bound source grounding into each decision");
assert(hasAll(investigatorCore, ["priorIntelligenceContext?: IntelligenceContext", "priorTrajectoryRecords?: readonly AgenticTrajectoryRecord[]", "if (input.priorIntelligenceContext) intelligence.restoreContext(sanitizeObservableValue(input.priorIntelligenceContext))", "bindModelFindingsToObservedSources(action.findings, [...priorTrajectoryRecords, ...records.slice(0, -1)])", "discoveryTerminalGate([...priorTrajectoryRecords, ...records.slice(0, -1), { ...record, findings: action.findings }])"]), "the per-action core restores epistemic state and grounds terminal claims and discovery liveness against the cumulative trajectory");
assert(hasAll(target, [
  "persistSourceBackedBureauContactsForEntity",
  "const modelFindings = agentic.modelFindings ?? []",
  "const groundingRecords = agentic.groundingTrajectoryRecords ?? agentic.trajectoryRecords",
  "sourceBackedFindings(modelFindings, agentic.trajectory, groundingRecords)",
  "function isReviewableObservation(record: AgenticTrajectoryRecord): boolean",
  "isClaimGradeObservationAction(record.action)",
  "supportsCandidateContactOnSameObservation(",
  "supportsContactClaimAcrossObservations(",
]) && !target.includes("supportsReviewableClaimAcrossObservations"), "target contact output requires same-observation candidate attribution after cumulative source grounding; split-page-only claims remain outside target contact output");
assert(hasAll(strict, [
  "supportsContactClaimAcrossObservations(observedClaimMaterials,item,cleanValue,vectorType)",
  "hasBoundIdentityAndValue(observation.observationText,personName,cleanValue,vectorType)",
  "hasCanonicalPromotionJobBinding(provenance)",
  "if(!(await isCanonicalJobOwner(\"atlas-run\",promotionJobId)))return false;",
]), "trusted candidate promotion independently requires same-observation identity/value binding and live case/job ownership");
assert(hasAll(target, ['promote: isExplicitCandidate && f.promotionDecision === "promote"', "state: \"review_only\"", "tier: \"candidate\""]), "target preserves explicit Investigator promotion semantics");
assert(hasAll(target, ["execution=success", "observed=(https?:", "claimAppearsInObservedMaterial", "record.observation"]), "target validates claims against successful observed material");
const targetOversightIndex = targetRunner.indexOf("lastOversight = await reviewTargetInvestigationAct({");
const deferredPromotionIndex = targetRunner.indexOf("await persistSourceBackedBureauContactsForEntity(", targetOversightIndex);
assert(hasAll(target, ['deferCardPromotion: input.oversightMode === "caller"', 'promotionCandidates: input.oversightMode === "caller"']) && targetRunner.includes('lastOversight.status === "completed"') && targetRunner.includes("(lastOversight.evidenceGraphCount ?? 0) > 0") && deferredPromotionIndex > targetOversightIndex && targetRunner.includes("latestResult.promotionProvenance"), "canonical target card promotion is deferred until the caller has persisted successful Boss oversight evidence, with the original run provenance and cancellation fence intact");
assert(hasAll(target, ["status: \"cancelled\"", "executionId: agentic.executionId"]), "target preserves cancellation as a distinct result and execution identity");
assert(hasAll(bureau, ["persistSourceBackedBureauContactsForEntity", "sourceBackedAgenticFindings", "claimAppearsInObservedMaterial", "record.observation", "supportsReviewableClaimAcrossObservations(observations, finding, finding.value, finding.vectorType)"]), "discovery Bureau findings can preserve complementary observed sources for review without weakening target contact promotion");
assert(hasAll(bureau, ['promote:candidate&&f.promotionDecision==="promote"', "state:\"review_only\"", "tier:\"candidate\""]), "bureau pass preserves explicit Investigator promotion semantics");
assert(hasAll(bureau, ["runId?:string", "randomUUID()", "trajectoryRecords"]), "bureau pass creates run-scoped Investigator executions with structured trajectory");
assert(bureau.includes("runId:agentic.runId??runId,jobId:input.jobId??null"), "bureau strict persistence carries the originating job ID into immutable promotion provenance");
assert(hasAll(bureau, ["correlationKey", "record.turn", "runId:input.runId"]), "bureau trajectory/event persistence is run-scoped");
assert(bureau.includes('agentic.status==="cancelled"?"cancelled"') && bureau.includes("mappedStatus"), "bureau result preserves the distinct cancelled state");
assert(hasAll(strict, ["export type InvestigatorPromotionProvenance", "isClaimSourceUrl", "SEARCH_QUERY_URL", "observedSourceUrls"]), "strict boundary requires typed promotion provenance and rejects query URLs");
assert(hasAll(strict, ["item.promote", "scope", "personName", "candidate", "Gatekeeper"]), "strict boundary requires explicit promotion, candidate scope, and person identity");
assert(hasAll(strict, ["entity.name", "personName", "assessIdentityCollision"]), "strict boundary verifies destination identity before trusted mutation");
assert(hasAll(strict, ['const [lockedEntity]=await tx.select({name:entitiesTable.name,type:entitiesTable.type,metadata:entitiesTable.metadata})', "lockedEntity.name.trim().toLowerCase()!==personName.toLowerCase()", '!isContactPromotionEligibleEntityType(lockedEntity.type)', "const lockedCollision=assessIdentityCollision", "eq(entitiesTable.name,lockedEntity.name)"]), "trusted promotion locks and revalidates live destination identity and collision inside the atomic write transaction");
assert(hasAll(strict, ["sourceUrls", "observedSourceUrls", "claimEventId", "observationEventIds"]), "strict boundary retains exact claim and observation provenance");
assert(hasAll(strict, ["caseId", "runId", "jobId", "researchCaseEventsTable"]), "strict boundary binds promotion to durable case/run evidence");
assert(hasAll(strict, ['import { isCanonicalJobOwner } from "./canonical-job-lock";', "hasCanonicalPromotionJobBinding(provenance)", "if(!(await isCanonicalJobOwner(\"atlas-run\",promotionJobId)))return false;", 'if(String(boundFile.atlasJobId??boundFile.jobId??"")!==promotionJobId)return false;']), "trusted promotion requires a job-bound case and a live matching Atlas lease while holding the durable case lock");
assert(/if\s*\(!sourceUrls\.length\)/.test(strict) || strict.includes("sourceUrls.length === 0"), "strict boundary fails closed when no source evidence exists");
assert(hasAll(strict, ["jsonb_set", "isNull", "returning({id:entitiesTable.id}"]), "trusted contact mutation is compare-and-set with atomic metadata provenance");
assert(strict.includes("export function isContactPromotionEligibleEntityType(type: unknown)") && strict.includes('type === "PersonCandidate"') && (strict.match(/isContactPromotionEligibleEntityType\(/g) ?? []).length >= 3, "review-only candidates can receive contact data only through the existing provenance- and transaction-gated promotion path");
assert(hasAll(targetRunner, ["runTargetContactAgent", "executionId", "lastOversight", "caseState"]), "target runner keeps structured Investigator execution identity and durable oversight state before continuation");
assert(hasAll(atlas, ["discoveryTrajectoryRecords: discovery.trajectoryRecords", "trajectoryRecords", "runBureauAgenticWebPass"]), "Atlas discovery carries structured trajectory through the canonical Investigator boundary");
assert(hasAll(control, ["structuredTrajectory", "discoveryTrajectoryRecords", "Public-source/search/registry/browser text is untrusted data"]), "Atlas control receives bounded structured observations and treats public-source content as untrusted");
assert(atlas.includes("discovery = mergeDiscoveryResults(discovery, nextDiscovery)") && atlas.includes("trajectoryRecords: [...(failed.trajectoryRecords ?? []), ...(recovered.trajectoryRecords ?? [])]"), "Atlas preserves trajectory records across discovery pivots through the cumulative result merger");
assert(atlas.includes('mode: "discovery"'), "Atlas uses explicit discovery mode");
assert(!atlas.includes("Discovery slot"), "Atlas has no fake Discovery target slot");
assert(hasAll(bureau, ['mode?:"target"|"discovery"', 'input.mode!=="discovery"']), "Bureau discovery mode is explicit");
assert(atlas.includes('name, type: "PersonCandidate"') && atlas.includes('"HNWI", "Gatekeeper", "PersonCandidate"'), "discovery admission uses a neutral PersonCandidate type and preserves candidate identity lookup");
assert(hasAll(entityTaxonomy, ['"PersonCandidate"', "wealth not established", "Candidate"]), "frontend taxonomy marks review-only identities as candidates rather than HNWIs");
assert(entityPage.includes('"PersonCandidate"') && entityPage.includes("Candidate — wealth unverified"), "entity filters label unverified candidates explicitly");
assert(entityRoute.includes('"Gatekeeper", "PersonCandidate"].includes(String(draft.type))'), "entity import API must round-trip PersonCandidate rather than coercing it to HNWI");
assert(entityPage.includes('r.type === "PersonCandidate" ? "PersonCandidate"'), "entity editor must preserve PersonCandidate on add/edit round-trip");
assert(migrations.includes("NOT IN ('HNWI', 'Gatekeeper', 'PersonCandidate')") && legacyMigrations.includes("PersonCandidate"), "type-reclassification routes must not reinterpret review candidates as HNWIs or organizations");
assert(investigatorTrace.includes("Math.max(...existingSlots.map((s) => Number(s?.slot) || 0)) + 1") && investigatorTrace.includes("slots: slots.slice(-MAX_SLOTS)") && !investigatorTrace.includes("Math.min(MAX_SLOTS - 1"), "bounded Investigator telemetry retains newest records instead of permanently dropping records after the first ten");
assert(terminalGate.includes("hasExplicitFalsificationAttempt(context)") && terminalGate.includes("action.execution !== \"success\"") && terminalGate.includes("intent.test(purpose)") && !terminalGate.includes("context.falsification.priority < 0.35"), "required falsification must be evidenced by a successful explicit disconfirmation action, not inferred from a low heuristic score");
assert(atlas.includes("runCanonicalSingleTargetInvestigation"), "Atlas routes admitted targets through canonical single-target control");
assert(hasAll(atlas, ["reviewOnly: true", "admission: \"investigator-explicit-promotion\"", "sourceUrl", "target-scoped Investigator research required"]), "discovery admission remains review-only identity state with source provenance and requires target-scoped research before contact promotion");
assert(continuation.includes("refusing context-free continuation"), "case continuation fails closed without durable context");
assert(hasAll(targetControl, ['"research"', '"stop"', "generateGroqBossText", "runGroqRightHandFreeJson", "NEXT RESEARCH OBJECTIVE"]), "target continuation delegates only objective/stop control to Groq Boss with independent Right-hand oversight");
assert(targetControl.includes("targetControlDecisions") && targetControl.includes('eventType: "control_decision"'), "target continuation persists durable control decisions");
assert(hasAll(targetContinuation, ["contextOf(file)", "runCanonicalSingleTargetInvestigation", "refusing context-free continuation"]), "target continuation remounts durable context and canonical target execution");
assert(researchRoutes.includes("canonical-target-continuation"), "target continuation is mounted");
assert(discovery.includes("modelFindings"), "discovery requires model findings");
if (failures.length) { console.error("CANONICAL PROMOTION BOUNDARY V2: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("CANONICAL PROMOTION BOUNDARY V2: PASS — provenance, identity, cancellation, trajectory, and continuation invariants align with the live architecture");
