/**
 * Low-overhead telemetry for Investigator LLM economics.
 * Never records prompts, completions, credentials, or source content.
 * Emits one structured log event per physical provider attempt and keeps
 * process-local counters for cheap post-run inspection.
 */

import { createHash } from "node:crypto";

type Attempt = {
  provider: "groq" | "mistral" | string;
  role?: "investigator" | "boss" | "right_hand" | "unknown";
  capability?: string | null;
  jobId?: string | null;
  caseId?: number | null;
  targetDigest?: string | null;
  iteration?: number | null;
  decisionId?: string | null;
  cognitiveTask?: string | null;
  model: string;
  promptChars: number;
  systemPromptChars?: number;
  userPromptChars?: number;
  totalPromptChars?: number;
  responseFormatChars?: number;
  totalRequestChars?: number;
  estimatedPromptTokens?: number;
  status: number | "error" | "timeout";
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  cachedPromptTokens?: number;
  latencyMs?: number;
  retryIndex: number;
  reason?: string;
  providerErrorCode?: string | null;
  providerErrorType?: string | null;
  rateLimitRemainingTokens?: number | null;
  rateLimitResetTokensMs?: number | null;
  rateLimitRemainingRequests?: number | null;
  rateLimitResetRequestsMs?: number | null;
  dailyReservationDate?: string | null;
  dailyReservationTokens?: number;
  dailyBudgetTokens?: number;
  estimatedTokens?: number;
  budgetExhausted?: boolean;
  providerRequestSent?: boolean;
};

let attempts = 0;
let successes = 0;
let failed = 0;
let promptTokens = 0;
let cachedPromptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;
let latencyMs = 0;

const SAFE_REASONS = new Set([
  "upstream_quota_exhausted", "upstream_rate_limited", "request_size", "provider_rejected",
  "empty_response", "exception", "timeout", "cancelled", "network_error", "rate_limited",
  "daily_token_budget_exhausted", "daily_usage_ledger_unavailable",
]);

const SAFE_PROVIDER_DIAGNOSTIC_LABELS = new Set([
  "bad_request", "billing_not_active", "context_length_exceeded", "deadline_exceeded",
  "failed_precondition", "forbidden", "insufficient_quota", "internal", "invalid_api_key",
  "invalid_argument", "invalid_json_schema", "invalid_request", "invalid_request_error",
  "json_validate_failed", "model_decommissioned", "model_not_found", "not_found",
  "permission_denied", "permission_error", "quota_exceeded", "rate_limit_error",
  "rate_limit_exceeded", "rate_limited", "resource_exhausted", "requests", "server_error",
  "too_many_requests", "tokens", "unauthenticated", "unauthorized", "unavailable",
  "unknown", "unsupported_parameter",
]);

export type AgenticLlmDailyReservation = {
  usageDate: string;
  reservedTokens: number;
  dailyBudgetTokens: number;
};

export class AgenticDailyTokenBudgetError extends Error {
  readonly code: "daily_token_budget_exhausted" | "daily_usage_ledger_unavailable";
  constructor(code: "daily_token_budget_exhausted" | "daily_usage_ledger_unavailable") {
    super(code);
    this.name = "AgenticDailyTokenBudgetError";
    this.code = code;
  }
}

/** Configure per-model daily ceilings from observed account limits; zero means no local ceiling. */
let dailyUsagePersistenceChain: Promise<void> = Promise.resolve();

/** Await queued writes before reading/reserving the same model's daily budget. */
export async function flushAgenticLlmUsageLedger(): Promise<void> {
  await dailyUsagePersistenceChain;
}

export function getAgenticLlmDailyTokenBudget(model: string, env: NodeJS.ProcessEnv = process.env): number {
  const suffix = /120b/i.test(model) ? "120B" : /20b/i.test(model) ? "20B" : "MODEL";
  const raw = env[`APEX_GROQ_DAILY_TOKEN_BUDGET_${suffix}`] ?? env.APEX_GROQ_DAILY_TOKEN_BUDGET;
  const value = Number(raw ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function parseObservedQuotaNumber(raw: string | null): number | null {
  if (raw == null || !raw.trim()) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function parseObservedQuotaDurationMs(raw: string | null): number | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds * 1_000);
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) return Math.max(0, timestamp - Date.now());
  const match = value.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i);
  if (!match || !match[1] && !match[2] && !match[3]) return null;
  return Math.floor((Number(match[1] ?? 0) * 3_600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)) * 1_000);
}

