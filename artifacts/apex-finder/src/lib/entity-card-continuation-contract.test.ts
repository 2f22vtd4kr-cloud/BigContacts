import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const entitiesPage = readFileSync(new URL("../pages/entities.tsx", import.meta.url), "utf8");

describe("saved entity-card continuation action", () => {
  it("reads durable discovery/target case IDs from entity metadata", () => {
    expect(entitiesPage).toContain('key: "discoveryCaseId" | "targetCaseId"');
    expect(entitiesPage).toContain("function discoveryCaseIdFromMetadata");
    expect(entitiesPage).toContain("function targetCaseIdFromMetadata");
  });

  it("continues an existing durable case before falling back to a new investigation", () => {
    expect(entitiesPage).toContain("/api/research/bureau/target-cases/");
    expect(entitiesPage).toContain("/api/research/bureau/cases/");
    expect(entitiesPage).toContain("if (targetCaseId !== null)");
    expect(entitiesPage).toContain("else if (discoveryCaseId !== null)");
    expect(entitiesPage).toContain("body: JSON.stringify({ researchDepth })");
    expect(entitiesPage).toContain("launchAtlasPipeline({ singleTargetId: entityId");
    expect(entitiesPage).toContain('hasCaseToContinue ? "Continue" : "Re-run"');
    expect(entitiesPage).toContain("onClick={handleRerun}");
  });

  it("renders the continue control in the ledger card with saved case identifiers", () => {
    expect(entitiesPage).toContain("<RerunButton entityId={entity.id} discoveryCaseId={discoveryCaseIdFromMetadata(entity.metadata)} targetCaseId={targetCaseIdFromMetadata(entity.metadata)}");
    expect(entitiesPage).toContain("Continue this target investigation from its durable context");
    expect(entitiesPage).toContain("Continue the discovery investigation using the selected research depth");
  });
});
