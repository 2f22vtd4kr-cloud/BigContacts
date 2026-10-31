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
const candidateSourcePolicy = readFileSync(new URL("../lib/candidate-source-url-union.ts", import.meta.url), "utf8");
const checkpointSource = canonicalAtlas.slice(canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"), canonicalAtlas.indexOf("export async function reconcileCanonicalDiscoveryCaseReviewCards"));
describe("terminal review-card reconciliation", () => {
  it("chooses source classes by expected information gain and jurisdiction, not a registry-first habit", () => {
    expect(orientation).toContain("SOURCE SELECTION & JURISDICTION");
    expect(orientation).toContain("There is no fixed provider or registry-first sequence");
    expect(orientation).toContain("Companies House is a UK/Great Britain register");
    expect(orientation).toContain("not a substitute for US state Secretary-of-State filings");
    expect(orientation).toContain("ordinary web search is often the better first move");
    expect(orientation).toContain("You decide which observed people and organizations are worth preserving as provisional review cards");
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

    const organizationStart = canonicalAtlas.indexOf("async function materializePartialOrganizationLeadCards");
    const organizationEnd = canonicalAtlas.indexOf("\nasync function ", organizationStart + 1);
    const organizationMaterializer = canonicalAtlas.slice(
      organizationStart,
      organizationEnd >= 0 ? organizationEnd : undefined,
    );
    expect(organizationMaterializer).toContain("Persist only organization leads explicitly selected in Investigator findings");
    expect(organizationMaterializer).toContain('finding.scope !== "organization"');
    expect(organizationMaterializer).toContain("Registry adapter rows may support this lead only because the");
    expect(organizationMaterializer).not.toContain("isGenericDiscoveryMetadataTitle");
    const registryLeadObservationBlock = organizationMaterializer.slice(
      organizationMaterializer.indexOf("if (registry &&"),
      organizationMaterializer.indexOf("// Partial provider execution can still contain successful, attributable"),
    );
    expect(registryLeadObservationBlock).not.toContain("leadNames.push(name)");

    const registryReconciliationBlock = reconciler.slice(
      reconciler.indexOf("if (registryAction &&"),
      reconciler.indexOf("const search = /search/i.test(action);"),
    );
    expect(registryReconciliationBlock).not.toContain("findings.set(identity, entry)");
    expect(checkpointSource).not.toContain("if (input.findings.length === 0) return empty;");
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
    // Regression: the checkpoint previously read only observedUrls and only
    // accepted fetched pages, so a model-grounded company name in a successful
    // search result could not create a review card before the next control turn.
    expect(canonical).toContain('if (payload.jobId !== input.atlasJobId) return [];');
    expect(canonical).toContain('const searched = action === "web_search" || action === "parallel_web_search"');
    expect(canonical).toContain('searched && Array.isArray(payload.leadUrls) && payload.leadUrls.length');
    expect(canonical).toContain('execution: payload.execution ?? ""');
    expect(canonical).toContain('verificationLevel: fetched ? "fetched_source" as const : "search_result_lead" as const');
    expect(canonical).toContain('verificationLevel === "search_result_lead"');
    expect(canonical).toContain('A successful public search observation contains the exact organization name');
    expect(canonical).toContain('evidenceTier: support.verificationLevel === "fetched_source" ? "fetched_public_source" : "unverified_search_result"');
    expect(canonical).toContain('bindExactSourceSpan(observation.observation, name)');
    expect(agenticCore).toContain('YOU decide whether any observed organization is worth preserving as a provisional review card');
    expect(agenticCore).toContain("Leave promotionDecision unset for a review-only company card");
    expect(agenticCore).toContain('Search snippets are leads, not claim-grade evidence');
    expect(agenticCore).toContain("MIXED DISCOVERY: compare model-selected local/sector web hypotheses with relevant official business, ownership, transaction and public-asset sources; choose by information gain, never a fixed order, and do not repeat one registry after no new hit.");
    expect(agenticCore).toContain("SOURCE-NEUTRAL RESEARCH: compare plausible hypotheses and choose complementary source classes");
    expect(agenticCore).toContain("never default to Companies House or query registries merely because they are available");
    expect(agenticCore).not.toContain("Use parallel web searches and, where corporate records are relevant, 2–4 registry queries");
    expect(agenticCore).toContain('YOU decide whether an observed organization is worth a provisional review-only company card');
  });

  it("materializes model-selected person leads at the first checkpoint even when role is unknown", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    const personMaterializer = canonical.slice(
      canonical.indexOf("async function materializePartialPersonLeadCards"),
      canonical.indexOf("async function materializePartialOrganizationLeadCards"),
    );
    expect(personMaterializer).toContain("payload.leadUrls");
    expect(personMaterializer).toContain('const searched = action === "web_search" || action === "parallel_web_search"');
    expect(personMaterializer).toContain("bindExactSourceSpan(observation.observation, lead.role, lead.name, 320)");
    expect(personMaterializer).toContain("role: string | null");
    expect(personMaterializer).not.toContain("!finding.role?.trim()");
    expect(personMaterializer).toContain('!["success", "partial"].includes(observation.executionStatus)');
    expect(personMaterializer).not.toContain("name.length < 3");
    expect(personMaterializer).not.toContain('finding.vectorType !== "other"');
    expect(personMaterializer).toContain("sourceSpanVerified: support.spanVerified");
    expect(personMaterializer).not.toContain("if (existingRows.length > 0 && !sameCase)");
    expect(personMaterializer).toContain("identityCollisionPossible");
    expect(personMaterializer).toContain("create a separate provisional lead");
    expect(personMaterializer).not.toContain('payload.execution !== "success"');
    expect(personMaterializer).toContain('roleOnlyLead: Boolean(lead.role)');
    expect(personMaterializer).toContain('claimType: "partial_person_role_lead"');
    expect(personMaterializer).toContain('verificationLevel === "search_result_lead"');
    expect(personMaterializer).not.toContain("hasDiscoveryOwnershipLeadSignal");
    // This remains a PersonCandidate review card, never automatic HNWI admission.
    expect(personMaterializer).toContain('type: "PersonCandidate"');
    expect(personMaterializer).toContain('stage: "partial_review"');

    // Review-only candidate/company cards must be persisted before strict
    // promotion/admission work. A later admission exception must not prevent
    // an already observed lead from becoming a durable review card.
    const materialization = canonical.slice(
      canonical.indexOf("async function materializeAtlasAdmissions"),
      canonical.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    const partialPeopleCall = materialization.indexOf("const partialPeople = await materializePartialPersonLeadCards(");
    const partialOrganizationsCall = materialization.indexOf("const partialOrganizations = await materializePartialOrganizationLeadCards(");
    const strictAdmissionLoop = materialization.indexOf("for (const name of candidates)");
    expect(partialPeopleCall).toBeGreaterThanOrEqual(0);
    expect(partialOrganizationsCall).toBeGreaterThanOrEqual(0);
    expect(strictAdmissionLoop).toBeGreaterThanOrEqual(0);
    expect(partialPeopleCall).toBeLessThan(strictAdmissionLoop);
    expect(partialOrganizationsCall).toBeLessThan(strictAdmissionLoop);
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
    expect(canonicalAtlas).toContain("const organizationTargets = partialOrganizations.candidates.map");
    expect(canonicalAtlas).toContain('targetType: "organization" as const');
    expect(canonicalAtlas).toContain("metadata.partialOrganizationLead === true");
    expect(canonicalAtlas).toContain("inArray(entitiesTable.type, eligibleEntityTypes)");
  });

  it("keeps the default discovery objective consistent with organization target selection", () => {
    expect(canonicalAtlas).toContain("Companies are leads and may be selected for target-scoped research");
    expect(canonicalAtlas).toContain("A person is the ultimate investor-identification goal");
    expect(canonicalAtlas).toContain("The Investigator chooses each action; no fixed sequence.");
    expect(canonicalAtlas).not.toContain("People—not companies or executive prestige—are the target; companies are leads.");
  });

  it("preserves typed target identity and evidence URLs when discovery continues", () => {
    expect(canonicalAtlas).toContain("function mergeDurablyAdmittedAtlasTargetSources");
    expect(canonicalAtlas).toContain('const key = `${targetType}:${identity}`;');
    expect(canonicalAtlas).toMatch(/candidate\.sourceUrls\s*\.map\(normalizeSourceUrl\)/);

    expect(canonicalAtlas.match(/mergeDurablyAdmittedAtlasTargetSources\(\[admittedCandidateSources, admission\.candidates\]\)/g)).toHaveLength(2);
    expect(canonicalAtlas).not.toContain("admittedCandidateSources = mergeDurablyAdmittedCandidateSources");
  });

  it("keeps worthwhile search-result person and organization leads as review cards and Boss-selectable research targets", () => {
    const personMaterializer = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializePartialPersonLeadCards"),
      canonicalAtlas.indexOf("async function materializePartialOrganizationLeadCards"),
    );
    const organizationStart = canonicalAtlas.indexOf("async function materializePartialOrganizationLeadCards");
    const organizationEnd = canonicalAtlas.indexOf("\nasync function ", organizationStart + 1);
    const organizationMaterializer = canonicalAtlas.slice(
      organizationStart,
      organizationEnd >= 0 ? organizationEnd : undefined,
    );
    const admission = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializeAtlasAdmissions"),
      canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    const control = readFileSync(new URL("../lib/atlas-control-decision.ts", import.meta.url), "utf8");
    const reconcilerSource = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");

    // Claim-grade classification controls evidence tier, never card creation.

    expect(organizationMaterializer).toContain('&& isClaimGradeDiscoverySourceUrl(sourceUrl)');
    expect(organizationMaterializer).not.toContain('&& !isClaimGradeDiscoverySourceUrl(sourceUrl)');
    expect(organizationMaterializer).not.toContain('payload.execution !== "success"');
    expect(organizationMaterializer).not.toContain("if (existingRows.length > 0 && !sameCase)");
    expect(organizationMaterializer).toContain("identityCollisionPossible");
    expect(organizationMaterializer).toContain("isContactLikeOrganizationReviewValue(name)");
    expect(organizationMaterializer).toContain("does not suppress a separate provisional review card");
    expect(reconcilerSource).toContain('if (!url) continue;');
    expect(reconcilerSource).toContain('fetched && isClaimGradeDiscoverySourceUrl(url) ? "fetched_source" : "search_result_lead"');
    expect(canonicalAtlas).toContain("bindExactSourceSpanToUrl");
    expect(reconcilerSource).toContain("bindExactSourceSpanToUrl");
    expect(reconcilerSource).toContain("isContactLikeOrganizationReviewValue(name)");
    expect(reconcilerSource).toContain("sourceUrlBoundByAdapter: true");
    expect(personMaterializer).toContain('evidenceTier: support.verificationLevel === "fetched_source" ? "fetched_public_source" : "unverified_search_result"');

    // Review-only person cards are supplied to Boss as typed targets without
    // displacing stronger, explicitly admitted person candidates.
    expect(personMaterializer).toContain("candidates: Array<{ name: string; role: string | null; sourceUrls: string[] }>");
    expect(admission).toContain("const partialPersonTargets = partialPeople.candidates");
    expect(admission).toContain('targetType: "person" as const');
    expect(admission).toContain("const targetCandidates = [...personTargets, ...partialPersonTargets, ...organizationTargets]");
    expect(canonicalAtlas).toContain("const validUrls = candidate.sourceUrls");
    expect(canonicalAtlas).toContain(".filter((url): url is string => url !== null);");

    // The Investigator chooses card-worthiness; this never promotes leads or
    // turns snippets into wealth/contact evidence.
    expect(orientation).toContain("DISCOVERY REVIEW-LEAD CAPTURE");
    expect(orientation).toContain("leave promotionDecision unset");
    expect(orientation).toContain("selection is not promotion");
    expect(control).toContain("AVAILABLE REVIEW TARGETS");
    expect(control).toContain("selecting one authorizes target-scoped verification, not promotion");
    expect(control).toContain("EARLY REVIEW-TARGET JUDGMENT");
    expect(control).toContain("Do not accumulate names or wait for a target-count threshold");

    // Runtime integrity checks may grade provenance, but cannot replace the
    // Investigator's card-worthiness decision with regex/span or vector rules.
    expect(personMaterializer).not.toContain('finding.vectorType !== "other"');
    expect(organizationMaterializer).not.toContain('finding.vectorType !== "other"');
    expect(organizationMaterializer).not.toContain("finding.personName?.trim()");
    expect(organizationMaterializer).not.toContain("finding.role?.trim()");
    expect(personMaterializer).not.toContain("normalizeCandidateIdentityName(finding.value) !==");
    expect(personMaterializer).not.toContain("!finding.role?.trim()");
    expect(personMaterializer).toContain('!["success", "partial"].includes(observation.executionStatus)');
    expect(organizationMaterializer).toContain('!["success", "partial"].includes(observation.execution)');
    expect(personMaterializer).not.toContain("name.length < 3");
    expect(organizationMaterializer).not.toContain("name.length < 3");
    expect(candidateSourcePolicy).not.toContain("name.length < 3");
    expect(candidateSourcePolicy).not.toContain("identity.length < 3");
    expect(reconcilerSource).not.toContain("name.length < 3");
    expect(reconcilerSource).not.toContain('typeof finding.role !== "string"');
    expect(personMaterializer).not.toContain("if (!span?.exact");
    expect(organizationMaterializer).not.toContain("if (!span?.exact");
    expect(reconcilerSource).not.toContain('finding.vectorType !== "other"');
    expect(reconcilerSource).not.toContain("if (!span?.exact) continue;");
    expect(control).toContain("input.admittedCandidates.map((candidate)");
    expect(control).not.toContain("input.admittedCandidates.slice(0, 8)");
    expect(control).toContain("COMPLETE AVAILABLE REVIEW TARGETS");
    expect(control).toContain("rightHandPinnedControlState");
    expect(control).toContain("if the total prompt cannot fit, prompt construction fails visibly");
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