export type AgenticLlmUsageMetrics = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  cachedPromptTokens?: number;
};

/** Parse only numeric usage fields; reasoning tokens are a subset of completion tokens. */
export function readGroqUsageMetrics(usage: unknown): AgenticLlmUsageMetrics {
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return {};
  const value = usage as Record<string, unknown>;
  const promptDetails = value.prompt_tokens_details && typeof value.prompt_tokens_details === "object"
    ? value.prompt_tokens_details as Record<string, unknown>
    : {};
  const completionDetails = value.completion_tokens_details && typeof value.completion_tokens_details === "object"
    ? value.completion_tokens_details as Record<string, unknown>
    : {};
  const number = (raw: unknown): number | undefined =>
    typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : undefined;
  return {
    promptTokens: number(value.prompt_tokens),
    completionTokens: number(value.completion_tokens),
    reasoningTokens: number(completionDetails.reasoning_tokens) ?? number(value.reasoning_tokens),
    totalTokens: number(value.total_tokens),
    cachedPromptTokens: number(promptDetails.cached_tokens),
  };
}

export type AgenticLlmRateLimitHeaders = {
  rateLimitRemainingTokens: number | null;
  rateLimitResetTokensMs: number | null;
  rateLimitRemainingRequests: number | null;
  rateLimitResetRequestsMs: number | null;
};

/** Capture only allowlisted numeric Groq quota headers; never persist raw header text. */
export function readGroqRateLimitHeaders(headers: { get(name: string): string | null }): AgenticLlmRateLimitHeaders {
  return {
    rateLimitRemainingTokens: parseObservedQuotaNumber(headers.get("x-ratelimit-remaining-tokens")),
    rateLimitResetTokensMs: parseObservedQuotaDurationMs(headers.get("x-ratelimit-reset-tokens")),
    rateLimitRemainingRequests: parseObservedQuotaNumber(headers.get("x-ratelimit-remaining-requests")),
    rateLimitResetRequestsMs: parseObservedQuotaDurationMs(headers.get("x-ratelimit-reset-requests")),
  };
}

