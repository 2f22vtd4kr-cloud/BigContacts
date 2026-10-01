import { describe, expect, it } from "vitest";
import { runGeminiEvidenceProbe } from "./gemini-evidence-probe";

describe("Gemini evidence probe", () => {
  it("fails closed without a configured Gemini key", async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_KEY;
    const result = await runGeminiEvidenceProbe({ claim: "A named subject holds a public role." });
    expect(result.status).toBe("unavailable");
    expect(result.citations).toEqual([]);
    if (previous) process.env.GEMINI_API_KEY = previous;
  });
});
