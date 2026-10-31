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
  status: number | "error" | "timeout";
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
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
    status: event.status,
    success: event.success,
    promptTokens: event.promptTokens ?? null,
    cachedPromptTokens: event.cachedPromptTokens ?? null,
    completionTokens: event.completionTokens ?? null,
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