async function persistDailyUsageEvent(event: Attempt): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const [{ db, agenticLlmDailyUsageTable }, { sql }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const usageDate = event.dailyReservationDate || new Date().toISOString().slice(0, 10);
    const requestSent = event.providerRequestSent !== false;
    const reservationTokens = Math.max(0, Math.floor(event.dailyReservationTokens ?? 0));
    const prompt = Math.max(0, Math.floor(event.promptTokens ?? 0));
    const cached = Math.max(0, Math.floor(event.cachedPromptTokens ?? 0));
    const completion = Math.max(0, Math.floor(event.completionTokens ?? 0));
    const reasoning = Math.max(0, Math.floor(event.reasoningTokens ?? 0));
    const estimated = Math.max(0, Math.floor(event.estimatedTokens ?? 0));
    const totalFallback = requestSent && event.promptTokens == null && event.totalTokens == null ? estimated : (prompt + completion);
    const total = Math.max(0, Math.floor(event.totalTokens ?? totalFallback));
    const budget = Math.max(0, Math.floor(event.dailyBudgetTokens ?? 0));
    const table = agenticLlmDailyUsageTable;
    await db.insert(table).values({
      usageDate,
      provider: event.provider,
      model: event.model,
      requestCount: requestSent ? 1 : 0,
      successCount: requestSent && event.success ? 1 : 0,
      failureCount: requestSent && !event.success ? 1 : 0,
      promptTokens: prompt,
      cachedPromptTokens: cached,
      completionTokens: completion,
      reasoningTokens: reasoning,
      totalTokens: total,
      estimatedTokens: estimated,
      reservedTokens: 0,
      dailyBudgetTokens: budget,
      budgetExhausted: event.budgetExhausted === true,
      lastProviderStatus: String(event.status),
      lastProviderErrorCode: safeProviderDiagnosticLabel(event.providerErrorCode),
      lastJobId: event.jobId ?? null,
      lastCaseId: event.caseId ?? null,
      lastRole: event.role ?? "unknown",
      lastDecisionId: event.decisionId ?? null,
      lastCognitiveTask: event.cognitiveTask ?? null,
      lastIteration: event.iteration ?? null,
      lastRequestSuccess: event.success,
      lastRequestAt: new Date(),
      lastRateLimitRemainingTokens: event.rateLimitRemainingTokens == null ? null : Math.floor(event.rateLimitRemainingTokens),
      lastRateLimitResetTokensMs: event.rateLimitResetTokensMs == null ? null : Math.floor(event.rateLimitResetTokensMs),
      lastRateLimitRemainingRequests: event.rateLimitRemainingRequests == null ? null : Math.floor(event.rateLimitRemainingRequests),
      lastRateLimitResetRequestsMs: event.rateLimitResetRequestsMs == null ? null : Math.floor(event.rateLimitResetRequestsMs),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [table.usageDate, table.provider, table.model],
      set: {
        requestCount: sql`${table.requestCount} + ${requestSent ? 1 : 0}`,
        successCount: sql`${table.successCount} + ${requestSent && event.success ? 1 : 0}`,
        failureCount: sql`${table.failureCount} + ${requestSent && !event.success ? 1 : 0}`,
        promptTokens: sql`${table.promptTokens} + ${prompt}`,
        cachedPromptTokens: sql`${table.cachedPromptTokens} + ${cached}`,
        completionTokens: sql`${table.completionTokens} + ${completion}`,
        reasoningTokens: sql`${table.reasoningTokens} + ${reasoning}`,
        totalTokens: sql`${table.totalTokens} + ${total}`,
        estimatedTokens: sql`${table.estimatedTokens} + ${estimated}`,
        reservedTokens: sql`GREATEST(${table.reservedTokens} - ${reservationTokens}, 0)`,
        dailyBudgetTokens: budget > 0 ? budget : table.dailyBudgetTokens,
        budgetExhausted: sql`${table.budgetExhausted} OR ${event.budgetExhausted === true}`,
        lastProviderStatus: String(event.status),
        lastProviderErrorCode: safeProviderDiagnosticLabel(event.providerErrorCode),
        lastJobId: event.jobId ?? table.lastJobId,
        lastCaseId: event.caseId ?? table.lastCaseId,
        lastRole: event.role ?? table.lastRole,
        lastDecisionId: event.decisionId ?? table.lastDecisionId,
        lastCognitiveTask: event.cognitiveTask ?? table.lastCognitiveTask,
        lastIteration: event.iteration ?? table.lastIteration,
        lastRequestSuccess: event.success,
        lastRequestAt: new Date(),
        lastRateLimitRemainingTokens: event.rateLimitRemainingTokens == null ? table.lastRateLimitRemainingTokens : Math.floor(event.rateLimitRemainingTokens),
        lastRateLimitResetTokensMs: event.rateLimitResetTokensMs == null ? table.lastRateLimitResetTokensMs : Math.floor(event.rateLimitResetTokensMs),
        lastRateLimitRemainingRequests: event.rateLimitRemainingRequests == null ? table.lastRateLimitRemainingRequests : Math.floor(event.rateLimitRemainingRequests),
        lastRateLimitResetRequestsMs: event.rateLimitResetRequestsMs == null ? table.lastRateLimitResetRequestsMs : Math.floor(event.rateLimitResetRequestsMs),
        updatedAt: new Date(),
      },
    });
  } catch {
    // Usage persistence must never leak prompt/provider details or crash the
    // research loop. A configured daily budget fails closed at reservation time.
    console.warn(JSON.stringify({ event: "apex_agentic_llm_daily_usage_persist_failed", provider: event.provider, model: event.model }));
  }
}

/**
 * Atomically reserve the estimated prompt+completion allowance before a model
 * request. Provider-reported daily exhaustion is also sticky for the UTC day.
 */
