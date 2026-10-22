import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const runnerPath = path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts");

function readRunner(): string {
  return fs.readFileSync(runnerPath, "utf8");
}

describe("canonical target contact-promotion oversight boundary", () => {
  it("resolves matching durable oversight before checking its evidence-graph count", () => {
    const source = readRunner();
    const reviewCall = source.indexOf("lastOversight = await reviewTargetInvestigationAct(");
    const durableOversightRead = source.indexOf("lastOversight = reviewedCase", reviewCall);
    const promotionGate = source.indexOf("&& (lastOversight?.evidenceGraphCount ?? 0) > 0", reviewCall);

    expect(reviewCall).toBeGreaterThanOrEqual(0);
    expect(durableOversightRead).toBeGreaterThan(reviewCall);
    expect(promotionGate).toBeGreaterThan(durableOversightRead);
    expect(source.slice(durableOversightRead, promotionGate)).toContain(
      "readOversight(parseCaseFile(reviewedCase.caseFile), latestResult.executionId ?? null, actNumber)",
    );
  });

  it("fails closed when the run/control-turn-matched durable oversight is missing", () => {
    const source = readRunner();

    expect(source).toContain("lastOversight = reviewedCase");
    expect(source).toContain(": null;");
    expect(source).toContain('&& lastOversight?.status === "completed"');
    expect(source).toContain("&& (lastOversight?.evidenceGraphCount ?? 0) > 0");
  });
});


describe("target case context progresses at action boundaries", () => {
  it("persists each Investigator trajectory action and refreshes the target context document before the next act", () => {
    const runner = readRunner();
    const agent = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-contact-agent.ts"), "utf8");
    expect(agent).toContain("priorTrajectoryRecords?: readonly AgenticTrajectoryRecord[]");
    expect(agent).toContain("onTrajectoryRecord: input.onTrajectoryRecord");
    expect(runner).toContain("onTrajectoryRecord: persistTargetActionCheckpoint");
    expect(runner).toContain('recordKind: "trajectory_action"');
    expect(runner).toContain('eventType: "tool_observation"');
    expect(runner).toContain("contextDocument: nextContext");
    expect(runner).toContain("targetTrajectoryUpdatedAt");
    expect(runner).toContain("priorTrajectoryRecords: durableTrajectory.records");
  });

  it("reconstructs the context from granular target source observations and deduplicates post-act copies", () => {
    const runner = readRunner();
    expect(runner).toContain('inArray(researchCaseEventsTable.eventType, ["tool_observation", "observation"])');
    expect(runner).toContain('payload.recordKind === "trajectory_action"');
    expect(runner).toContain("const seenSourceTurns = new Set<string>()");
    expect(runner).toContain("const granularControlTurns = new Set(uniqueGranular.map((item) => item.controlTurn))");
    expect(runner).toContain("const records = selected.map((item, index) => ({ ...item.record, turn: index + 1 }))");
  });
});


describe("target-card continuation uses the target case and selected depth", () => {
  it("persists and clears the entity's target-case pointer without overwriting other metadata", () => {
    const runner = readRunner();
    expect(runner).toContain("targetCaseId, targetCaseJobId: atlasJobId");
    expect(runner).toContain("delete nextMetadata.targetCaseId");
    expect(runner).toContain('await delCachePattern("entities:list:*")');
  });

  it("routes target continuation through the same durable target case and selected depth", () => {
    const route = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-target-continuation.ts"), "utf8");
    expect(route).toContain('"/research/bureau/target-cases/:caseId/run-next-pass"');
    expect(route).toContain('["fast", "standard", "deep"].includes(requestedDepthValue)');
    expect(route).toContain("researchDepth: requestedResearchDepth");
  });
});


describe("explicit target continuation after a model-completed case", () => {
  it("retains the target-case pointer for completed targets and permits user-requested continuation without bypassing cancellation fences", () => {
    const runner = readRunner();
    const route = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-target-continuation.ts"), "utf8");
    expect(runner).toContain('if (authoritativeCase?.status === "cancelled" || cancelled)');
    expect(runner).not.toContain('if (authoritativeCase?.status === "complete" || authoritativeCase?.status === "cancelled" || cancelled)');
    expect(route).toContain("A user-initiated Continue action may explicitly reopen a model-completed");
    expect(route).toContain('if (locked.status === "cancelled"');
    expect(route).toContain("canonical-continuation-cancelled");
  });
});
