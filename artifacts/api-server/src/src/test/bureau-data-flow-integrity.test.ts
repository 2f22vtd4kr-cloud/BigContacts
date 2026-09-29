import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Apex Atlas Bureau data-flow integrity", () => {
  it("does not truncate canonical case context or Investigator history", () => {
    const durableFiles = [
      "artifacts/api-server/src/src/lib/agentic-web-research.ts",
      "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
      "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts",
      "artifacts/api-server/src/src/lib/target-contact-agent.ts",
      "artifacts/api-server/src/src/lib/target-act-oversight.ts",
      "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
      "artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts",
    ].map((file) => source(file));

    for (const content of durableFiles) {
      expect(content).not.toMatch(/\.slice\(\s*-\d+/);
      expect(content).not.toMatch(/Math\.min\(\s*40\s*,/);
      expect(content).not.toMatch(/maxCandidates/);
    }

    const bossPrompt = source("artifacts/api-server/src/src/lib/case-bureau-prompt.ts");
    const compactor = source("artifacts/api-server/src/src/lib/investigation-context-compaction.ts");
    expect(bossPrompt).toContain("function buildBossDecisionContext");
    expect(bossPrompt).toContain("actionFrontier: { queued, completed }");
    expect(bossPrompt).toContain(".slice(-6)");
    expect(compactor).toContain("export function buildInvestigatorContext");
    expect(compactor).toContain("Durable trajectory/evidence is never deleted");
    expect(compactor).toContain("Do not treat omitted raw detail as negative evidence");
    expect(compactor).not.toMatch(/durable.*\.slice\(\s*-\d+/i);
  });

  it("keeps the research-depth action budget model-decided", () => {
    const content = source("artifacts/api-server/src/src/lib/research-depth.ts");
    // Research depth supplies bounded safety ceilings; it must not encode a
    // deterministic research sequence or mandatory tool path.
    expect(content).toContain("const MAX_RESEARCH_ACTIONS = 64;");
    expect(content).toContain("const MAX_NO_PROGRESS = 64;");
    expect(content).toContain("const MAX_FOLLOW_UPS = 64;");
    expect(content).toContain("const MAX_AGENTIC_ITERATIONS = 64;");
    expect(content).toContain("The Investigator chooses trajectory and stopping");
    expect(content).toContain("hard timeout remains");
  });

  it("keeps the Investigator-to-card path evidence-backed", () => {
    const agent = source("artifacts/api-server/src/src/lib/target-contact-agent.ts");
    const persistence = source("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
    expect(agent).toContain("sourceBackedFindings");
    expect(agent).toContain("persistSourceBackedBureauContactsForEntity");
    expect(persistence).toContain("resolveImmutablePromotionSupport");
    expect(persistence).toContain("observedSourceBackedBureauContacts");
    expect(persistence).toContain("applyInvestigatorSelectedContactToEntityCard");
  });
});
