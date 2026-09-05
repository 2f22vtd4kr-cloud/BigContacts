/**
 * In-process agentic LLM health.
 *
 * Agentic research is intentionally concurrent. A single failed provider step
 * must not erase a successful step from a sibling target and falsely declare
 * the whole Bureau dead. We therefore retain the timestamps of the latest
 * success/failure and treat a recent success as healthy while concurrent work
 * is still settling. This is telemetry, not a research decision.
 */
let lastOk: boolean | null = null;
let lastModel: string | null = null;
let lastError: string | null = null;
let lastSuccessAt = 0;
let lastFailureAt = 0;

const RECENT_SUCCESS_GRACE_MS = 30_000;

export function setAgenticLlmHealth(ok: boolean, model: string | null, error: string | null): void {
  const now = Date.now();
  if (ok) {
    lastOk = true;
    lastModel = model;
    lastError = null;
    lastSuccessAt = now;
    return;
  }

  lastFailureAt = now;
  lastError = error;
  // Do not let one concurrent failed step immediately overwrite a sibling's
  // successful provider result. If no recent success exists, expose failure.
  if (now - lastSuccessAt > RECENT_SUCCESS_GRACE_MS) {
    lastOk = false;
    lastModel = null;
  }
}

export function getAgenticLlmHealth(): {
  ok: boolean | null;
  model: string | null;
  error: string | null;
} {
  const recentSuccess = lastSuccessAt > 0 && Date.now() - lastSuccessAt <= RECENT_SUCCESS_GRACE_MS;
  if (recentSuccess) {
    return { ok: true, model: lastModel, error: lastError };
  }
  return { ok: lastOk, model: lastModel, error: lastError };
}

export function getAgenticLlmHealthTelemetry(): {
  lastSuccessAt: number;
  lastFailureAt: number;
  recentSuccessGraceMs: number;
} {
  return { lastSuccessAt, lastFailureAt, recentSuccessGraceMs: RECENT_SUCCESS_GRACE_MS };
}
