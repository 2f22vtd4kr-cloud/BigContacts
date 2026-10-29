import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractSearchResultCompanyLeadFindings } from "../lib/agentic-web-research-core";
const reconciler = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../routes/research/canonical-atlas-launch.ts", import.meta.url), "utf8");
const dashboardRoute = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");
const agenticCore = readFileSync(new URL("../lib/agentic-web-research-core.ts", import.meta.url), "utf8");
const bureauPass = readFileSync(new URL("../lib/bureau-agentic-pass.ts", import.meta.url), "utf8");
const orientation = readFileSync(new URL("../lib/apex-bureau-orientation.ts", import.meta.url), "utf8");
const runtimeProofWorkflow = readFileSync(new URL("../../../../../.github/workflows/apex-canonical-runtime-proof.yml", import.meta.url), "utf8");
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
    expect(organizationMaterializer).toContain("if (!leadNames.length) return { materialized: 0, evidenceRows: 0 };");
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
    expect(agenticCore).toContain('SOURCE CHOICE: no registry-first sequence; choose by expected information gain and jurisdiction. For unanchored local/sector discovery, ordinary web search is often the better first move. Companies House is UK-only');
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
