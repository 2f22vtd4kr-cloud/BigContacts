import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.resolve(process.cwd(), "src/src");

describe("canonical provider status contract", () => {
  it("reports only current model roles and active search pools", () => {
    const extractor = fs.readFileSync(path.join(sourceRoot, "lib/ai-extractor.ts"), "utf8");
    const start = extractor.indexOf("export function getAIKeyStatus(): AIKeyStatus {");
    expect(start).toBeGreaterThanOrEqual(0);
    const statusFunction = extractor.slice(start);
    expect(statusFunction).toContain("groqInvestigator:");
    expect(statusFunction).toContain("serper:");
    expect(statusFunction).toContain("serpapi:");
    expect(statusFunction).toContain("tavily:");
    expect(statusFunction).toContain("exa:");
    expect(statusFunction).not.toMatch(/gemini|mistral|perplexity|nvidia/i);

    const lanes = fs.readFileSync(path.join(sourceRoot, "lib/lanes-honesty.ts"), "utf8");
    expect(lanes).toContain("groqAdmissionFallback: false");

    const health = fs.readFileSync(path.join(sourceRoot, "routes/health.ts"), "utf8");
    expect(health).toContain("getGroqBossStatus");
    expect(health).toContain("groqRightHand");
    expect(health).toContain("groqInvestigator");
    expect(health).toContain("serpapi");
    expect(health).not.toMatch(/status\.gemini|status\.mistral|status\.perplexity|nvidiaNim/i);
  });
});
