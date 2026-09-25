import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const libDir = path.resolve(process.cwd(), "src/src/lib");
const repoRoot = path.resolve(process.cwd(), "../..");
const discoverySource = fs.readFileSync(path.join(libDir, "discovery-agent.ts"), "utf8");
const researchSource = fs.readFileSync(path.join(libDir, "agentic-web-research.ts"), "utf8");
const orchestratorPath = path.join(libDir, "atlas-orchestrator.ts");
const orchestratorExists = fs.existsSync(orchestratorPath);
const orchestratorSource = orchestratorExists ? fs.readFileSync(orchestratorPath, "utf8") : "";
const runtimeHardener = fs.readFileSync(path.join(repoRoot, "scripts/check-agentic-runtime-v2.mjs"), "utf8");

describe("discovery runtime architecture", () => {
  it("keeps discovery model-owned", () => {
    expect(discoverySource).toMatch(/model|investigator/i);
    expect(discoverySource).not.toMatch(/force[_-]?dig|forced.*search|fixed.*url.*sequence/i);
  });

  it("does not retain the retired deterministic Atlas orchestrator", () => {
    expect(orchestratorExists).toBe(false);
    expect(orchestratorSource).toBe("");
  });

  it("keeps the canonical opening order Boss first, Right-hand second", () => {
    const canonicalSource = fs.readFileSync(path.join(libDir, "canonical-atlas-discovery.ts"), "utf8");
    const bossIndex = canonicalSource.indexOf("const boss = await runGeminiBossDiscovery(");
    const rightHandIndex = canonicalSource.indexOf("const rightHandRaw = await import(\"./gemini-right-hand-reasoning\")");
    expect(bossIndex).toBeGreaterThan(-1);
    expect(rightHandIndex).toBeGreaterThan(-1);
    expect(bossIndex).toBeLessThan(rightHandIndex);
    expect(canonicalSource).toMatch(/Boss opening decision.*Right-hand.*inspect/is);
  });

  it("actually invokes per-act Right-hand/Boss oversight after a target Investigator act", () => {
    const runner = fs.readFileSync(path.join(libDir, "canonical-single-target-runner.ts"), "utf8");
    const oversightImport = runner.indexOf('import { reviewTargetInvestigationAct } from "./target-act-oversight";');
    const oversightCall = runner.indexOf("await reviewTargetInvestigationAct({");
    const actExecution = runner.indexOf("latestResult = await runTargetContactAgent({");
    expect(oversightImport).toBeGreaterThan(-1);
    expect(actExecution).toBeGreaterThan(-1);
    expect(oversightCall).toBeGreaterThan(actExecution);
    expect(runner).toMatch(/runId:\s*latestResult\.executionId/);
    expect(runner).toMatch(/rightHand.*Boss|Boss.*Right-hand/is);
  });

  it("keeps target opening Boss-first and requires Right-hand before act 1", () => {
    const runner = fs.readFileSync(path.join(libDir, "canonical-single-target-runner.ts"), "utf8");
    const bossOpening = runner.indexOf("runGeminiBossDiscovery({");
    const rightHandOpening = runner.indexOf("runGeminiRightHandFreeJson(");
    const firstAct = runner.indexOf("latestResult = await runTargetContactAgent({");
    expect(bossOpening).toBeGreaterThan(-1);
    expect(rightHandOpening).toBeGreaterThan(bossOpening);
    expect(firstAct).toBeGreaterThan(rightHandOpening);
    expect(runner).toMatch(/actorRole: "gemini_boss"/);
    expect(runner).toMatch(/actorRole: "right_hand"/);
    expect(runner).toMatch(/target-boss-opening/);
    expect(runner).toMatch(/target-right-hand-opening/);
  });
  it("does not promote discovery candidates from search snippets alone", async () => {
    const canonicalSource = fs.readFileSync(path.join(libDir, "canonical-atlas-discovery.ts"), "utf8");
    expect(canonicalSource).toMatch(/directSourceAction\s*=\s*payload\.action\s*===\s*"visit"\s*\|\|\s*payload\.action\s*===\s*"browser_fetch"/);
  });

  it("keeps agentic web research capability-oriented rather than a hard-coded research ladder", () => {
    expect(researchSource).toMatch(/tool|capabilit|action/i);
    expect(researchSource).not.toMatch(/force[_-]?dig|fixed.*provider.*sequence|always.*search.*then.*visit/i);
  });


  it("does not allow a cold discovery run to terminate after a single unusable external search", async () => {
    const { discoveryTerminalGate } = await import("../lib/agentic-web-research-core");
    expect(discoveryTerminalGate([{
      turn: 1,
      model: "groq",
      action: "web_search",
      args: { provider: "serper", query: "discovery" },
      execution: "error",
      observation: "serper returned no usable result.",
      observedUrls: [],
      findings: [],
    }])).toEqual({
      allowed: false,
      reason: expect.stringContaining("no usable external observation"),
    });
  });

  it("allows discovery to terminate after an actual observed external action", async () => {
    const { discoveryTerminalGate } = await import("../lib/agentic-web-research-core");
    expect(discoveryTerminalGate([{
      turn: 1,
      model: "groq",
      action: "web_search",
      args: { provider: "serper", query: "discovery" },
      execution: "success",
      observation: "Result",
      observedUrls: ["https://example.com/source"],
      findings: [],
    }])).toEqual({ allowed: true, reason: null });
  });

  it("keeps runtime safety checks fail-closed and bounded", () => {
    expect(runtimeHardener).toMatch(/fail.?closed/i);
    expect(runtimeHardener).toMatch(/timeout|abort|cancel/i);
  });
});
