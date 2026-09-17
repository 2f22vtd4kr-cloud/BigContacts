import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Apex Atlas Bureau data-flow integrity", () => {
  it("does not truncate canonical case context or Investigator history", () => {
    const files = [
      "src/src/lib/case-bureau-prompt.ts",
      "src/src/lib/agentic-web-research.ts",
      "src/src/lib/canonical-atlas-discovery.ts",
      "src/src/lib/canonical-single-target-runner.ts",
      "src/src/lib/target-contact-agent.ts",
      "src/src/lib/investigation-context-compaction.ts",
      "src/src/routes/research/canonical-case-discovery.ts",
    ].map((file) => source(file));

    for (const content of files) {
      expect(content).not.toMatch(/\.slice\(\s*-\d+/);
      expect(content).not.toMatch(/Math\.min\(\s*40\s*,/);
      expect(content).not.toMatch(/maxCandidates/);
      expect(content).not.toMatch(/maxControlTurns/);
    }
  });

  it("keeps the research-depth action budget model-decided", () => {
    const content = source("src/src/lib/research-depth.ts");
    expect(content).toContain("agenticMaxIterations: UNBOUNDED");
    expect(content).toContain("adaptiveMaxActions: UNBOUNDED");
    expect(content).toContain("maxPersonFollowUps: UNBOUNDED");
    expect(content).toContain("maxDomainFollowUps: UNBOUNDED");
  });

  it("keeps the Investigator-to-card path evidence-backed", () => {
    const agent = source("src/src/lib/target-contact-agent.ts");
    const persistence = source("src/src/lib/bureau-contact-persist-strict.ts");
    expect(agent).toContain("sourceBackedFindings");
    expect(agent).toContain("persistSourceBackedBureauContactsForEntity");
    expect(persistence).toContain("resolveImmutablePromotionSupport");
    expect(persistence).toContain("observedSourceBackedBureauContacts");
    expect(persistence).toContain("applyInvestigatorSelectedContactToEntityCard");
  });
});
