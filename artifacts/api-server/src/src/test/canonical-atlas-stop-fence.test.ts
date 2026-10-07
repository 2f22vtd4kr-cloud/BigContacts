import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(process.cwd(), "src/src/routes/research/canonical-atlas-launch.ts");

describe("canonical Atlas stop fence", () => {
  it("only transitions active durable cases to review so a late stop cannot downgrade completion", () => {
    const source = fs.readFileSync(routePath, "utf8");
    const stopBlock = source.slice(source.indexOf('router.post("/ingest/atlas-stop"'));
    expect(stopBlock).toContain('eq(researchCasesTable.status, "active")');
    expect(stopBlock).toContain('currentAction: "canonical-atlas-cancelled"');
    expect(stopBlock).toContain("researchCasesTable.caseFile");
  });

  it("fences discovery-case creation and opening-event append against stop races", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
    expect(source).toContain("reconcileDiscoveryCaseCancellation");
    expect(source).toContain('currentAction: "canonical-atlas-cancelled"');
    expect(source).toContain('eq(researchCasesTable.status, "active")');
    expect(source).toContain(".for(\"update\")");
    expect(source).toContain("refusing assignment event after cancellation");
  });

  it("fences active cases left behind by an expired canonical lease before a new launch", () => {
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain("fenceStaleCanonicalCases");
    expect(source).toContain('currentAction: "canonical-lease-lost"');
    expect(source).toContain("lockClaimed = true;");
    expect(source).toContain("await fenceStaleCanonicalCases(atlasJobId);");
    expect(source).toContain("'atlasJobId'");
    expect(source).toContain("'jobId'");
  });
});
