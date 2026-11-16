import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const canonicalPipeline = readFileSync(new URL("../lib/canonical-atlas-discovery.ts", import.meta.url), "utf8");
const launchRoute = readFileSync(new URL("../routes/research/canonical-atlas-launch.ts", import.meta.url), "utf8");
const launchClient = readFileSync(new URL("../../../../apex-finder/src/lib/launch-atlas.ts", import.meta.url), "utf8");

describe("canonical Atlas model-owned target selection", () => {
  it("does not impose a deterministic target-count quota in the launch or research loop", () => {
    expect(canonicalPipeline).not.toMatch(/\btargetCount\b|\btargetLimit\b/);
    expect(launchRoute).not.toMatch(/\btargetCount\b|\btargetLimit\b/);
    expect(launchClient).not.toMatch(/\btargetCount\b|\btargetLimit\b/);
  });

  it("retains objective execution budgets and cancellation as the actual stopping safeguards", () => {
    expect(canonicalPipeline).toContain("maxControlTurns");
    expect(canonicalPipeline).toContain("atlasDeadline");
    expect(canonicalPipeline).toContain("assertAtlasDeadline");
    expect(canonicalPipeline).toContain("cancelled");
    expect(launchRoute).toContain("total: singleTargetId ? 1 : 0");
    expect(launchRoute).toContain("atlasPhaseTotal: singleTargetId ? 1 : 4");
  });
});
