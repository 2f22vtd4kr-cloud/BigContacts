import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("canonical discovery failure boundary", () => {
  it("cannot convert a non-completed Investigator result into a successful job", async () => {
    const source = await readFile(resolve(process.cwd(), "src/src/routes/research/canonical-case-discovery.ts"), "utf8");
    expect(source).toContain("const finishedJob = await getJob(jobId)");
    expect(source).toContain("discoveryStatus !== \"completed\"");
    expect(source).toContain("status: \"failed\", outcome: \"incomplete\"");
    expect(source).toContain("currentAction: \"canonical-discovery-error\"");
  });

  // Investigator provider selection happens once; execution failure is truthful
  // failure, never a second deterministic research trajectory.
  it("does not introduce a sequential Investigator provider fallback into the research decision loop", async () => {
    const source = await readFile(resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
    expect(source).not.toContain("TRANSPORT FALLBACK");
    expect(source).not.toContain("investigatorLlm: \"mistral\"");
    expect(source).not.toContain("providerFallback: [\"groq->mistral\"");
    expect(source).toContain("const primary = await core.runAgenticWebResearch(discoveryInput); return { ...primary, executionId };");
  });
});
