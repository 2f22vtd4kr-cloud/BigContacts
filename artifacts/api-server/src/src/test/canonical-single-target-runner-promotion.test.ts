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
