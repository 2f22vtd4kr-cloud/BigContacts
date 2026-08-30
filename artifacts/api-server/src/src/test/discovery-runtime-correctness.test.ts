import { describe, expect, it } from "vitest";
import fs from "node:fs";

const discoverySource = fs.readFileSync(new URL("../lib/discovery-agent.ts", import.meta.url), "utf8");
const researchSource = fs.readFileSync(new URL("../lib/agentic-web-research.ts", import.meta.url), "utf8");

describe("discovery runtime correctness", () => {
  it("passes the actual research trajectory into identity admission", () => {
    expect(discoverySource).toContain("parsePersonFindings(result.findings ?? [], result.trajectory ?? [])");
  });

  it("bounds concurrent agentic runs without constraining per-run model actions", () => {
    expect(researchSource).toContain("AGENTIC_RESEARCH_CONCURRENCY");
    expect(researchSource).toContain("acquireAgenticResearchSlot");
    expect(researchSource).toContain("finally {");
    expect(researchSource).toContain("releaseAgenticResearchSlot");
    expect(researchSource).toContain("runAgenticWebResearchUnbounded");
  });
});
