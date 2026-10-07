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
    expect(source).toContain("'caseType'");
    expect(source).toContain("'runIds'");
  });

  it("reconciles a target case created across the cancellation check-before-create race", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");
    expect(source).toContain("reconcileTargetCaseCancellation");
    expect(source).toContain('currentAction: "canonical-atlas-cancelled"');
    expect(source).toContain("await reconcileTargetCaseCancellation(atlasJobId, caseRow.id);");
  });

  it("checks affected-row fences before target opening provider/event transitions", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");
    expect(source).toContain("openingFence");
    expect(source).toContain("openingProjection");
    expect(source).toContain("refusing Boss opening event after cancellation");
    expect(source).toContain("refusing Right-hand opening event after cancellation");
  });

  it("keeps discovery lock cleanup inside the claim-owned failure boundary", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-case-discovery.ts"), "utf8");
    expect(source).toContain('await setActiveJob("case-bureau-discovery", jobId);');
    expect(source).toContain('await releaseCanonicalJob("atlas-run", jobId).catch');
    expect(source).toContain("try {");
    expect(source).toContain("Canonical discovery lock acquisition failed.");
  });

  it("releases the target continuation lock if active-job binding fails", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-target-continuation.ts"), "utf8");
    expect(source).toContain('await setActiveJob("atlas-run", jobId);');
    expect(source).toContain('await releaseCanonicalJob("atlas-run", jobId).catch');
  });

  it("propagates live lease ownership into canonical control and Investigator cancellation fences", () => {
    const lock = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-job-lock.ts"), "utf8");
    const discovery = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
    const agentic = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
    expect(lock).toContain("isCanonicalJobOwner");
    expect(discovery).toContain('isCanonicalJobOwner("atlas-run", jobId)');
    expect(agentic).toContain("isCanonicalJobOwner(lockType, input.jobId)");
  });
});
