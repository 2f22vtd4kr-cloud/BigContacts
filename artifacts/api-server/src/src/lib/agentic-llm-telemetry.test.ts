import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushAgenticLlmUsageLedger, getAgenticLlmDailyTokenBudget, recordAgenticLlmAttempt, reserveAgenticLlmDailyBudget, resetAgenticLlmTelemetry } from "./agentic-llm-telemetry";

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
      const reservation = await reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 600, env });
      expect(reservation).toMatchObject({ usageDate, reservedTokens: 600, dailyBudgetTokens: 1000 });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 500, env }))
        .rejects.toMatchObject({ code: "daily_token_budget_exhausted" });

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
        totalTokens: 550,
        dailyReservationDate: reservation.usageDate,
        dailyReservationTokens: reservation.reservedTokens,
        dailyBudgetTokens: reservation.dailyBudgetTokens,
        dailyEstimatedTokens: reservation.reservedTokens,
        providerRequestSent: true,
      });
      await flushAgenticLlmUsageLedger();
      const [row] = await db.select().from(agenticLlmDailyUsageTable).where(where).limit(1);
      expect(row).toMatchObject({
        requestCount: 1,
        successCount: 1,
        failureCount: 0,
        promptTokens: 450,
        completionTokens: 100,
        totalTokens: 550,
        reservedTokens: 0,
        dailyBudgetTokens: 1000,
        budgetExhausted: true,
      });
      await expect(reserveAgenticLlmDailyBudget({ provider, model, estimatedTokens: 451, env }))
        .rejects.toMatchObject({ code: "daily_token_budget_exhausted" });
      expect(output).toHaveBeenCalled();
    } finally {
      await db.delete(agenticLlmDailyUsageTable).where(where);
    }
  });

});
