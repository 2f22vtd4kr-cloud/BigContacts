/**
 * Low-overhead telemetry for Investigator LLM economics.
 * Never records prompts, completions, credentials, or source content.
 * Emits one structured log event per physical provider attempt and keeps
 * process-local counters for cheap post-run inspection.
 */

import { createHash } from "node:crypto";

type Attempt = {
  provider: "groq" | "mistral" | string;
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
    providerErrorCode: event.providerErrorCode ?? null,
    providerErrorType: event.providerErrorType ?? null,
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
