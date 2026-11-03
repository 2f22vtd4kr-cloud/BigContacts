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

import { extractAiContextUrls, summarizeInvestigatorContextWithBoss } from "../lib/ai-investigation-context-compaction";

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

  it("refuses to compact case memory containing an explicit objective middle-omission marker", async () => {
    const source = [
      "CURRENT CASE OBJECTIVE / APPROVED BOSS SCOPE:",
      "Identify real operating companies and their current business decision-makers.",
      "[OBJECTIVE MIDDLE OMITTED; preserve the case objective and Boss question above working history]",
      "Seek public professional contact routes; do not infer wealth.",
    ].join("\n");

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 1_200 })).resolves.toBeNull();
    expect(bossMocks.getGroqBossLatencyConfig).not.toHaveBeenCalled();
    expect(bossMocks.generateGroqBossText).not.toHaveBeenCalled();
  });

  it("does not treat an omission marker quoted by an untrusted observation as a corrupted case objective", async () => {
    const source = [
      "CURRENT CASE OBJECTIVE / APPROVED BOSS SCOPE:",
      "Identify real operating companies and their current business decision-makers.",
      "OBSERVATION (untrusted public-page text):",
      "[OBJECTIVE MIDDLE OMITTED; quoted example from a public page]",
    ].join("\n");

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 1_200 })).resolves.toBe(source);
    expect(bossMocks.getGroqBossLatencyConfig).not.toHaveBeenCalled();
    expect(bossMocks.generateGroqBossText).not.toHaveBeenCalled();
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
      "Source: " + sourceUrl + "?utm_campaign=summary",
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
    expect(repairPrompt).toContain(`the previous summary was ${firstSummary.length} characters, exceeding the hard limit of 900`);
    expect(repairPrompt).toContain("URL tokens that were not copied exactly from the source");
    expect(repairPrompt).toContain("Aim at or below 585 characters");
    expect(repairPrompt).toContain("Include at most two exact URL tokens");
    expect(repairPrompt).toContain("Omit commenter names, profile links, and optional detail");
    const firstOptions = bossMocks.generateGroqBossText.mock.calls[0]?.[2];
    const repairOptions = bossMocks.generateGroqBossText.mock.calls[1]?.[2];
    expect(firstOptions?.maxOutputTokens).toBe(1_024);
    expect(repairOptions?.maxOutputTokens).toBe(1_280);
    expect(repairOptions?.maxOutputTokens).toBeGreaterThanOrEqual(firstOptions?.maxOutputTokens ?? 0);
  });

  it("increases bounded output headroom after the provider exhausts the first generation budget", async () => {
    const source = "CANONICAL CASE MEMORY\n" + "Observed source facts and unresolved questions. ".repeat(45);
    const summary = "The source memory remains available for model-led research.";
    bossMocks.generateGroqBossText
      .mockResolvedValueOnce({
        model: "mock-boss-model",
        raw: null,
        error: "json_validate_failed: failedGenerationBudgetExhausted",
        attempts: [],
      })
      .mockResolvedValueOnce({
        model: "mock-boss-model",
        raw: JSON.stringify({ summary }),
        error: null,
        attempts: [],
      });

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 })).resolves.toBe(summary);

    const firstOptions = bossMocks.generateGroqBossText.mock.calls[0]?.[2];
    const repairOptions = bossMocks.generateGroqBossText.mock.calls[1]?.[2];
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(2);
    expect(firstOptions?.maxOutputTokens).toBe(1_024);
    expect(repairOptions?.maxOutputTokens).toBe(1_280);
    expect(repairOptions?.maxOutputTokens).toBeGreaterThan(firstOptions?.maxOutputTokens ?? Infinity);
  });

  it("accepts the 1,005-character recent-observation summary seen in the live case within the expanded bounded limit", async () => {
    const source = "COMPLETE SOURCE MEMORY\n" + "Observed facts, source-stage distinctions, and open questions. ".repeat(55);
    const summary = "S".repeat(1_005);
    bossMocks.generateGroqBossText.mockResolvedValueOnce({
      model: "mock-boss-model",
      raw: JSON.stringify({ summary }),
      error: null,
      attempts: [],
    });

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 1_200 })).resolves.toBe(summary);

    const prompt = String(bossMocks.generateGroqBossText.mock.calls[0]?.[1] ?? "");
    expect(prompt).toContain("hard limit of 1200 characters");
    expect(prompt).toContain("Aim at or below 780 characters");
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(1);
  });

  it("keeps intermediate multi-chunk summaries above the 900-character failure floor", async () => {
    const source = "CASE MEMORY START " + "x".repeat(12_500);
    const firstChunkSummary = "A".repeat(1_049);
    const secondChunkSummary = "B".repeat(800);
    const finalSummary = "The merged memory preserves the key facts and evidence-state distinctions.";
    bossMocks.generateGroqBossText
      .mockResolvedValueOnce({ model: "mock-boss-model", raw: JSON.stringify({ summary: firstChunkSummary }), error: null, attempts: [] })
      .mockResolvedValueOnce({ model: "mock-boss-model", raw: JSON.stringify({ summary: secondChunkSummary }), error: null, attempts: [] })
      .mockResolvedValueOnce({ model: "mock-boss-model", raw: JSON.stringify({ summary: finalSummary }), error: null, attempts: [] });

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 1_200 })).resolves.toBe(finalSummary);

    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(3);
    const firstPrompt = String(bossMocks.generateGroqBossText.mock.calls[0]?.[1] ?? "");
    const secondPrompt = String(bossMocks.generateGroqBossText.mock.calls[1]?.[1] ?? "");
    const finalPrompt = String(bossMocks.generateGroqBossText.mock.calls[2]?.[1] ?? "");
    expect(firstPrompt).toContain("hard limit of 1200 characters");
    expect(secondPrompt).toContain("hard limit of 1200 characters");
    expect(finalPrompt).toContain("MEMORY SEGMENT 1:");
    expect(finalPrompt).toContain("MEMORY SEGMENT 2:");
  });

  it("accepts a source URL followed by closing punctuation without normalizing bare colons", async () => {
    const sourceUrl = "https://source.example/posts/award-42";
    const source = "SOURCE_URL: " + sourceUrl + "\n" + "Observed case details remain in the complete durable source. ".repeat(25);
    const summary = `Observed award post. Source: ${sourceUrl}):`;
    bossMocks.generateGroqBossText.mockResolvedValueOnce({
      model: "mock-boss-model",
      raw: JSON.stringify({ summary }),
      error: null,
      attempts: [],
    });

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 })).resolves.toBe(summary);
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(1);
    expect(extractAiContextUrls(`${sourceUrl}):`)).toEqual([sourceUrl]);
    expect(extractAiContextUrls(`${sourceUrl}:`)).toEqual([`${sourceUrl}:`]);
  });

  it("treats JSON-escaped LF and CRLF sequences as URL field boundaries", () => {
    const sourceUrl = "https://source.example/records/ownership-42";
    expect(extractAiContextUrls(sourceUrl + String.raw`\nCheck the next field`)).toEqual([sourceUrl]);
    expect(extractAiContextUrls(sourceUrl + String.raw`\r\nNext field: additional context`)).toEqual([sourceUrl]);
  });

  it("fails closed when the model cannot produce required working memory", async () => {
    const source = "CANONICAL CASE MEMORY " + "Named source facts and unresolved questions. ".repeat(45);
    bossMocks.generateGroqBossText.mockRejectedValueOnce(new Error("mock provider unavailable"));

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 })).resolves.toBeNull();
    expect(bossMocks.generateGroqBossText).toHaveBeenCalledTimes(1);
  });

  it("treats each compaction input as a partial segment and preserves search-lead provenance", async () => {
    const sourceUrl = "https://registry.example/entities";
    const source = [
      "CURRENT CASE OBJECTIVE / ACTIVE BOSS SCOPE: Identify under-the-radar people with credible wealth potential and public professional routes.",
      "TRAJECTORY: a successful web search returned snippets and lead URLs, but no page was successfully fetched.",
      "LEAD_URLS: " + sourceUrl,
      "SEARCH RESULTS: " + "A search-result snippet contains a named entity and a possible role; this remains a lead until fetched. ".repeat(18),
    ].join("\n");
    const summary = "Search-only lead: a result snippet mentions a named entity and possible role; no page was fetched. URL: " + sourceUrl;
    bossMocks.generateGroqBossText.mockResolvedValueOnce({
      model: "mock-boss-model",
      raw: JSON.stringify({ summary }),
      error: null,
      attempts: [],
    });

    await expect(summarizeInvestigatorContextWithBoss({ rawContext: source, maxChars: 900 })).resolves.toBe(summary);

    const prompt = String(bossMocks.generateGroqBossText.mock.calls[0]?.[1] ?? "");
    expect(prompt).toContain("one chunk or segment of a larger case memory");
    expect(prompt).toContain("Never say that the human objective or approved scope was not provided");
    expect(prompt).toContain("unverified search leads");
    expect(prompt).toContain("successful visit/browser_fetch");
    expect(prompt).toContain("do not enumerate every name or URL");
    const options = bossMocks.generateGroqBossText.mock.calls[0]?.[2];
    expect(options?.maxOutputTokens).toBe(1_024);
    expect(options?.responseFormat).toMatchObject({
      type: "json_schema",
      json_schema: {
        strict: true,
        schema: {
          properties: { summary: { type: "string" } },
          required: ["summary"],
          additionalProperties: false,
        },
      },
    });
    expect((options?.responseFormat as any)?.json_schema?.schema?.properties?.summary).not.toHaveProperty("maxLength");
  });

});
