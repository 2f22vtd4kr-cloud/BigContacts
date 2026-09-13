import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const libDir = path.resolve(process.cwd(), "src/src/lib");
const discoverySource = fs.readFileSync(path.join(libDir, "discovery-agent.ts"), "utf8");
const researchSource = fs.readFileSync(path.join(libDir, "agentic-web-research.ts"), "utf8");
const orchestratorPath = path.join(libDir, "atlas-orchestrator.ts");
const orchestratorExists = fs.existsSync(orchestratorPath);
const orchestratorSource = orchestratorExists ? fs.readFileSync(orchestratorPath, "utf8") : "";
const runtimeHardener = fs.readFileSync(path.resolve(process.cwd(), "scripts/check-agentic-runtime-v2.mjs"), "utf8");

describe("discovery runtime architecture", () => {
  it("keeps discovery model-owned", () => {
    expect(discoverySource).toMatch(/model|investigator/i);
    expect(discoverySource).not.toMatch(/force[_-]?dig|forced.*search|fixed.*url.*sequence/i);
  });

  it("does not retain the retired deterministic Atlas orchestrator", () => {
    expect(orchestratorExists).toBe(false);
    expect(orchestratorSource).toBe("");
  });

  it("keeps agentic web research capability-oriented rather than a hard-coded research ladder", () => {
    expect(researchSource).toMatch(/tool|capabilit|action/i);
    expect(researchSource).not.toMatch(/force[_-]?dig|fixed.*provider.*sequence|always.*search.*then.*visit/i);
  });

  it("keeps runtime safety checks fail-closed and bounded", () => {
    expect(runtimeHardener).toMatch(/fail.?closed/i);
    expect(runtimeHardener).toMatch(/timeout|abort|cancel/i);
  });
});
