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
      "artifacts/api-server/src/src/lib/case-bureau-prompt.ts",
      "artifacts/api-server/src/src/lib/agentic-web-research.ts",
      "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts",
      "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts",
      "artifacts/api-server/src/src/lib/target-contact-agent.ts",
      "artifacts/api-server/src/src/lib/target-act-oversight.ts",
      "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
      "artifacts/api-server/src/src/lib/investigation-context-compaction.ts",
      "artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts",
    ].map((file) => source(file));

    for (const content of files) {
      // A bounded recent-act view is control-plane working state, not durable history.
      // Remove that explicit advisory-window use before enforcing the no-truncation law.
      const durableSource = content.replace(/recentActs\.slice\(-4\)/g, "");
      expect(durableSource).not.toMatch(/\.slice\(\s*-\d+/);
      expect(content).not.toMatch(/Math\.min\(\s*40\s*,/);
      expect(content).not.toMatch(/maxCandidates/);
      expect(content).not.toMatch(/maxControlTurns/);
    }
  });

  it("keeps research depth adaptive while retaining explicit operational safety bounds", () => {
    const content = source("artifacts/api-server/src/src/lib/research-depth.ts");
    expect(content).toContain("Research depth is a coordination hint, not a scripted research playbook.");
    expect(content).toContain("const MAX_RESEARCH_ACTIONS = 64;");
    expect(content).toContain("const MAX_FOLLOW_UPS = 64;");
    expect(content).toContain("const MAX_AGENTIC_ITERATIONS = 64;");
    expect(content).toContain("agenticHardTimeoutMs");
    expect(content).toContain("hard timeout remains the operational safety boundary");
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
