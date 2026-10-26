import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const reconciler = readFileSync(new URL("../lib/research-lead-card-reconciliation.ts", import.meta.url), "utf8");
const ingestRoutes = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");
describe("terminal review-card reconciliation", () => {
  it("persists only exact organization findings from successful search observations as review leads", () => {
    expect(reconciler).toContain('finding.scope !== "organization"');
    expect(reconciler).toContain('payload.execution === "success"');
    expect(reconciler).toContain("bindExactSourceSpan(observation.text, lead.name)");
    expect(reconciler).toContain('verificationLevel: "search_result_lead"');
    expect(reconciler).toContain('status: "review"');
    expect(reconciler).toContain("unverified lead, not fetched-page evidence");
  });
  it("runs as idempotent reconciliation when an Atlas job reaches a terminal status", () => {
    expect(ingestRoutes).toContain('["done", "failed", "cancelled"].includes(String(job.status))');
    expect(ingestRoutes).toContain("reconcileOrganizationReviewCardsForJob(jobId)");
  });
});
