import { beforeEach, describe, expect, it, vi } from "vitest";

const rightHandMock = vi.hoisted(() => ({
  runGroqRightHandFreeJson: vi.fn(),
}));

vi.mock("./groq-right-hand-reasoning", () => ({
  GROQ_RIGHT_HAND_MAX_PROMPT_CHARS: 20_000,
  runGroqRightHandFreeJson: rightHandMock.runGroqRightHandFreeJson,
}));

import { summarizeInvestigatorContextWithAiCompactor } from "./ai-investigation-context-compaction";
import { runGroqRightHandFreeJson } from "./groq-right-hand-reasoning";

const mockedRun = vi.mocked(runGroqRightHandFreeJson);

describe("AI memory compaction model-scoped recovery", () => {
  beforeEach(() => {
    mockedRun.mockReset();
  });

  it("recovers a 20B TPM throttle once on the same-role 120B model", async () => {
    const summary = "The source contains unverified search leads; no page was fetched.";
    mockedRun
      .mockResolvedValueOnce({
        status: "unavailable",
        model: "openai/gpt-oss-20b",
        raw: null,
        error: 'Groq Right-hand exhausted bounded attempts: {"rateLimitKind":"tokens","body":{"message":"Rate limit reached on tokens per minute (TPM)"}}',
      })
      .mockResolvedValueOnce({
        status: "completed",
        model: "openai/gpt-oss-120b",
        raw: JSON.stringify({ summary }),
        error: null,
      });

    const result = await summarizeInvestigatorContextWithAiCompactor({
      rawContext: "CASE MEMORY\n" + "Observed but unverified context. ".repeat(45),
      maxChars: 900,
      jobId: "compaction-tpm-recovery",
      caseId: 17,
    });

    expect(result).toBe(summary);
    expect(mockedRun).toHaveBeenCalledTimes(2);
    expect(mockedRun.mock.calls[0]?.[5]).toMatchObject({
      preferredModel: "openai/gpt-oss-20b",
      allowModelFallback: false,
    });
    expect(mockedRun.mock.calls[1]?.[5]).toMatchObject({
      preferredModel: "openai/gpt-oss-120b",
      allowModelFallback: false,
    });
  });

  it("does not use the 120B recovery path for a daily token cap", async () => {
    mockedRun.mockResolvedValueOnce({
      status: "unavailable",
      model: "openai/gpt-oss-20b",
      raw: null,
      error: 'Groq Right-hand exhausted bounded attempts: {"rateLimitKind":"tokens","body":{"message":"tokens per day (TPD) quota exhausted"}}',
    });

    const result = await summarizeInvestigatorContextWithAiCompactor({
      rawContext: "CASE MEMORY\n" + "Observed but unverified context. ".repeat(45),
      maxChars: 900,
      jobId: "compaction-daily-cap",
      caseId: 18,
    });

    expect(result).toBeNull();
    expect(mockedRun).toHaveBeenCalledTimes(1);
  });
});
