import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchAtlasAdmittedTarget, validateAtlasBossControl } from "../lib/atlas-control-decision";
import { buildTargetContactInvestigatorObjective } from "../lib/target-contact-agent";
const reconciler = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../routes/research/canonical-atlas-launch.ts", import.meta.url), "utf8");
const dashboardRoute = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");
const agenticCore = readFileSync(new URL("../lib/agentic-web-research-core.ts", import.meta.url), "utf8");
const bureauPass = readFileSync(new URL("../lib/bureau-agentic-pass.ts", import.meta.url), "utf8");
const orientation = readFileSync(new URL("../lib/apex-bureau-orientation.ts", import.meta.url), "utf8");
const runtimeProofWorkflow = readFileSync(new URL("../../../../../.github/workflows/apex-canonical-runtime-proof.yml", import.meta.url), "utf8");
const runtimeProofVerifier = readFileSync(new URL("../../../../../scripts/verify-canonical-card-proof.mjs", import.meta.url), "utf8");
const canonicalAtlas = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
const launchDefaults = readFileSync(new URL("../lib/atlas-launch-defaults.ts", import.meta.url), "utf8");
const candidateSourcePolicy = readFileSync(new URL("../lib/candidate-source-url-union.ts", import.meta.url), "utf8");
const checkpointSource = canonicalAtlas.slice(canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"), canonicalAtlas.indexOf("export async function reconcileCanonicalDiscoveryCaseReviewCards"));
describe("terminal review-card reconciliation", () => {
  it("requires Investigator-authored events for partial and terminal review-card provenance", () => {
    expect(reconciler.match(/isInvestigatorAuthoredResearchEvent\(event\.actorRole\)/g) ?? []).toHaveLength(2);
    expect(canonicalAtlas.match(/isInvestigatorAuthoredResearchEvent\(event\.actorRole\)/g) ?? []).toHaveLength(3);
    expect(reconciler).toContain("actorRole: researchCaseEventsTable.actorRole");
    expect(canonicalAtlas).toContain("actorRole: researchCaseEventsTable.actorRole");
  });
  it("chooses source classes by expected information gain and jurisdiction, not a registry-first habit", () => {
    expect(orientation).toContain("SOURCE SELECTION & JURISDICTION");
    expect(orientation).toContain("public-web search, registries and other attested capabilities are neutral options, not a fixed sequence");
    expect(orientation).toContain("Preserve explicit human geographic constraints");
    expect(orientation).toContain("UK Companies House is UK-only, not Ireland");
    expect(orientation).toContain("public-web search, registries and other attested capabilities are neutral options");
    expect(orientation).toContain("You decide which observed people and organizations are worth preserving as provisional review leads in the same-run trajectory/control context");
    expect(orientation).toContain("Rankings, valuation, prestige, size and growth are contextual signals, not automatic qualifications or exclusions");
    expect(orientation).toContain("A ranking or search result alone is a lead, not a verified claim");
    expect(orientation).toMatch(/do not prefer private or mid-market status unless the human objective asks for it/i);
    expect(orientation).toContain("Assess operating status, decision-makers, capital capacity, mandate fit, ownership and routes only where those facts matter to the mission");
    expect(orientation).toContain("No private/mid-market preference or company blacklist unless the human explicitly specifies it");
  });

  it("keeps registry rows as supporting observations and never lets adapters select cards", () => {
    expect(agenticCore).toContain("export function compactRegistryCompanyLeads");
    expect(agenticCore).toContain('row.type !== "Corporation"');
    expect(agenticCore).toContain("companyLeads: error ? [] : companyLeads");
    expect(agenticCore).not.toContain("extractSearchResultCompanyLeadFindings");
    expect(agenticCore).not.toContain("SEARCH_RESULT_BUSINESS_MARKER");

    const registryCompactorStart = agenticCore.indexOf("export function compactRegistryCompanyLeads");
    const registryCompactorEnd = agenticCore.indexOf("\n}", registryCompactorStart) + 2;
    const registryCompactor = agenticCore.slice(registryCompactorStart, registryCompactorEnd);
    expect(registryCompactor).not.toContain("isClaimGradeDiscoverySourceUrl");
    expect(registryCompactor).not.toContain(".slice(0, 8)");

    expect(reconciler).toContain("const outcomes = Array.isArray(args.registrySearchOutcomes) ? args.registrySearchOutcomes : []");
    expect(reconciler).toContain('const partialRegistry = registryAction && payload.execution === "partial"');
    expect(reconciler).toContain("Page metadata may strengthen the provenance of a model-selected organization lead");
    expect(reconciler).not.toContain("extractSearchResultCompanyLeadFindings");
    expect(reconciler).not.toContain("organizationLabelFromUrl(url)");

    const organizationStart = canonicalAtlas.indexOf("async function materializeVerifiedReviewOnlyLeadCards");
    const organizationEnd = canonicalAtlas.indexOf("\nasync function materializeAtlasAdmissions", organizationStart + 1);
    const organizationMaterializer = canonicalAtlas.slice(organizationStart, organizationEnd);
    expect(organizationMaterializer).toContain("finding.reviewOnly === true");
    expect(organizationMaterializer).toContain('finding.promotionDecision !== "reject"');
    expect(organizationMaterializer).toContain("Boolean(finding.exactQuote?.trim())");
    expect(organizationMaterializer).toContain('payload.jobId !== input.atlasJobId || payload.runId !== input.discoveryRunId || payload.execution !== "success"');
    expect(organizationMaterializer).toContain("const urlField = isFetch ? payload.observedUrls : payload.leadUrls;");
    expect(organizationMaterializer).toContain("if (!observation.includes(quote)) continue;");
    expect(organizationMaterializer).toContain("promotionEligible: false");
    expect(organizationMaterializer).toContain("targetEligibleForResearch: false");
    expect(organizationMaterializer).not.toContain("isRestrictedCommunitySourceUrl");
    expect(organizationMaterializer).not.toContain("isGenericDiscoveryMetadataTitle");

    const registryReconciliationBlock = reconciler.slice(
      reconciler.indexOf("if (registryAction &&"),
      reconciler.indexOf("const search = /search/i.test(action);"),
    );
    expect(registryReconciliationBlock).not.toContain("findings.set(identity, entry)");
    expect(checkpointSource).not.toContain("if (input.findings.length === 0) return empty;");
  });
  it("appends an initial standalone discovery assignment after the durable event high-water mark", () => {
    const ensureStart = bureauPass.indexOf("async function ensureDiscoveryCaseContext");
    const ensureEnd = bureauPass.indexOf("async function persistDiscoveryTrajectory", ensureStart);
    const ensureSource = bureauPass.slice(ensureStart, ensureEnd);

    expect(ensureSource).toContain("await lockResearchCaseEventAppendStream(tx, caseId)");
    expect(ensureSource).toContain("nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration)");
    expect(ensureSource).toContain("iteration: assignmentIteration");
    expect(ensureSource).toContain("await tx.update(researchCasesTable).set({ iteration: assignmentIteration");
    expect(ensureSource).not.toContain('iteration: 0,\\n    actorRole: "head_investigator"');

    // Canonical Atlas supplies the caseId, so this assignment event is the
    // actual live-run path; the helper above covers only the standalone path.
    const atlasAssignmentAnchor = canonicalAtlas.indexOf("Canonical Atlas discovery case was cancelled before Investigator assignment event.");
    const atlasAssignmentEnd = canonicalAtlas.indexOf("const openingDiscoveryBudget", atlasAssignmentAnchor);
    const atlasAssignmentBlock = canonicalAtlas.slice(Math.max(0, atlasAssignmentAnchor - 1_200), atlasAssignmentEnd);
    expect(atlasAssignmentBlock).toContain("await lockResearchCaseEventAppendStream(tx, discoveryCaseId)");
    expect(atlasAssignmentBlock).toContain("nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration)");
    expect(atlasAssignmentBlock).toContain("iteration: nextIteration");
    expect(atlasAssignmentBlock).toContain(".set({ iteration: nextIteration");

    const rejectedCandidateStart = canonicalAtlas.indexOf('rejectedControlDecision = { controlTurn: controlTurns, reason: rejectionReason, kind: "candidate_selection" }');
    const rejectedCandidateEnd = canonicalAtlas.indexOf("continue;", rejectedCandidateStart);
    const rejectedCandidateBlock = canonicalAtlas.slice(rejectedCandidateStart, rejectedCandidateEnd);
    expect(rejectedCandidateBlock).toContain("nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration)");
    expect(rejectedCandidateBlock).toContain("iteration: nextIteration");
    const rejectedPivotStart = canonicalAtlas.indexOf('rejectedControlDecision = { controlTurn: controlTurns, reason: rejectionReason, kind: "pivot_direction" }');
    const rejectedPivotEnd = canonicalAtlas.indexOf("continue;", rejectedPivotStart);
    const rejectedPivotBlock = canonicalAtlas.slice(rejectedPivotStart, rejectedPivotEnd);
    expect(rejectedPivotBlock).toContain("nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration)");
  });

  it("requires a real company or person card even if a later control turn fails", () => {
    expect(runtimeProofWorkflow).toContain('"failed"');
    expect(runtimeProofVerifier).toContain('lead.stage === "partial_review"');
    expect(runtimeProofVerifier).toContain('"Corporation"');
    expect(runtimeProofVerifier).toContain('acceptedAfterControlFailure');
    expect(runtimeProofVerifier).toContain('typeof input?.caseData?.caseFile !== "string"');
    expect(runtimeProofVerifier).toContain('Canonical case read-back does not match the exact discovery case ID.');
    expect(runtimeProofWorkflow).toContain('/api/dashboard/research-leads');
    expect(runtimeProofWorkflow).toContain('/api/entities');
  });

  it("preserves a real company lead from one successful web search before later control failure", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    // Action-level checkpointing persists a model-selected review-only card
    // only when its exact URL and exact quote belong to the same successful
    // same-run observation. The card is never target admission.
    const start = canonical.indexOf("async function materializeVerifiedReviewOnlyLeadCards");
    const end = canonical.indexOf("\nasync function materializeAtlasAdmissions", start + 1);
    const materializer = canonical.slice(start, end);
    expect(materializer).toContain('finding.reviewOnly === true');
    expect(materializer).toContain('payload.jobId !== input.atlasJobId || payload.runId !== input.discoveryRunId || payload.execution !== "success"');
    expect(materializer).toContain("const urlField = isFetch ? payload.observedUrls : payload.leadUrls;");
    expect(materializer).toContain("if (!observation.includes(quote)) continue;");
    expect(materializer).toContain("provisionalReviewLead: true");
    expect(materializer).toContain("promotionEligible: false");
    expect(materializer).toContain("targetEligibleForResearch: false");
    expect(canonical).toContain("const controlFindings = [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])]");
    expect(canonical).toContain("reviewOnly: finding.reviewOnly");
    expect(orientation).toContain("REVIEW LEADS: Investigator may retain useful same-case people and organizations as provisional review-only leads.");
    expect(orientation).toContain("A search result/snippet may support an unverified in-memory review lead before the underlying page is fetched");
    expect(orientation).toContain("exact observed names, candidate/organization scope, source URL, rationale and uncertainty.");
    expect(orientation).toContain("Search-only is unverified; selection is not promotion.");
    expect(orientation).toContain("SOURCE SELECTION & JURISDICTION: public-web search, registries and other attested capabilities are neutral options");
    expect(orientation).toContain("no fixed sequence");
    expect(agenticCore).not.toContain("Companies House is UK-only");
    expect(agenticCore).not.toContain("Use parallel web searches and, where corporate records are relevant, 2–4 registry queries");
    expect(canonical).toContain("A successful public search observation contains the exact organization name");
  });

  it("keeps person review leads in AI control context until strict evidence admission", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    const materialization = canonical.slice(
      canonical.indexOf("async function materializeAtlasAdmissions"),
      canonical.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    expect(canonical).not.toContain("async function materializePartialPersonLeadCards");
    expect(materialization).not.toContain("materializePartialPersonLeadCards");
    expect(materialization).toContain('finding.reviewOnly !== true');
    expect(materialization).toContain("candidateRoleCorroborationSources");
    expect(materialization).toContain("durableEvidence");
    expect(canonical).toContain("const controlFindings = [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])]");
    expect(canonical).toContain("reviewOnly: finding.reviewOnly");
    expect(canonical).toContain("discoveryFindings: controlFindings.map");
  });

  it("keeps public business-relevant relationship research separate from private intimate or health-data contact hunting", () => {
    expect(orientation).toContain("Publicly documented family/business links may be recorded");
    expect(orientation).toContain("do not infer intimate relationships from surnames or clues");
    expect(orientation).toContain("Never use medical/clinic records, private intimate details");
    expect(orientation).toContain("private personal numbers from those contexts");
    expect(orientation).toContain("Never infer intimate relationships or use health/clinic records or private spa/casino customer-service data as personal contact routes; public business records remain eligible.");
  });

  it("persists only Investigator-selected organization findings and keeps provenance tier honest", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    expect(reconciler).toContain('finding.scope !== "organization"');
    expect(reconciler).toContain('payload.execution === "success"');
    expect(reconciler).toContain("bindExactSourceSpan(observation.text, lead.name)");
    expect(reconciler).toContain('const verificationLevel = hasFetched ? "fetched_source" : "search_result_lead"');
    expect(reconciler).toContain('status: "review"');
    expect(reconciler).toContain("unverified lead, not fetched-page evidence");
    expect(reconciler).toContain("reconcilePersonReviewCardsForJob");
    expect(reconciler).toContain('finding.scope !== "candidate"');
    expect(reconciler).toContain('claimType: "partial_person_role_lead"');
    expect(reconciler).toContain('const fetched = action === "visit" || action === "browser_fetch";');
    expect(reconciler).toContain('verificationLevel: fetched && isClaimGradeDiscoverySourceUrl(url) ? "fetched_source" : "search_result_lead"');
    expect(reconciler).not.toContain('if (!url || (fetched && !isClaimGradeDiscoverySourceUrl(url))) continue;');
    expect(reconciler).not.toContain('if (!span?.exact) continue;');
    expect(reconciler).toContain('payload.execution !== "success" && payload.execution !== "partial"');
    expect(reconciler).toContain('const sourceBearingExecution = successful || payload.execution === "partial"');
    expect(reconciler).not.toContain("if (existing.length && !sameCase) return { card: false");
    expect(reconciler).toContain("if (sameCaseExisting && !sameCase) return { card: true");
    expect(reconciler).toContain('if (isFetched && priorEvidenceMetadata.verificationLevel !== "fetched_source")');
    expect(reconciler).toContain('evidenceTier: isFetched ? "fetched_public_source" : "unverified_search_result"');
    expect(reconciler).toContain("changed = changed || persisted.updated");
    expect(dashboardRoute).toContain('verificationLevel: typeof metadata.verificationLevel === "string" ? metadata.verificationLevel : "unknown"');
  });
  it("can reconcile durable review leads after a terminal job releases its live lease", () => {
    expect(reconciler).toContain("async function hasReviewReconciliationAuthority(jobId: string)");
    expect(reconciler).toContain('import { getJobStrict } from "./job-queue";');
    expect(reconciler).toContain('job?.type === "atlas-run" && job.cancelRequested !== true && (job.status === "done" || job.status === "failed")');
    expect(reconciler.match(/hasReviewReconciliationAuthority\(jobId\)/g)?.length).toBe(2);
    // The narrow terminal fallback cannot cross the exact durable case binding
    // or the existing cancellation/lease-loss fence.
    expect(reconciler).toContain("parseObject(ownedCase.caseFile)?.jobId !== jobId");
    expect(reconciler).toContain('"canonical-atlas-cancelled", "canonical-lease-lost"');
  });

  it("runs as idempotent reconciliation when an Atlas job reaches a terminal status", () => {
    expect(launchRoute).toContain("reconcileOrganizationReviewCardsForJob(atlasJobId)");
    expect(launchRoute).toContain("reconcilePersonReviewCardsForJob(atlasJobId)");
    expect(launchRoute).toContain("await releaseCanonicalJob(\"atlas-run\", atlasJobId)");
  });
});


