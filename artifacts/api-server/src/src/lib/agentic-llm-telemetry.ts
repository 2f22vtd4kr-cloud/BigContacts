/**
 * Low-overhead telemetry for Investigator LLM economics.
 * Never records prompts, completions, credentials, or source content.
 * Emits one structured log event per physical provider attempt and keeps
 * process-local counters for cheap post-run inspection.
 */

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
    status: event.status,
    success: event.success,
    promptTokens: event.promptTokens ?? null,
    cachedPromptTokens: event.cachedPromptTokens ?? null,
    completionTokens: event.completionTokens ?? null,
    totalTokens: event.totalTokens ?? null,
    latencyMs: event.latencyMs ?? null,
    retryIndex: event.retryIndex,
    reason: event.reason ?? null,
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
