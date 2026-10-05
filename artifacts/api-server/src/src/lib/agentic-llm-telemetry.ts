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
  status: number | "error" | "timeout";
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedPromptTokens?: number;
  latencyMs?: number;
  retryIndex: number;
  reason?: string;
};

let attempts = 0;
let successes = 0;
let failed = 0;
let promptTokens = 0;
let cachedPromptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;
let latencyMs = 0;
const byModel = new Map<string, { attempts: number; successes: number; failed: number; promptTokens: number; cachedPromptTokens: number; completionTokens: number; totalTokens: number }>();

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
  const modelStats = byModel.get(event.model) ?? { attempts: 0, successes: 0, failed: 0, promptTokens: 0, cachedPromptTokens: 0, completionTokens: 0, totalTokens: 0 };
  modelStats.attempts += 1;
  if (event.success) modelStats.successes += 1; else modelStats.failed += 1;
  modelStats.promptTokens += event.promptTokens ?? 0;
  modelStats.cachedPromptTokens += event.cachedPromptTokens ?? 0;
  modelStats.completionTokens += event.completionTokens ?? 0;
  modelStats.totalTokens += event.totalTokens ?? ((event.promptTokens ?? 0) + (event.completionTokens ?? 0));
  byModel.set(event.model, modelStats);

  console.log(JSON.stringify({
    event: "apex_agentic_llm_attempt",
    provider: event.provider,
    model: event.model,
    promptChars: event.promptChars,
    status: event.status,
    success: event.success,
    promptTokens: event.promptTokens ?? null,
    cachedPromptTokens: event.cachedPromptTokens ?? null,
    completionTokens: event.completionTokens ?? null,
    totalTokens: event.totalTokens ?? null,
    latencyMs: event.latencyMs ?? null,
    retryIndex: event.retryIndex,
    reason: safeTelemetryReason(event.reason),
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
    byModel: Object.fromEntries([...byModel.entries()].map(([model, stats]) => [model, { ...stats }])),
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
  byModel.clear();
}