describe("canonical Atlas organization target selection", () => {
  it("matches an admitted target by both name and target type", () => {
    const targets = [
      { name: "Northstar", role: "Director", sourceUrls: ["https://example.org/person"], targetType: "person" as const },
      { name: "Northstar", role: null, sourceUrls: ["https://example.org/company"], targetType: "organization" as const },
    ];
    expect(matchAtlasAdmittedTarget(targets, "Northstar", "organization")).toEqual(targets[1]);
    expect(matchAtlasAdmittedTarget(targets, "Northstar", "person")).toEqual(targets[0]);
    expect(matchAtlasAdmittedTarget(targets, "Unadmitted GmbH", "organization")).toBeNull();
    expect(matchAtlasAdmittedTarget(targets, "Northstar", null)).toBeNull();
  });

  it("requires target type for Boss target actions and forbids it for non-target actions", () => {
    expect(validateAtlasBossControl({ action: "research_candidate", candidateName: "Acme GmbH", candidateType: "organization", direction: null, reason: "Source-backed company lead is worth investigating.", confidence: 0.8 })).toBe(true);
    expect(validateAtlasBossControl({ action: "research_candidate", candidateName: "Acme GmbH", candidateType: null, direction: null, reason: "Source-backed company lead is worth investigating.", confidence: 0.8 })).toBe(false);
    expect(validateAtlasBossControl({ action: "stop", candidateName: null, candidateType: "organization", direction: null, reason: "Evidence is sufficient.", confidence: 0.8 })).toBe(false);
    expect(validateAtlasBossControl({ action: "stop", candidateName: null, candidateType: null, direction: null, reason: "Evidence is sufficient.", confidence: 0.8 })).toBe(true);
  });

  it("gives a Corporation an organization-focused research objective", () => {
    const objective = buildTargetContactInvestigatorObjective({ targetName: "Acme GmbH", targetType: "organization", reachabilityControl: "" });
    expect(objective).toContain("Investigate the organization itself");
    expect(objective).toContain("owners/beneficial owners, controllers, directors/officers");
    expect(objective).not.toContain("Investigate the person, not generic company contacts");
  });

  it("connects only persisted same-case Corporation review leads to the organization target kind", () => {
    expect(canonicalAtlas).toContain("const organizationTargets = partialOrganizations.candidates");
    expect(canonicalAtlas).toContain('.filter(({ targetEligibleForResearch }) => targetEligibleForResearch)');
    expect(canonicalAtlas).toContain('const explicitlyPromotedByInvestigator = input.findings.some');
    expect(canonicalAtlas).toContain('finding.promotionDecision === "promote"');
    expect(canonicalAtlas).toContain('finding.promotionDecision === "reject"');
    expect(canonicalAtlas).toContain('finding.promotionDecision !== "reject"');
    expect(canonicalAtlas).toContain("payload.runId !== input.discoveryRunId");
    expect(canonicalAtlas).toContain("support.spanVerified || support.sourceUrlBoundByAdapter === true");
    expect(canonicalAtlas).toContain('targetType: "organization" as const');
    expect(canonicalAtlas).toContain("metadata.partialOrganizationLead === true");
    expect(canonicalAtlas).toContain("inArray(entitiesTable.type, eligibleEntityTypes)");
  });

  it("keeps a model-owned investor objective and company-to-owner research bridge", () => {
    expect(launchDefaults).toContain("Find lesser-known or unknown wealthy people who are realistically contactable");
    expect(launchDefaults).toContain("The Investigator owns relevance, hypotheses, target selection, research direction");
    expect(launchDefaults).toContain("Operator caps are resource limits, not relevance or admission rules.");
    expect(launchDefaults).toContain("discoveryObjective: DEFAULT_ATLAS_DISCOVERY_OBJECTIVE");
    expect(canonicalAtlas).toContain("DEFAULT_ATLAS_DISCOVERY_OBJECTIVE");
    expect(canonicalAtlas).toContain("opts.discoveryObjective?.trim() || DEFAULT_ATLAS_DISCOVERY_OBJECTIVE");
    expect(canonicalAtlas).not.toContain("People—not companies or executive prestige—are the target; companies are leads.");
  });

  it("preserves typed target identity and evidence URLs when discovery continues", () => {
    expect(canonicalAtlas).toContain("function mergeDurablyAdmittedAtlasTargetSources");
    expect(canonicalAtlas).toContain('const key = `${targetType}:${identity}`;');
    expect(canonicalAtlas).toMatch(/candidate\.sourceUrls\s*\.map\(normalizeSourceUrl\)/);

    expect(canonicalAtlas.match(/mergeDurablyAdmittedAtlasTargetSources\(\[admittedCandidateSources, admission\.candidates\]\)/g)).toHaveLength(2);
    expect(canonicalAtlas).not.toContain("admittedCandidateSources = mergeDurablyAdmittedCandidateSources");
  });

  it("keeps worthwhile search-result leads ephemeral and preserves verification before promotion", () => {
    expect(canonicalAtlas).not.toContain("async function materializePartialPersonLeadCards");
    const reconcilerSource = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
    const organizationStart = reconcilerSource.indexOf("export async function reconcileOrganizationReviewCardsForJob");
    const organizationEnd = reconcilerSource.indexOf("export async function reconcilePersonReviewCardsForJob", organizationStart + 1);
    const organizationMaterializer = reconcilerSource.slice(organizationStart, organizationEnd);
    const admission = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializeAtlasAdmissions"),
      canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    const control = readFileSync(new URL("../lib/atlas-control-decision.ts", import.meta.url), "utf8");

    // Search-result leads remain in-memory review context. Only the existing
    // explicit target-selection and evidence gates may authorize card admission.
    // This preserves model-owned discovery without persisting snippet-only cards.

    expect(organizationMaterializer).toContain('finding.scope !== "organization" || finding.reviewOnly === true || finding.promotionDecision !== "promote"');
    expect(organizationMaterializer).toContain('fetched && isClaimGradeDiscoverySourceUrl(url) ? "fetched_source" : "search_result_lead"');
    expect(organizationMaterializer).toContain('const sourceBearingExecution = successful || payload.execution === "partial"');
    expect(organizationMaterializer).toContain("identityCollisionPossible");
    expect(organizationMaterializer).toContain("isContactLikeOrganizationReviewValue(name)");
    expect(organizationMaterializer).toContain("Never merge on name alone");
    expect(reconcilerSource).toContain('if (!url) continue;');
    expect(reconcilerSource).toContain('fetched && isClaimGradeDiscoverySourceUrl(url) ? "fetched_source" : "search_result_lead"');
    expect(organizationMaterializer).toContain("bindExactSourceSpanToUrl");
    expect(reconcilerSource).toContain("bindExactSourceSpanToUrl");
    expect(reconcilerSource).toContain("isContactLikeOrganizationReviewValue(name)");
    expect(reconcilerSource).toContain("sourceUrlBoundByAdapter: true");
    // Provisional person leads stay in discoveryFindings/trajectory. Only the
    // strict fetched-source admission path can create or target a person card.
    expect(admission).not.toContain("partialPersonTargets");
    expect(admission).toContain("candidateRoleCorroborationSources");
    expect(admission).toContain('finding.reviewOnly !== true');
    expect(admission).toContain('targetType: "person" as const');
    expect(admission).toContain("const targetCandidates = [...personTargets, ...organizationTargets]");
    expect(canonicalAtlas).toContain("const validUrls = candidate.sourceUrls");
    expect(canonicalAtlas).toContain(".filter((url): url is string => url !== null)");
    expect(canonicalAtlas).toContain("isRestrictedCommunitySourceUrl(url)");

    // The Investigator chooses card-worthiness; this never promotes leads or
    // turns snippets into wealth/contact evidence.
    expect(orientation).toContain("DISCOVERY REVIEW-LEAD CAPTURE");
    expect(orientation).toContain("leave promotionDecision unset");
    expect(orientation).toContain("selection is not promotion");
    expect(control).toContain("AVAILABLE REVIEW TARGETS");
    expect(control).toContain("A selection authorizes target-scoped verification only, not identity, ownership, wealth, HNWI or contact promotion.");
    expect(control).toContain("REVIEW-TARGET CONSIDERATION (advisory, not a sequence)");
    expect(control).toContain("REVIEW-TARGET CONSIDERATION (advisory, not a sequence)");
    expect(control).toContain("No target count or route is mandated; Right-hand advises and Investigator chooses.");

    // Runtime does not create partial PersonCandidate cards. It retains the
    // Investigator's lead in findings/trajectory and applies the strict
    // fetched-source, exact role/identity and promotion gates before persistence.
    expect(canonicalAtlas).not.toContain("async function materializePartialPersonLeadCards");
    expect(admission).toContain("candidateRoleCorroborationSources");
    expect(admission).toContain("supportingSources.length < 1");
    expect(admission).toContain("isClaimGradeDiscoverySourceUrl");
    expect(organizationMaterializer).not.toContain('finding.vectorType !== "other"');
    expect(organizationMaterializer).not.toContain("finding.personName?.trim()");
    expect(organizationMaterializer).not.toContain("finding.role?.trim()");
    expect(organizationMaterializer).toContain('!["success", "partial"].includes(observation.execution)');
    expect(organizationMaterializer).not.toContain("name.length < 3");
    expect(candidateSourcePolicy).not.toContain("name.length < 3");
    expect(candidateSourcePolicy).not.toContain("identity.length < 3");
    expect(reconcilerSource).not.toContain("name.length < 3");
    expect(reconcilerSource).not.toContain('typeof finding.role !== "string"');
    expect(organizationMaterializer).not.toContain("if (!span?.exact");
    expect(reconcilerSource).not.toContain('finding.vectorType !== "other"');
    expect(reconcilerSource).not.toContain("if (!span?.exact) continue;");
    expect(control).toContain("input.admittedCandidates.map((candidate)");
    expect(control).not.toContain("input.admittedCandidates.slice(0, 8)");
    expect(control).toContain("COMPLETE AVAILABLE REVIEW TARGETS");
    expect(control).toContain("const rightHandPrompt = buildAtlasRightHandControlPrompt({ investigatorReport, compactState, pinnedControlState: input.pinnedControlState });");
    expect(control).toContain("const prompt = buildAtlasBossControlPrompt({ investigatorReport, compactState, pinnedControlState: input.pinnedControlState, opening: input.opening, humanObjective: input.objective, rightHand });");
    expect(control).toContain("will fail visibly if the complete exact target inventory cannot fit");
    const registryLeadObservationBlock = organizationMaterializer.slice(
      organizationMaterializer.indexOf("if (registry &&"),
      organizationMaterializer.indexOf("// Partial provider execution can still contain successful, attributable"),
    );
    const registryReconciliationBlock = reconcilerSource.slice(
      reconcilerSource.indexOf("if (registryAction &&"),
      reconcilerSource.indexOf("const search = /search/i.test(action);"),
    );
    expect(registryLeadObservationBlock).not.toContain("leadNames.push(name)");
    expect(registryReconciliationBlock).not.toContain("findings.set(identity, entry)");
  });
});


