import { pgTable, serial, date, text, integer, boolean, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Durable per-UTC-day model usage ledger. It stores token counts and generic
 * provider quota state only; prompts, completions, targets and source content
 * are deliberately excluded.
 */
export const agenticLlmDailyUsageTable = pgTable("agentic_llm_daily_usage", {
  id: serial("id").primaryKey(),
  usageDate: date("usage_date").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  cachedPromptTokens: integer("cached_prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedTokens: integer("estimated_tokens").notNull().default(0),
  reservedTokens: integer("reserved_tokens").notNull().default(0),
  dailyBudgetTokens: integer("daily_budget_tokens").notNull().default(0),
  budgetExhausted: boolean("budget_exhausted").notNull().default(false),
  lastProviderStatus: text("last_provider_status"),
  lastProviderErrorCode: text("last_provider_error_code"),
  lastJobId: text("last_job_id"),
  lastCaseId: integer("last_case_id"),
  lastRole: text("last_role"),
  lastDecisionId: text("last_decision_id"),
  lastCognitiveTask: text("last_cognitive_task"),
  lastIteration: integer("last_iteration"),
  lastRequestSuccess: boolean("last_request_success"),
  lastRequestAt: timestamp("last_request_at", { withTimezone: true }),
  lastRateLimitRemainingTokens: integer("last_rate_limit_remaining_tokens"),
  lastRateLimitResetTokensMs: integer("last_rate_limit_reset_tokens_ms"),
  lastRateLimitRemainingRequests: integer("last_rate_limit_remaining_requests"),
  lastRateLimitResetRequestsMs: integer("last_rate_limit_reset_requests_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  modelDayUnique: uniqueIndex("agentic_llm_daily_usage_model_day_uidx").on(table.usageDate, table.provider, table.model),
  usageDateIdx: index("agentic_llm_daily_usage_date_idx").on(table.usageDate),
  nonNegativeTokens: check(
    "agentic_llm_daily_usage_nonnegative_tokens_ck",
    sql`${table.promptTokens} >= 0 AND ${table.completionTokens} >= 0 AND ${table.reasoningTokens} >= 0 AND ${table.totalTokens} >= 0 AND ${table.estimatedTokens} >= 0 AND ${table.reservedTokens} >= 0 AND ${table.dailyBudgetTokens} >= 0`,
  ),
}));
