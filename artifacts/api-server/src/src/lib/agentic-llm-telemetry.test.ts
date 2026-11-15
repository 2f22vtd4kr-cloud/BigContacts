import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushAgenticLlmUsageLedger, getAgenticLlmDailyTokenBudget, readGroqRateLimitHeaders, readGroqUsageMetrics, recordAgenticLlmAttempt, reserveAgenticLlmDailyBudget, resetAgenticLlmTelemetry } from "./agentic-llm-telemetry";

afterEach(() => {
  vi.restoreAllMocks();
  resetAgenticLlmTelemetry();
});

describe("Investigator LLM telemetry privacy", () => {
  it("attributes each physical attempt without logging target names", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      role: "investigator",
      capability: "groq-investigator-2",
      jobId: "job-123",
      caseId: 456,
      targetDigest: "0123456789abcdef",
      iteration: 7,
      decisionId: "fedcba9876543210",
      cognitiveTask: "ownership_research",
      model: "openai/gpt-oss-120b",
      promptChars: 120,
      status: 200,
      success: true,
      retryIndex: 1,
    });
    const line = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      role: "investigator",
      capability: "groq-investigator-2",
      jobId: "job-123",
      caseId: 456,
      targetDigest: "0123456789abcdef",
      iteration: 7,
      decisionId: "fedcba9876543210",
      cognitiveTask: "ownership_research",
    });
    expect(line).not.toContain("Alice Example");
  });

  it("captures provider-reported reasoning tokens without inventing missing usage", () => {
    expect(readGroqUsageMetrics({
      prompt_tokens: 3_565,
      completion_tokens: 509,
      total_tokens: 4_074,
      prompt_tokens_details: { cached_tokens: 120 },
      completion_tokens_details: { reasoning_tokens: 403 },
    })).toEqual({
      promptTokens: 3_565,
      completionTokens: 509,
      reasoningTokens: 403,
      totalTokens: 4_074,
      cachedPromptTokens: 120,
    });
    expect(readGroqUsageMetrics({ prompt_tokens: "3565", completion_tokens: -1 })).toEqual({});
    expect(readGroqUsageMetrics(null)).toEqual({});
  });

  it("normalizes only observed Groq token and request quota headers", () => {
    const headers = new Map<string, string>([
      ["x-ratelimit-remaining-tokens", "84500"],
      ["x-ratelimit-reset-tokens", "6.02s"],
      ["x-ratelimit-remaining-requests", "72"],
      ["x-ratelimit-reset-requests", "1m23.5s"],
      ["authorization", "Bearer should-never-be-read"],
    ]);
    expect(readGroqRateLimitHeaders({ get: (name) => headers.get(name) ?? null })).toEqual({
      rateLimitRemainingTokens: 84500,
      rateLimitResetTokensMs: 6020,
      rateLimitRemainingRequests: 72,
      rateLimitResetRequestsMs: 83500,
    });
    expect(readGroqRateLimitHeaders({ get: () => null })).toEqual({
      rateLimitRemainingTokens: null,
      rateLimitResetTokensMs: null,
      rateLimitRemainingRequests: null,
      rateLimitResetRequestsMs: null,
    });
  });

  it("instruments all three model roles with job, case, target-set and decision context", () => {
    const investigator = readFileSync(new URL("./agentic-web-research-core.ts", import.meta.url), "utf8");
    const boss = readFileSync(new URL("./groq-boss.ts", import.meta.url), "utf8");
    const rightHand = readFileSync(new URL("./groq-right-hand-reasoning.ts", import.meta.url), "utf8");
    const control = readFileSync(new URL("./atlas-control-decision.ts", import.meta.url), "utf8");
    expect(investigator).toContain("targetDigest: normalizedTarget");
    expect(investigator).toContain("priorTurnOffset + i + 1");
    expect(boss).toContain('role: "boss" as const');
    expect(boss).toContain("...telemetryContext");
    expect(rightHand).toContain('role: "right_hand" as const');
    expect(rightHand).toContain("...telemetryContext");
    expect(boss).toContain("readGroqRateLimitHeaders(response.headers)");
    expect(rightHand).toContain("readGroqRateLimitHeaders(response.headers)");
    expect(control).toContain("targetDigest, iteration: input.controlTurn, decisionId");
  });

  it("preserves allowlisted generic provider diagnostics", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 120,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: "json_validate_failed",
      providerErrorType: "tokens",
    });
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record.providerErrorCode).toBe("json_validate_failed");
    expect(record.providerErrorType).toBe("tokens");
  });

  it("hashes provider-controlled diagnostic text instead of writing it to logs", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const secretCode = "alice@example.com Authorization: Bearer PRIVATE_PROVIDER_DETAIL";
    const secretType = "contact notes and confidential research context";
    const longUntrustedLabel = "provider-private-field-".repeat(500);
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 2400,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: secretCode,
      providerErrorType: secretType,
      reason: longUntrustedLabel,
    });
    const line = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(line);
    for (const secret of ["alice@example.com", "PRIVATE_PROVIDER_DETAIL", "confidential research context", "provider-private-field-"]) {
      expect(line).not.toContain(secret);
    }
    expect(record.providerErrorCode).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.providerErrorType).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.reason).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(line.length).toBeLessThan(2000);
  });
  it("reconciles reserved tokens when a provider attempt is cancelled or mandatory audit capture fails", () => {
    const investigator = readFileSync(new URL("./agentic-web-research-core.ts", import.meta.url), "utf8");
    expect(investigator).toContain("const recordInterruptedAttempt = (reason: string) => recordAgenticLlmAttempt");
    const auditFailure = investigator.indexOf('recordInterruptedAttempt("model_prompt_audit_capture_failed")');
    const auditReturn = investigator.indexOf('return { model, raw: "", error: error.message }', auditFailure);
    const cancelled = investigator.indexOf('recordInterruptedAttempt("cancelled")');
    const cancelledThrow = investigator.indexOf('throw new Error("cancelled")', cancelled);
    expect(auditFailure).toBeGreaterThan(-1);
    expect(auditReturn).toBeGreaterThan(auditFailure);
    expect(cancelled).toBeGreaterThan(-1);
    expect(cancelledThrow).toBeGreaterThan(cancelled);
  });

  (process.env.DATABASE_URL ? it : it.skip)("releases an unused daily reservation after a cancelled preflight attempt", async () => {
    const [{ db, agenticLlmDailyUsageTable }, { and, eq }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const provider = "groq-test-ledger-release";
    const model = "openai/gpt-oss-20b-release-test";
    const usageDate = new Date().toISOString().slice(0, 10);
    const env = { ...process.env, APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv;
    const where = and(
      eq(agenticLlmDailyUsageTable.usageDate, usageDate),
      eq(agenticLlmDailyUsageTable.provider, provider),
      eq(agenticLlmDailyUsageTable.model, model),
    );
    await db.delete(agenticLlmDailyUsageTable).where(where);
    try {
      const reservation = await reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env });
      recordAgenticLlmAttempt({
        provider, role: "investigator", model, promptChars: 0, status: "error", success: false,
        retryIndex: 1, reason: "cancelled", providerRequestSent: false,
        dailyReservationDate: reservation.usageDate,
        dailyReservationTokens: reservation.reservedTokens,
        dailyBudgetTokens: reservation.dailyBudgetTokens,
        estimatedTokens: reservation.reservedTokens,
      });
      await flushAgenticLlmUsageLedger();
      const [released] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(released).toMatchObject({
        reservedTokens: 0, requestCount: 0, successCount: 0, failureCount: 0, estimatedTokens: 600,
      });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env }))
        .resolves.toMatchObject({ reservedTokens: 600, dailyBudgetTokens: 1000 });
    } finally {
      await db.delete(agenticLlmDailyUsageTable).where(where);
    }
  });

  (process.env.DATABASE_URL ? it : it.skip)("does not count a provider-rejected TPM 429 as daily token consumption", async () => {
    const [{ db, agenticLlmDailyUsageTable }, { and, eq }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const provider = "groq-test-ledger-tpm-rejection";
    const model = "openai/gpt-oss-20b-tpm-rejection-test";
    const usageDate = new Date().toISOString().slice(0, 10);
    const env = { ...process.env, APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv;
    const where = and(
      eq(agenticLlmDailyUsageTable.usageDate, usageDate),
      eq(agenticLlmDailyUsageTable.provider, provider),
      eq(agenticLlmDailyUsageTable.model, model),
    );
    await db.delete(agenticLlmDailyUsageTable).where(where);
    try {
      const reservation = await reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env });
      recordAgenticLlmAttempt({
        provider, role: "investigator", model, promptChars: 1_800, status: 429, success: false,
        retryIndex: 1, reason: "upstream_rate_limited", providerErrorType: "tokens",
        providerRequestSent: true, dailyReservationDate: reservation.usageDate,
        dailyReservationTokens: reservation.reservedTokens, dailyBudgetTokens: reservation.dailyBudgetTokens,
        estimatedTokens: reservation.reservedTokens,
      });
      await flushAgenticLlmUsageLedger();
      const [row] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(row).toMatchObject({
        requestCount: 1, successCount: 0, failureCount: 1, totalTokens: 0, reservedTokens: 0,
      });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env }))
        .resolves.toMatchObject({ reservedTokens: 600, dailyBudgetTokens: 1000 });
    } finally {
      await db.delete(agenticLlmDailyUsageTable).where(where);
    }
  });

  (process.env.DATABASE_URL ? it : it.skip)("charges the reserved estimate when a sent failed request has no provider usage metadata", async () => {
    const [{ db, agenticLlmDailyUsageTable }, { and, eq }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const provider = "groq-test-ledger-ambiguous-failure";
    const model = "openai/gpt-oss-20b-ambiguous-failure-test";
    const usageDate = new Date().toISOString().slice(0, 10);
    const env = { ...process.env, APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv;
    const where = and(
      eq(agenticLlmDailyUsageTable.usageDate, usageDate),
      eq(agenticLlmDailyUsageTable.provider, provider),
      eq(agenticLlmDailyUsageTable.model, model),
    );
    await db.delete(agenticLlmDailyUsageTable).where(where);
    try {
      const reservation = await reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env });
      recordAgenticLlmAttempt({
        provider, role: "investigator", model, promptChars: 1_800, status: 400, success: false,
        retryIndex: 1, reason: "provider_rejected", providerErrorCode: "invalid_request",
        providerRequestSent: true, dailyReservationDate: reservation.usageDate,
        dailyReservationTokens: reservation.reservedTokens, dailyBudgetTokens: reservation.dailyBudgetTokens,
        estimatedTokens: reservation.reservedTokens,
      });
      await flushAgenticLlmUsageLedger();
      const [row] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(row).toMatchObject({
        requestCount: 1, successCount: 0, failureCount: 1, promptTokens: 0,
        completionTokens: 0, totalTokens: 600, estimatedTokens: 600, reservedTokens: 0,
      });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 401, env }))
        .rejects.toMatchObject({ code: "daily_token_budget_exhausted" });
    } finally {
      await db.delete(agenticLlmDailyUsageTable).where(where);
    }
  });

  it("reads explicit per-model daily token budgets without assuming a provider free-tier limit", () => {
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-20b", {
      APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "120000",
      APEX_GROQ_DAILY_TOKEN_BUDGET: "90000",
    } as NodeJS.ProcessEnv)).toBe(120000);
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-120b", {
      APEX_GROQ_DAILY_TOKEN_BUDGET_120B: "45000",
      APEX_GROQ_DAILY_TOKEN_BUDGET: "90000",
    } as NodeJS.ProcessEnv)).toBe(45000);
    expect(getAgenticLlmDailyTokenBudget("openai/gpt-oss-120b", {} as NodeJS.ProcessEnv)).toBe(0);
  });

  (process.env.DATABASE_URL ? it : it.skip)("atomically reserves daily tokens and reconciles actual provider usage in PostgreSQL", async () => {
    const [{ db, agenticLlmDailyUsageTable }, { and, eq }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const provider = "groq-test-ledger";
    const model = "openai/gpt-oss-20b-ledger-test";
    const usageDate = new Date().toISOString().slice(0, 10);
    const env = { ...process.env, APEX_GROQ_DAILY_TOKEN_BUDGET_20B: "1000" } as NodeJS.ProcessEnv;
    const where = and(
      eq(agenticLlmDailyUsageTable.usageDate, usageDate),
      eq(agenticLlmDailyUsageTable.provider, provider),
      eq(agenticLlmDailyUsageTable.model, model),
    );
    await db.delete(agenticLlmDailyUsageTable).where(where);
    try {
      const concurrentReservations = await Promise.allSettled([
        reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env }),
        reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env }),
      ]);
      const successfulReservations = concurrentReservations.filter(
        (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reserveAgenticLlmDailyBudget>>> => result.status === "fulfilled",
      );
      const rejectedReservations = concurrentReservations.filter((result) => result.status === "rejected");
      expect(successfulReservations).toHaveLength(1);
      expect(rejectedReservations).toHaveLength(1);
      expect((rejectedReservations[0] as PromiseRejectedResult).reason).toMatchObject({ code: "daily_token_budget_exhausted" });
      const reservation = successfulReservations[0].value;
      expect(reservation).toMatchObject({ usageDate, reservedTokens: 600, dailyBudgetTokens: 1000 });
      const [reservedRow] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(reservedRow).toMatchObject({ reservedTokens: 600, dailyBudgetTokens: 1000, budgetExhausted: true });

      const output = vi.spyOn(console, "log").mockImplementation(() => {});
      recordAgenticLlmAttempt({
        provider,
        role: "investigator",
        model,
        promptChars: 1500,
        status: 200,
        success: true,
        retryIndex: 1,
        promptTokens: 450,
        completionTokens: 100,
        reasoningTokens: 42,
        totalTokens: 550,
        jobId: "ledger-job-1",
        caseId: 77,
        decisionId: "decision-1",
        iteration: 3,
        cognitiveTask: "target_research",
        dailyReservationDate: reservation.usageDate,
        dailyReservationTokens: reservation.reservedTokens,
        dailyBudgetTokens: reservation.dailyBudgetTokens,
        estimatedTokens: reservation.reservedTokens,
        providerRequestSent: true,
        rateLimitRemainingTokens: 84500,
        rateLimitResetTokensMs: 6020,
        rateLimitRemainingRequests: 72,
        rateLimitResetRequestsMs: 83500,
      });
      await flushAgenticLlmUsageLedger();
      const [row] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(row).toMatchObject({
        requestCount: 1,
        successCount: 1,
        failureCount: 0,
        promptTokens: 450,
        completionTokens: 100,
        reasoningTokens: 42,
        totalTokens: 550,
        lastJobId: "ledger-job-1",
        lastCaseId: 77,
        lastRole: "investigator",
        lastDecisionId: "decision-1",
        lastCognitiveTask: "target_research",
        lastIteration: 3,
        lastRequestSuccess: true,
        lastRequestAt: expect.any(Date),
        reservedTokens: 0,
        dailyBudgetTokens: 1000,
        budgetExhausted: true,
        lastRateLimitRemainingTokens: 84500,
        lastRateLimitResetTokensMs: 6020,
        lastRateLimitRemainingRequests: 72,
        lastRateLimitResetRequestsMs: 83500,
      });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 451, env }))
        .rejects.toMatchObject({ code: "daily_token_budget_exhausted" });
      expect(output).toHaveBeenCalled();
    } finally {
      await db.delete(agenticLlmDailyUsageTable).where(where);
    }
  });

});
