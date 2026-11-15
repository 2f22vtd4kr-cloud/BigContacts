import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  flushAgenticLlmUsageLedger,
  getAgenticLlmDailyTokenBudget,
  getAgenticLlmTelemetry,
  recordAgenticLlmAttempt,
  reserveAgenticLlmDailyBudget,
  resetAgenticLlmTelemetry,
} from "../lib/agentic-llm-telemetry";

describe("Agentic LLM daily token accounting", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    resetAgenticLlmTelemetry();
    process.env.DATABASE_URL = "";
  });

  afterEach(async () => {
    await flushAgenticLlmUsageLedger();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    vi.restoreAllMocks();
  });

  it("uses model-specific daily ceilings before the generic fallback", () => {
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-20b", {
      APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "12000",
      APEX_GROQ_DAILY_TOKEN_BUDGET_120B: "9000",
      APEX_GROQ_DAILY_TOKEN_BUDGET: "5000",
    } as NodeJS.ProcessEnv)).toBe(12000);
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-120b", {
      APEX_GROQ_DAILY_TOKEN_BUDGET_120B: "9000",
      APEX_GROQ_DAILY_TOKEN_BUDGET: "5000",
    } as NodeJS.ProcessEnv)).toBe(9000);
  });

  it("uses the generic daily ceiling only when a model-specific ceiling is absent and honors explicit zero", () => {
    expect(getAgenticLlmDailyTokenBudget("some/other-model", {
      APEX_GROQ_DAILY_TOKEN_BUDGET: "5000",
    } as NodeJS.ProcessEnv)).toBe(5000);
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-20b", {
      APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "0",
      APEX_GROQ_DAILY_TOKEN_BUDGET: "5000",
    } as NodeJS.ProcessEnv)).toBe(0);
  });

  it("fails closed when a daily ceiling is configured but the durable ledger is unavailable", async () => {
    await expect(reserveAgenticLlmDailyBudget({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      estimatedTokens: 1000,
      env: { APEX_GROQ_DAILY_TOKEN_BUDGET_120B: "10000" } as NodeJS.ProcessEnv,
    })).rejects.toMatchObject({ code: "daily_usage_ledger_unavailable" });
  });

  it("records physical provider attempts without retaining prompt or completion text", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      role: "investigator",
      model: "openai/gpt-oss-20b",
      promptChars: 1200,
      systemPromptChars: 800,
      userPromptChars: 400,
      totalPromptChars: 1200,
      responseFormatChars: 900,
      totalRequestChars: 2100,
      estimatedPromptTokens: 618,
      status: 200,
      success: true,
      promptTokens: 300,
      completionTokens: 120,
      totalTokens: 420,
      retryIndex: 0,
      providerRequestSent: true,
    });
    await flushAgenticLlmUsageLedger();
    expect(getAgenticLlmTelemetry()).toMatchObject({
      attempts: 1,
      successes: 1,
      failed: 0,
      promptTokens: 300,
      completionTokens: 120,
      totalTokens: 420,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(payload).not.toHaveProperty("prompt");
    expect(payload).not.toHaveProperty("completion");
    expect(payload).toMatchObject({
      provider: "groq",
      role: "investigator",
      model: "openai/gpt-oss-20b",
      systemPromptChars: 800,
      userPromptChars: 400,
      totalPromptChars: 1200,
      responseFormatChars: 900,
      totalRequestChars: 2100,
      estimatedPromptTokens: 618,
    });
  });
});
