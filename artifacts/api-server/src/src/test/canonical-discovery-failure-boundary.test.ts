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

  it("keeps the Investigator transport fallback outside the research decision loop", async () => {
    const source = await readFile(resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
    expect(source).toContain("TRANSPORT FALLBACK");
    expect(source).toContain("investigatorLlm: \"mistral\"");
    expect(source).toContain("providerFallback: [\"groq->mistral\"");
  });
});