describe("review-only lead persistence boundary", () => {
  it("keeps review-only leads visible to Boss/Right-hand but out of durable candidate/card paths", () => {
    const organizationStart = reconciler.indexOf("export async function reconcileOrganizationReviewCardsForJob");
    const personStart = reconciler.indexOf("export async function reconcilePersonReviewCardsForJob", organizationStart + 1);
    const organization = reconciler.slice(organizationStart, personStart);
    const admission = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializeAtlasAdmissions"),
      canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );

    expect(canonicalAtlas).not.toContain("async function materializePartialPersonLeadCards");
    expect(admission).not.toContain("partialPersonTargets");
    expect(admission).toContain('finding.reviewOnly !== true');
    expect(admission).toContain("candidateRoleCorroborationSources");
    expect(admission).toContain("const targetCandidates = [...personTargets, ...organizationTargets]");
    expect(organization).toContain("finding.reviewOnly === true");
    expect(organization).toContain('finding.promotionDecision !== "promote"');
    expect(organization).toContain("support.verificationLevel === \"fetched_source\"");
    expect(organization).toContain("reviewOnly: true, partialOrganizationLead: true");
    expect(canonicalAtlas).toContain("const controlFindings = [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])]");
    expect(canonicalAtlas).toContain("reviewOnly: finding.reviewOnly");
  });

  it("prevents terminal reconciliation from recreating cards from review-only or unpromoted findings", () => {
    const organizationStart = reconciler.indexOf("export async function reconcileOrganizationReviewCardsForJob");
    const personStart = reconciler.indexOf("export async function reconcilePersonReviewCardsForJob");
    const organization = reconciler.slice(organizationStart, personStart);
    const person = reconciler.slice(personStart);

    expect(organization).toContain('finding.reviewOnly === true');
    expect(person).toContain('finding.reviewOnly === true');
    expect(organization).toContain('finding.promotionDecision !== "promote"');
    expect(organization).toContain('support.verificationLevel === "fetched_source"');
    expect(organization).toContain('observation.runId !== lead.runId');
    expect(person).toContain('finding.promotionDecision !== "promote"');
    expect(person).toContain('!lead.role');
    expect(person).toContain('support.verificationLevel === "fetched_source"');
    expect(person).toContain('observation.runId !== lead.runId');
  });
});
