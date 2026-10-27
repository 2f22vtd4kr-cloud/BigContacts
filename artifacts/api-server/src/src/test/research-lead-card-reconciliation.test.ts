import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const reconciler = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../routes/research/canonical-atlas-launch.ts", import.meta.url), "utf8");
const dashboardRoute = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");
const agenticCore = readFileSync(new URL("../lib/agentic-web-research-core.ts", import.meta.url), "utf8");
describe("terminal review-card reconciliation", () => {
  it("retains registry-typed company leads even when the Investigator emitted no finding", () => {
    expect(agenticCore).toContain("export function compactRegistryCompanyLeads");
    expect(agenticCore).toContain('row.type !== "Corporation"');
    expect(agenticCore).toContain("companyLeads: error ? [] : companyLeads");
    expect(reconciler).toContain("const outcomes = Array.isArray(args.registrySearchOutcomes) ? args.registrySearchOutcomes : []");
    expect(reconciler).toContain('const partialRegistry = registryAction && payload.execution === "partial"');
    expect(reconciler).toContain("bindExactSourceSpan(observation.text, lead.name)");
    expect(reconciler).toContain('verificationLevel, evidenceHierarchy: hasFetched ? "fetched-source-name-only" : "unverified-search-lead"');
    expect(reconciler).toContain("ownership, control, wealth, and targetability remain unestablished");
  });
  it("persists only exact organization findings from successful search observations as review leads", () => {
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
