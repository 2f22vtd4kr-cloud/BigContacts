import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("canonical Atlas ownership/provenance seam guards", () => {
  it("binds canonical discovery control persistence to the current job", () => {
    const source = read("src/src/lib/atlas-control-decision.ts");
    expect(source).toContain("jobId?: string | null");
    expect(source).toContain("durableFile.jobId ?? durableFile.atlasJobId");
    expect(source).toContain("atlas-control:case:");
    expect(source).toContain(":job:");
  });

  it("binds target control persistence to the current job", () => {
    const source = read("src/src/lib/target-control-decision.ts");
    expect(source).toContain("caseFile.atlasJobId ?? caseFile.jobId");
    expect(source).toContain("refusing stale control persistence");
  });

  it("requires current case ownership on stale continuation/error projections", () => {
    const discoveryContinuation = read("src/src/routes/research/canonical-case-continuation.ts");
    const targetContinuation = read("src/src/routes/research/canonical-target-continuation.ts");
    const targetRunner = read("src/src/lib/canonical-single-target-runner.ts");
    expect(discoveryContinuation).toContain("caseFile}::jsonb ->> 'jobId'");
    expect(targetContinuation).toContain("caseFile}::jsonb ->> 'atlasJobId'");
    expect(targetRunner).toContain("caseFile}::jsonb ->> 'atlasJobId'");
    expect(targetRunner).toContain("currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')");
    const launch = read("src/src/routes/research/canonical-atlas-launch.ts");
    expect(launch).toContain('currentAction: "canonical-lease-lost"');
    expect(launch).not.toContain("'{atlasJobId}', to_jsonb");
    expect(launch).toContain("caseFile}::jsonb ->> 'jobId'");
    const discoveryRoute = read("src/src/routes/research/canonical-case-discovery.ts");
    expect(discoveryRoute).toContain('currentAction: "canonical-discovery-error"');
    expect(discoveryRoute).toContain("caseFile}::jsonb ->> 'jobId'");
    const contactPersist = read("src/src/lib/bureau-contact-persist-strict.ts");
    expect(contactPersist).toContain("Contact evidence persistence lost durable Atlas job ownership");
    const targetControl = read("src/src/lib/target-control-decision.ts");
    expect(targetControl).toContain("refusing stale control event persistence");
    const oversight = read("src/src/lib/target-act-oversight.ts");
    expect(oversight).toContain("jobId?:string|null");
    expect(oversight).toContain("refusing stale oversight event persistence");
    expect(oversight).toContain("jobId:jobId??null");
    expect(oversight).toContain("target-oversight:case:");
    expect(oversight).toContain(":job:");
    expect(oversight).toContain("persistActOversight(input.caseId,input.controlTurn,input.act,unavailable,runId,input.intelligenceState,input.jobId)");
    expect(strictPersist).toContain("await db.transaction(async(tx)=>");
    expect(strictPersist).toContain('.for("update")');
  });

  it("binds promoted contact provenance to both job ownership and the supporting observed source", () => {
    const strictPersist = read("src/src/lib/bureau-contact-persist-strict.ts");
    const targetAgent = read("src/src/lib/target-contact-agent.ts");
    expect(strictPersist).toContain("jobId?: string | null");
    expect(strictPersist).toContain("provenance.jobId");
    expect(strictPersist).toContain("claimedSources");
    expect(strictPersist).toContain("observedSources");
    expect(targetAgent).toContain("jobId: input.jobId ?? null");
  });

  it("keeps control event sequence iteration separate from control-turn identity", () => {
    const discovery = read("src/src/lib/atlas-control-decision.ts");
    const target = read("src/src/lib/target-control-decision.ts");
    expect(discovery).toContain("const eventIteration = Number(latestEvent?.iteration ?? 0) + 1");
    expect(target).toContain("const eventIteration = Number(latestEvent?.iteration ?? 0) + 1");
    expect(discovery).toContain("controlTurn: input.controlTurn");
    expect(target).toContain("controlTurn: input.controlTurn");
  });

  it("reconstructs target trajectory from immutable event ID order", () => {
    const source = read("src/src/lib/canonical-single-target-runner.ts");
    expect(source).toContain("asc(researchCaseEventsTable.id)");
    expect(source).toContain("orderBy(asc(researchCaseEventsTable.id))");
  });
});
