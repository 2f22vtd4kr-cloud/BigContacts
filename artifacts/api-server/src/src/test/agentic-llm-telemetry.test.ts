import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const dbMocks = vi.hoisted(() => ({
  state: { reservedTokens: 0, totalTokens: 0, budgetTokens: 0 },
  writes: [] as Array<{ values: Record<string, unknown>; options: Record<string, unknown> }>,
  select: vi.fn(),
  execute: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: (...args: unknown[]) => dbMocks.select(...args),
    execute: (...args: unknown[]) => dbMocks.execute(...args),
    insert: (...args: unknown[]) => dbMocks.insert(...args),
  },
  agenticLlmDailyUsageTable: new Proxy({}, { get: (_target, key) => String(key) }),
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values }),
  and: (...values: unknown[]) => ({ and: values }),
  eq: (...values: unknown[]) => ({ eq: values }),
}));

import {
  flushAgenticLlmUsageLedger,
  getAgenticLlmDailyTokenBudget,
  getAgenticLlmTelemetry,
  recordAgenticLlmAttempt,
  reserveAgenticLlmDailyBudget,
  resetAgenticLlmTelemetry,
  readGroqRateLimitHeaders,
} from "../lib/agentic-llm-telemetry";

describe("Agentic LLM daily token accounting", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    resetAgenticLlmTelemetry();
    process.env.DATABASE_URL = "";
    dbMocks.state.reservedTokens = 0;
    dbMocks.state.totalTokens = 0;
    dbMocks.state.budgetTokens = 0;
    dbMocks.writes.length = 0;
    dbMocks.select.mockReset().mockImplementation(() => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }));
    dbMocks.execute.mockReset().mockImplementation(async (query: { values?: unknown[] }) => {
      await Promise.resolve();
      const estimated = Number(query.values?.[3] ?? 0);
      const budget = Number(query.values?.[4] ?? 0);
      if (dbMocks.state.totalTokens + dbMocks.state.reservedTokens + estimated > budget) return { rows: [] };
      dbMocks.state.reservedTokens += estimated;
      dbMocks.state.budgetTokens = budget;
      return { rows: [{ id: 1 }] };
    });
    dbMocks.insert.mockReset().mockImplementation(() => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async (options: Record<string, unknown>) => {
          dbMocks.writes.push({ values, options });
        },
      }),
    }));
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
  it("parses quota headers and reset durations without treating malformed values as zero", () => {
    const headers = new Map<string, string>([
      ["x-ratelimit-remaining-tokens", "0"],
      ["x-ratelimit-reset-tokens", "48s"],
      ["x-ratelimit-remaining-requests", "not-a-number"],
      ["x-ratelimit-reset-requests", ""],
    ]);
    expect(readGroqRateLimitHeaders({ get: (name) => headers.get(name) ?? null })).toEqual({
      rateLimitRemainingTokens: 0,
      rateLimitResetTokensMs: 48_000,
      rateLimitRemainingRequests: null,
      rateLimitResetRequestsMs: null,
    });
  });

  it("serializes concurrent daily reservations against one atomic shared balance", async () => {
    process.env.DATABASE_URL = "postgres://test.invalid/apex";
    const input = {
      provider: "groq",
      model: "openai/gpt-oss-20b",
      estimatedTokens: 600,
      env: { APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv,
    };
    const results = await Promise.allSettled([
      reserveAgenticLlmDailyBudget(input),
      reserveAgenticLlmDailyBudget(input),
      reserveAgenticLlmDailyBudget(input),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2);
    expect(dbMocks.state.reservedTokens).toBe(600);
    expect(dbMocks.execute).toHaveBeenCalledTimes(3);
    // A denied 600-token reservation must not mark the whole day exhausted:
    // 300 tokens still fit in the remaining 400-token capacity.
    await expect(reserveAgenticLlmDailyBudget({ ...input, estimatedTokens: 300 }))
      .resolves.toMatchObject({ reservedTokens: 300, dailyBudgetTokens: 1000 });
    expect(dbMocks.state.reservedTokens).toBe(900);
    expect(dbMocks.execute).toHaveBeenCalledTimes(4);
    const reservation = results.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reserveAgenticLlmDailyBudget>>> => result.status === "fulfilled");
    expect(reservation?.value.usageDate).toMatch(/^\\d{4}-\\d{2}-\\d{2}$/);
  });

  it("charges a conservative estimate when a sent provider rejection has no usage metadata", async () => {
    process.env.DATABASE_URL = "postgres://test.invalid/apex";
    const reservation = await reserveAgenticLlmDailyBudget({
      provider: "groq",
      model: "openai/gpt-oss-20b",
      estimatedTokens: 600,
      env: { APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv,
    });
    recordAgenticLlmAttempt({
      provider: "groq",
      role: "investigator",
      model: "openai/gpt-oss-20b",
      promptChars: 1000,
      status: 429,
      success: false,
      retryIndex: 0,
      estimatedTokens: 600,
      dailyReservationDate: reservation.usageDate,
      dailyReservationTokens: reservation.reservedTokens,
      dailyBudgetTokens: reservation.dailyBudgetTokens,
      providerRequestSent: true,
    });
    await flushAgenticLlmUsageLedger();
    const write = dbMocks.writes.find((item) => item.values.requestCount === 1);
    expect(write?.values).toMatchObject({ totalTokens: 600, reservedTokens: 0, requestCount: 1, failureCount: 1 });
    const reservedDelta = (write?.options.set as Record<string, { values?: unknown[] }> | undefined)?.reservedTokens;
    expect(reservedDelta?.values).toContain(600);
  });

  it("releases a reservation only for a request proven not to have reached the provider", async () => {
    process.env.DATABASE_URL = "postgres://test.invalid/apex";
    const reservation = await reserveAgenticLlmDailyBudget({
      provider: "groq",
      model: "openai/gpt-oss-20b",
      estimatedTokens: 600,
      env: { APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv,
    });
    recordAgenticLlmAttempt({
      provider: "groq",
      role: "investigator",
      model: "openai/gpt-oss-20b",
      promptChars: 1000,
      status: "error",
      success: false,
      retryIndex: 0,
      estimatedTokens: 600,
      dailyReservationDate: reservation.usageDate,
      dailyReservationTokens: reservation.reservedTokens,
      dailyBudgetTokens: reservation.dailyBudgetTokens,
      providerRequestSent: false,
    });
    await flushAgenticLlmUsageLedger();
    const write = dbMocks.writes.find((item) => item.values.requestCount === 0);
    expect(write?.values).toMatchObject({ totalTokens: 0, reservedTokens: 0, requestCount: 0, failureCount: 0 });
  });

});