async function reserveAgenticLlmDailyBudgetUnlocked(input: {
  provider: string;
  model: string;
  estimatedTokens: number;
  env?: NodeJS.ProcessEnv;
}): Promise<AgenticLlmDailyReservation> {
  await dailyUsagePersistenceChain;
  const usageDate = new Date().toISOString().slice(0, 10);
  const estimatedTokens = Math.max(0, Math.floor(input.estimatedTokens));
  const dailyBudgetTokens = getAgenticLlmDailyTokenBudget(input.model, input.env ?? process.env);
  if (!process.env.DATABASE_URL) {
    if (dailyBudgetTokens > 0) throw new AgenticDailyTokenBudgetError("daily_usage_ledger_unavailable");
    return { usageDate, reservedTokens: 0, dailyBudgetTokens: 0 };
  }
  try {
    const [{ db, agenticLlmDailyUsageTable }, { sql }] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const table = agenticLlmDailyUsageTable;
    // The atomic INSERT/ON CONFLICT reservation below is the source of truth.
    // A pre-read is both racy and unnecessary: the WHERE clause also rejects
    // rows already marked budget_exhausted.
    if (dailyBudgetTokens <= 0) return { usageDate, reservedTokens: 0, dailyBudgetTokens: 0 };
    if (estimatedTokens > dailyBudgetTokens) {
      // This request is too large for the configured ceiling; that does not
      // exhaust the day or prevent a smaller request from fitting.
      throw new AgenticDailyTokenBudgetError("daily_token_budget_exhausted");
    }
    const result = await db.execute(sql`
      INSERT INTO public.agentic_llm_daily_usage
        (usage_date, provider, model, reserved_tokens, daily_budget_tokens)
      VALUES
        (${usageDate}::date, ${input.provider}, ${input.model}, ${estimatedTokens}, ${dailyBudgetTokens})
      ON CONFLICT (usage_date, provider, model) DO UPDATE
        SET reserved_tokens = public.agentic_llm_daily_usage.reserved_tokens + EXCLUDED.reserved_tokens,
            daily_budget_tokens = EXCLUDED.daily_budget_tokens,
            updated_at = now()
        WHERE public.agentic_llm_daily_usage.budget_exhausted = false
          AND public.agentic_llm_daily_usage.total_tokens
              + public.agentic_llm_daily_usage.reserved_tokens
              + EXCLUDED.reserved_tokens <= EXCLUDED.daily_budget_tokens
      RETURNING id
    `);
    const rows = (result as { rows?: unknown[] }).rows ?? [];
    if (!rows.length) {
      // A rejected reservation does not mean the daily budget is exhausted:
      // a smaller later request may still fit the remaining capacity. Never
      // poison the durable budget_exhausted flag on a failed reservation.
      throw new AgenticDailyTokenBudgetError("daily_token_budget_exhausted");
    }
    return { usageDate, reservedTokens: estimatedTokens, dailyBudgetTokens };
  } catch (error) {
    if (error instanceof AgenticDailyTokenBudgetError) throw error;
    if (dailyBudgetTokens > 0) throw new AgenticDailyTokenBudgetError("daily_usage_ledger_unavailable");
    // Without a configured local ceiling, preserve the existing provider path if
    // the database is unavailable. The persistence warning remains visible.
    return { usageDate, reservedTokens: 0, dailyBudgetTokens: 0 };
  }
}


// Serialize reservations within one API process so local callers observe a
// deterministic reservation order. The INSERT/ON CONFLICT predicate remains
// the cross-process authority: concurrent API replicas cannot over-reserve.
let dailyReservationChain: Promise<void> = Promise.resolve();
export async function reserveAgenticLlmDailyBudget(input: {
  provider: string;
  model: string;
  estimatedTokens: number;
  env?: NodeJS.ProcessEnv;
}): Promise<AgenticLlmDailyReservation> {
  const previous = dailyReservationChain;
  let release!: () => void;
  dailyReservationChain = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await reserveAgenticLlmDailyBudgetUnlocked(input);
  } finally {
    release();
  }
}

