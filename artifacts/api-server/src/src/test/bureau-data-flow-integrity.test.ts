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
      "artifacts/api-server/src/src/lib/target-contact-agent.ts",
      "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts",
      "artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts",
    ].map((file) => source(file));

    const quotaHistorySource = source("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
    expect(quotaHistorySource).toMatch(/investigatorCapabilityHistory:\s*\[\.\.\.history,\s*\{\s*from:\s*(?:previous|previousAssignment),\s*to:\s*replacement,\s*trigger:\s*"upstream_quota_exhausted"\s*\}\s*\]\.slice\(-15\)/);

    for (const content of durableFiles) {
      const boundedOversightTail = content.match(/recentActs:\s*\[\.\.\.historyRecords, \.\.\.records\]\.slice\(-4\)/)?.[0] ?? "";
      const genericScan = content
        .replace(quotaHistorySource.match(/investigatorCapabilityHistory:\s*\[\.\.\.history[\s\S]*?\.slice\(-15\)/)?.[0] ?? "", "")
        .replace(boundedOversightTail, "recentActs: bounded presentation-only context");
      expect(genericScan).not.toMatch(/\.slice\(\s*-\d+/);
      expect(genericScan).not.toMatch(/Math\.min\(\s*40\s*,/);
      expect(genericScan).not.toMatch(/maxCandidates/);
    }


    const discoveryObjective = source("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
    expect(discoveryObjective).toContain("validateResearchObjective(proposedDirection)");
    expect(discoveryObjective).toContain("formatBossDirectedObjective(discoveryObjective, validatedDirection.direction)");
    const objectiveHelper = source("artifacts/api-server/src/src/lib/research-objective.ts");
    expect(objectiveHelper).toContain("BOSS-DIRECTED RESEARCH QUESTION / PIVOT:");
    expect(objectiveHelper).toContain("PROVIDER_OR_TOOL_DIRECTIVE.test(value)");
    const agenticResearch = source("artifacts/api-server/src/src/lib/agentic-web-research.ts");
    expect(agenticResearch).toContain("sharedContext: `${oversightContext.contextDocument}\\n\\n${renderIntelligenceContext(intelligence.buildContext())}`");
    expect(agenticResearch).not.toContain("sharedContext: `${oversightContext.contextDocument}\\\\n\\\\n");

    const targetRunnerSource = source("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
    expect(targetRunnerSource).toContain("objective: `${caseRow.objective}\\n\\nHARD PROVIDER QUOTA RECOVERY:");
    expect(targetRunnerSource).not.toContain("objective: `${caseRow.objective}\\\\n\\\\nHARD PROVIDER QUOTA RECOVERY:");

    const targetOversight = source("artifacts/api-server/src/src/lib/target-act-oversight.ts");
    expect(targetOversight).toContain("if(turn>=latestTurn)caseFile.liveOversightDirection=oversight.direction");
    expect(targetOversight).toContain("history.splice(0,Math.max(0,history.length-32))");
    expect(targetOversight).toContain('const direction=action==="redirect"');
    expect(targetOversight).toContain("value!.direction.trim().length<=1_200");
    expect(targetOversight).toContain("value!.direction===null");

    const traceSource = source("artifacts/api-server/src/src/lib/investigator-trace.ts");
    const bureauPass = source("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
    expect(traceSource).toContain("executionId?: string");
    expect(traceSource).toContain("caseId?: number");
    expect(bureauPass).toContain("executionId:agentic.executionId");
    expect(bureauPass).toContain("caseId:durableCaseId??undefined");
    const targetRunner = source("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
    expect(targetRunner).toContain("recentActs: recentActs.slice(-4)");

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
