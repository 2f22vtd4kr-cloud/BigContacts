/** In-process agentic LLM health — shared by agentic loop and lanes honesty. */
let lastOk: boolean | null = null;
let lastModel: string | null = null;
let lastError: string | null = null;

export function setAgenticLlmHealth(ok: boolean, model: string | null, error: string | null): void {
  lastOk = ok;
  lastModel = model;
  lastError = error;
}

export function getAgenticLlmHealth(): {
  ok: boolean | null;
  model: string | null;
  error: string | null;
} {
  return { ok: lastOk, model: lastModel, error: lastError };
}