/**
 * Provider error fields are untrusted response text. Keep known generic labels
 * useful for diagnostics; hash everything else so a provider cannot make logs
 * capture arbitrary prompt/source/contact material through error.code/error.type.
 * Hash input is bounded to avoid spending unbounded work on a malformed label.
 */
function safeProviderDiagnosticLabel(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length <= 64 && SAFE_PROVIDER_DIAGNOSTIC_LABELS.has(normalized)) return normalized;
  return `opaque:${createHash("sha256").update(normalized.slice(0, 512)).digest("hex").slice(0, 16)}`;
}

function safeTelemetryReason(reason: string | undefined): string | null {
  if (!reason) return null;
  if (SAFE_REASONS.has(reason)) return reason;
  return `opaque:${createHash("sha256").update(reason).digest("hex").slice(0, 16)}`;
}

export function recordAgenticLlmAttempt(event: Attempt): void {
  dailyUsagePersistenceChain = dailyUsagePersistenceChain.then(() => persistDailyUsageEvent(event));
  attempts += 1;
  if (event.success) successes += 1;
  else failed += 1;
  promptTokens += event.promptTokens ?? 0;
  cachedPromptTokens += event.cachedPromptTokens ?? 0;
  completionTokens += event.completionTokens ?? 0;
  totalTokens += event.totalTokens ?? ((event.promptTokens ?? 0) + (event.completionTokens ?? 0));
  latencyMs += event.latencyMs ?? 0;

  console.log(JSON.stringify({
    event: "apex_agentic_llm_attempt",
    provider: event.provider,
    role: event.role ?? "unknown",
    capability: event.capability ?? null,
    jobId: event.jobId ?? null,
    caseId: event.caseId ?? null,
    targetDigest: event.targetDigest ?? null,
    iteration: event.iteration ?? null,
    decisionId: event.decisionId ?? null,
    cognitiveTask: event.cognitiveTask ?? null,
    model: event.model,
    promptChars: event.promptChars,
    systemPromptChars: event.systemPromptChars ?? null,
    userPromptChars: event.userPromptChars ?? event.promptChars,
    totalPromptChars: event.totalPromptChars ?? ((event.systemPromptChars ?? 0) + (event.userPromptChars ?? event.promptChars)),
    responseFormatChars: event.responseFormatChars ?? null,
    totalRequestChars: event.totalRequestChars ?? ((event.totalPromptChars ?? ((event.systemPromptChars ?? 0) + (event.userPromptChars ?? event.promptChars))) + (event.responseFormatChars ?? 0)),
    estimatedPromptTokens: event.estimatedPromptTokens ?? null,
    status: event.status,
    success: event.success,
    promptTokens: event.promptTokens ?? null,
    cachedPromptTokens: event.cachedPromptTokens ?? null,
    completionTokens: event.completionTokens ?? null,
    reasoningTokens: event.reasoningTokens ?? null,
    totalTokens: event.totalTokens ?? null,
    latencyMs: event.latencyMs ?? null,
    retryIndex: event.retryIndex,
    reason: safeTelemetryReason(event.reason),
    providerErrorCode: safeProviderDiagnosticLabel(event.providerErrorCode),
    providerErrorType: safeProviderDiagnosticLabel(event.providerErrorType),
    rateLimitRemainingTokens: event.rateLimitRemainingTokens ?? null,
    rateLimitResetTokensMs: event.rateLimitResetTokensMs ?? null,
    rateLimitRemainingRequests: event.rateLimitRemainingRequests ?? null,
    rateLimitResetRequestsMs: event.rateLimitResetRequestsMs ?? null,
  }));
}

export function getAgenticLlmTelemetry() {
  return {
    attempts,
    successes,
    failed,
    promptTokens,
    cachedPromptTokens,
    completionTokens,
    totalTokens,
    latencyMs,
  };
}

export function resetAgenticLlmTelemetry(): void {
  attempts = 0;
  successes = 0;
  failed = 0;
  promptTokens = 0;
  cachedPromptTokens = 0;
  completionTokens = 0;
  totalTokens = 0;
  latencyMs = 0;
}
