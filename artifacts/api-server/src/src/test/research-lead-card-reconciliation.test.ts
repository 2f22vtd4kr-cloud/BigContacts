import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractSearchResultCompanyLeadFindings } from "../lib/agentic-web-research-core";
import { matchAtlasAdmittedTarget, validateAtlasBossControl } from "../lib/atlas-control-decision";
import { buildTargetContactInvestigatorObjective } from "../lib/target-contact-agent";
const reconciler = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../routes/research/canonical-atlas-launch.ts", import.meta.url), "utf8");
const dashboardRoute = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");
const agenticCore = readFileSync(new URL("../lib/agentic-web-research-core.ts", import.meta.url), "utf8");
const bureauPass = readFileSync(new URL("../lib/bureau-agentic-pass.ts", import.meta.url), "utf8");
const orientation = readFileSync(new URL("../lib/apex-bureau-orientation.ts", import.meta.url), "utf8");
const runtimeProofWorkflow = readFileSync(new URL("../../../../../.github/workflows/apex-canonical-runtime-proof.yml", import.meta.url), "utf8");
const canonicalAtlas = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
describe("terminal review-card reconciliation", () => {
  it("chooses source classes by expected information gain and jurisdiction, not a registry-first habit", () => {
    expect(orientation).toContain("SOURCE SELECTION & JURISDICTION");
    expect(orientation).toContain("There is no fixed provider or registry-first sequence");
    expect(orientation).toContain("Companies House is a UK/Great Britain register");
    expect(orientation).toContain("not a substitute for US state Secretary-of-State filings");
    expect(orientation).toContain("ordinary web search is often the better first move");
    expect(orientation).toContain("A search result/snippet can justify a low-confidence review-only company lead");
  });

  it("retains registry-typed company leads even when the Investigator emitted no finding", () => {
    expect(agenticCore).toContain("export function compactRegistryCompanyLeads");
    expect(agenticCore).toContain('row.type !== "Corporation"');
    expect(agenticCore).toContain("companyLeads: error ? [] : companyLeads");
    expect(reconciler).toContain("const outcomes = Array.isArray(args.registrySearchOutcomes) ? args.registrySearchOutcomes : []");
    expect(reconciler).toContain('const partialRegistry = registryAction && payload.execution === "partial"');
    expect(reconciler).toContain("bindExactSourceSpan(observation.text, lead.name)");
    expect(reconciler).toContain('verificationLevel, evidenceHierarchy: hasFetched ? "fetched-source-name-only" : "unverified-search-lead"');
    expect(reconciler).toContain("ownership, control, wealth, and targetability remain unestablished");
    expect(reconciler).toContain("const sourceLeadName = pageIdentity?.name ?? null;");
    expect(reconciler).not.toContain("organizationLabelFromUrl(url)");

    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    const checkpoint = canonical.slice(
      canonical.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
      canonical.indexOf("export async function reconcileCanonicalDiscoveryCaseReviewCards"),
    );
    const organizationMaterializer = canonical.slice(
      canonical.indexOf("async function materializePartialOrganizationLeadCards"),
      canonical.indexOf("export async function runCanonicalAtlasPipeline"),
    );
    expect(checkpoint).not.toContain("if (input.findings.length === 0) return empty;");
    expect(organizationMaterializer).toContain("Registry adapters may return typed Corporation leads even when the model");
    expect(organizationMaterializer).toContain("payload.args?.registrySearchOutcomes");
    expect(organizationMaterializer).toContain("companyLeads");
    const typedRegistryLeadBlock = organizationMaterializer.slice(
      organizationMaterializer.indexOf("const name = company.name"),
      organizationMaterializer.indexOf("const notes ="),
    );
    expect(typedRegistryLeadBlock).toContain("isGenericDiscoveryMetadataTitle(name)");
    expect(organizationMaterializer).toContain("if (!leadNames.length) return { materialized: 0, evidenceRows: 0, candidates: [] };");
    expect(organizationMaterializer).toContain("...observations\n        .filter((observation) => bindExactSourceSpan(observation.observation, name)?.exact)");
    expect(canonical).toContain("if (!runId) continue;");
    expect(canonical).not.toContain("if (!runId || findings.length === 0) continue;");
    expect(bureauPass).toContain('["web_search","parallel_web_search","registry_search","parallel_registry_search","visit","browser_fetch"].includes(record.action)');
    expect(bureauPass).toContain('["success","partial"].includes(record.execution)');
    expect(bureauPass).not.toContain('if(record.findings.length>0){await input.onDiscoveryCheckpoint');
  });
  it("requires a real company or person card even if a later control turn fails", () => {
    expect(runtimeProofWorkflow).toContain('"failed"');
    expect(runtimeProofWorkflow).toContain('"partial_review"');
    expect(runtimeProofWorkflow).toContain('"Corporation"');
    expect(runtimeProofWorkflow).toContain('discoveryContext');
    expect(runtimeProofWorkflow).toContain('/api/dashboard/research-leads');
    expect(runtimeProofWorkflow).toContain('/api/entities');
    expect(runtimeProofWorkflow).toContain('acceptedAfterControlFailure');
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
    expect(agenticCore).toContain('actual returned result text contains an exact organization name');
    expect(agenticCore).toContain("promotionDecision=promote means admit only to the review-only company-card queue");
    expect(agenticCore).toContain('Search snippets are leads, not claim-grade evidence');
    expect(agenticCore).toContain("MIXED DISCOVERY: compare model-selected local/sector web hypotheses with relevant official business, ownership, transaction and public-asset sources; choose by information gain, never a fixed order, and do not repeat one registry after no new hit.");
    expect(agenticCore).toContain("SOURCE-NEUTRAL RESEARCH: compare plausible hypotheses and choose complementary source classes");
    expect(agenticCore).toContain("never default to Companies House or query registries merely because they are available");
    expect(agenticCore).not.toContain("Use parallel web searches and, where corporate records are relevant, 2–4 registry queries");
    expect(agenticCore).toContain('exact organization name plus eligible HTTPS URL in observed text yields a low-confidence review-only company finding');
  });

  it("materializes exact public person/role leads at the first discovery checkpoint", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    const personMaterializer = canonical.slice(
      canonical.indexOf("async function materializePartialPersonLeadCards"),
      canonical.indexOf("async function materializePartialOrganizationLeadCards"),
    );
    expect(personMaterializer).toContain("payload.leadUrls");
    expect(personMaterializer).toContain('const searched = action === "web_search" || action === "parallel_web_search"');
    expect(personMaterializer).toContain("bindExactSourceSpan(observation.observation, lead.role, lead.name, 320)");
    expect(personMaterializer).toContain('roleOnlyLead: true');
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

  it("persists only exact organization findings from successful search observations as review leads", () => {
    const canonical = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
    expect(reconciler).toContain('finding.scope !== "organization"');
    expect(reconciler).toContain("isGenericDiscoveryMetadataTitle(name)");
    expect(canonical).toContain("isGenericDiscoveryMetadataTitle(name)");
    expect(reconciler).toContain('payload.execution === "success"');
    expect(reconciler).toContain("bindExactSourceSpan(observation.text, lead.name)");
    expect(reconciler).toContain('const verificationLevel = hasFetched ? "fetched_source" : "search_result_lead"');
    expect(reconciler).toContain('status: "review"');
    expect(reconciler).toContain("unverified lead, not fetched-page evidence");
    expect(reconciler).toContain("reconcilePersonReviewCardsForJob");
    expect(reconciler).toContain('finding.scope !== "candidate"');
    expect(reconciler).toContain('claimType: "partial_person_role_lead"');
    expect(reconciler).toContain('const fetched = action === "visit" || action === "browser_fetch";');
    expect(reconciler).toContain('verificationLevel: fetched ? "fetched_source" : "search_result_lead"');
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


describe("search-result company lead extraction", () => {
  it("uses an exact business-like result title and its exact observed HTTPS URL, not the hostname", () => {
    const text = "Casino Perla\nURL: https://www.perla.si/casino\nCasino and hotel resort in Nova Gorica";
    const leads = extractSearchResultCompanyLeadFindings(text, ["https://www.perla.si/casino"]);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      value: "Casino Perla",
      scope: "organization",
      personName: null,
      role: null,
      sourceUrls: ["https://www.perla.si/casino"],
    });
    expect(leads[0]?.note).toContain("underlying page not fetched");
    expect(leads[0]?.note).toContain("LOW-CONFIDENCE REVIEW-ONLY COMPANY LEAD");
    expect(leads[0]).not.toHaveProperty("promotionDecision");
  });

  it("rejects article-like headlines and never infers a name from a URL", () => {
    expect(extractSearchResultCompanyLeadFindings(
      "Casino Perla announces new investment\nURL: https://www.perla.si/news\nNews story about a deal",
      ["https://www.perla.si/news"],
    )).toEqual([]);
    expect(extractSearchResultCompanyLeadFindings(
      "A page with no explicit business title\nURL: https://www.rathbones.co.uk/insights\nFinancial commentary",
      ["https://www.rathbones.co.uk/insights"],
    )).toEqual([]);
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
    expect(personMaterializer).toContain('observation.verificationLevel === "fetched_source" && !isClaimGradeDiscoverySourceUrl(sourceUrl)');
    expect(canonicalAtlas.match(/mergeDurablyAdmittedAtlasTargetSources\(\[admittedCandidateSources, admission\.candidates\]\)/g)).toHaveLength(2);
    expect(canonicalAtlas).not.toContain("admittedCandidateSources = mergeDurablyAdmittedCandidateSources");
  });

  it("keeps worthwhile search-result person and organization leads as review cards and Boss-selectable research targets", () => {
    const personMaterializer = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializePartialPersonLeadCards"),
      canonicalAtlas.indexOf("async function materializePartialOrganizationLeadCards"),
    );
    const organizationMaterializer = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializePartialOrganizationLeadCards"),
      canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    const admission = canonicalAtlas.slice(
      canonicalAtlas.indexOf("async function materializeAtlasAdmissions"),
      canonicalAtlas.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
    );
    const control = readFileSync(new URL("../lib/atlas-control-decision.ts", import.meta.url), "utf8");
    const reconcilerSource = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");

    // Safe HTTPS search-result leads may create explicitly unverified review cards;
    // fetched-source support still has to pass the stricter claim-grade URL gate.
    expect(personMaterializer).toContain('observation.verificationLevel === "fetched_source" && !isClaimGradeDiscoverySourceUrl(sourceUrl)');
    expect(organizationMaterializer).toContain('observation.verificationLevel === "fetched_source" && !isClaimGradeDiscoverySourceUrl(sourceUrl)');
    expect(reconcilerSource).toContain('if (!url || (fetched && !isClaimGradeDiscoverySourceUrl(url))) continue;');
    expect(canonicalAtlas).toContain("bindExactSourceSpanToUrl");
    expect(reconcilerSource).toContain("bindExactSourceSpanToUrl");
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

    // The Investigator may select worthwhile exact name/role leads, but this
    // never promotes them or turns snippets into wealth/contact evidence.
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
    expect(personMaterializer).not.toContain("normalizeCandidateIdentityName(finding.value) !==");
    expect(personMaterializer).not.toContain("!finding.role?.trim()");
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
      organizationMaterializer.indexOf('if (payload.execution !== "success")'),
    );
    const registryReconciliationBlock = reconcilerSource.slice(
      reconcilerSource.indexOf("if (registryAction &&"),
      reconcilerSource.indexOf("const search = /search/i.test(action);"),
    );
    expect(registryLeadObservationBlock).not.toContain("leadNames.push(name)");
    expect(registryReconciliationBlock).not.toContain("findings.set(identity, entry)");
  });
});
