import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const runnerPath = path.resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts");
const canonicalDiscoveryPath = path.resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts");

function readRunner(): string {
  return fs.readFileSync(runnerPath, "utf8");
}

function readCanonicalDiscovery(): string {
  return fs.readFileSync(canonicalDiscoveryPath, "utf8");
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

  it("applies initial target direction on the first act of this invocation, preserving Right-hand redirect precedence", () => {
    const source = readRunner();
    const firstActNumber = source.indexOf("const firstActNumber =");
    const loopStart = source.indexOf("for (let actNumber = firstActNumber", firstActNumber);
    const directionIndex = source.indexOf("const direction =", loopStart);

    expect(firstActNumber).toBeGreaterThanOrEqual(0);
    expect(loopStart).toBeGreaterThan(firstActNumber);
    expect(directionIndex).toBeGreaterThan(loopStart);
    expect(source.slice(directionIndex, directionIndex + 300)).toContain(
      'lastOversight?.action === "redirect" ? lastOversight.direction : actNumber === firstActNumber ? (options.initialDirection?.trim() || null) : null;',
    );
    expect(source).not.toContain(
      'lastOversight?.action === "redirect" ? lastOversight.direction : actNumber === 1 ? (options.initialDirection?.trim() || null) : null;',
    );
  });

  it("passes only a validated Boss target direction into canonical target research", () => {
    const source = readCanonicalDiscovery();
    const branchStart = source.indexOf('if (decision.action === "research_candidate" || decision.action === "revisit_candidate") {');
    const branchEnd = source.indexOf('if (decision.action === "continue_discovery" || decision.action === "pivot_discovery") {', branchStart);
    const targetBranch = source.slice(branchStart, branchEnd);
    const directionValidation = targetBranch.indexOf("validateResearchObjective(decision.direction)");
    const targetHandoff = targetBranch.indexOf("runCanonicalSingleTargetInvestigation(");

    expect(branchStart).toBeGreaterThanOrEqual(0);
    expect(branchEnd).toBeGreaterThan(branchStart);
    expect(directionValidation).toBeGreaterThanOrEqual(0);
    expect(targetHandoff).toBeGreaterThan(directionValidation);
    expect(targetBranch).toContain("initialDirection: targetInitialDirection");
    expect(targetBranch).toContain("target_direction_rejected");
    expect(targetBranch).not.toContain("initialDirection: decision.direction");
  });
});
