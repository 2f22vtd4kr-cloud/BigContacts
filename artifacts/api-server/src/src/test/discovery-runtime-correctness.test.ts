import { describe, expect, it } from "vitest";
import fs from "node:fs";

const discoverySource = fs.readFileSync(new URL("../lib/discovery-agent.ts", import.meta.url), "utf8");
const researchSource = fs.readFileSync(new URL("../lib/agentic-web-research.ts", import.meta.url), "utf8");
const runtimeHardener = fs.readFileSync(new URL("../../../../../../scripts/apply-discovery-runtime-correctness.mjs", import.meta.url), "utf8");

describe("discovery runtime correctness", () => {
  it("passes model-emitted findings and the actual research trajectory into identity admission", () => {
    expect(discoverySource).toContain("const admissionFindings = result.modelFindings ?? [];");
    expect(discoverySource).toContain("parsePersonFindings(admissionFindings, result.trajectory ?? [])");
  });

  it("keeps the compatibility hardener idempotent and independently applies the run gate", () => {
    expect(runtimeHardener).toContain("const hasCanonicalModelFindings");
    expect(runtimeHardener).toContain("const AGENTIC_RESEARCH_CONCURRENCY");
    expect(runtimeHardener).toContain("runAgenticWebResearchUnbounded");
  });

  it("bounds concurrent agentic runs without constraining per-run model actions", () => {
    expect(researchSource).toContain("AGENTIC_RESEARCH_CONCURRENCY");
    expect(researchSource).toContain("acquireAgenticResearchSlot");
    expect(researchSource).toContain("finally {");
    expect(researchSource).toContain("releaseAgenticResearchSlot");
    expect(researchSource).toContain("runAgenticWebResearchUnbounded");
  });
});
