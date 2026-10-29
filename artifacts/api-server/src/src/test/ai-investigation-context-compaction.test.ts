import { beforeEach, describe, expect, it, vi } from "vitest";

const bossMocks = vi.hoisted(() => ({
  generateGroqBossText: vi.fn(),
  getGroqBossLatencyConfig: vi.fn(),
  resolveGroqBossModel: vi.fn(),
}));

vi.mock("../lib/groq-boss", () => ({
  generateGroqBossText: bossMocks.generateGroqBossText,
  getGroqBossLatencyConfig: bossMocks.getGroqBossLatencyConfig,
  resolveGroqBossModel: bossMocks.resolveGroqBossModel,
}));

import { summarizeInvestigatorContextWithBoss } from "../lib/ai-investigation-context-compaction";

describe("AI investigation context compaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bossMocks.getGroqBossLatencyConfig.mockReturnValue({
      requestTimeoutMs: 1_000,
      overallTimeoutMs: 2_000,
      maximumPromptChars: 20_000,
    });
    bossMocks.resolveGroqBossModel.mockResolvedValue({
      model: "mock-boss-model",
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
    });
  });

  it("repairs an oversized model summary against the original source, not the lossy first summary", async () => {
    const sourceUrl = "https://source.example/filings/director-appointment";
    const source = [
      "CANONICAL CASE MEMORY",
      "EARLY FACT: Alice Example is the managing director.",
      "BACKGROUND: " + "Prior research distinguishes the filing from a search-only lead. ".repeat(55),
      "SOURCE_URL: " + sourceUrl,
      "SOURCE_END_SENTINEL: The filing states Alice Example was appointed director on 2024-06-12.",
    ].join("\n");
    const firstSummary = [
      "PRIOR_SUMMARY_ONLY_SENTINEL",
      "This intermediate summary is too long and has already reduced source details. ".repeat(25),
      "Source: " + sourceUrl,
    ].join(" ");
    expect(firstSummary.length).toBeGreaterThan(900);

    const correctedSummary = "Alice Example is the managing director, appointed on 2024-06-12. Source: " + sourceUrl;
    bossMocks.generateGroqBossText
      .mockResolvedValueOnce({ model: "mock-boss-model", raw: JSON.stringify({ summary: firstSummary }), error: null, attempts: [] })
      .mockResolvedValueOnce({ model: "mock-boss-model", raw: JSON.stringify({ summary: correctedSummary }), error: null, attempts: [] });

    const result = await summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 });

    expect(result).toBe(correctedSummary);
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(2);
    const repairPrompt = String(bossMocks.generateGroqBossText.mock.calls[1]?.[1] ?? "");
    expect(repairPrompt).toContain("SOURCE_END_SENTINEL");
    expect(repairPrompt).toContain("appointed director on 2024-06-12");
    expect(repairPrompt).not.toContain("PRIOR_SUMMARY_ONLY_SENTINEL");
  });

  it("fails closed when the model cannot produce required working memory", async () => {
    const source = "CANONICAL CASE MEMORY " + "Named source facts and unresolved questions. ".repeat(45);
    bossMocks.generateGroqBossText.mockRejectedValueOnce(new Error("mock provider unavailable"));

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 })).resolves.toBeNull();
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(1);
  });
});
