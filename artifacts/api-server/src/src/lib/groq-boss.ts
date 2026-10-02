import { logger } from "./logger";
import { classifyProviderHttpStatus, classifyThrownProviderError, providerErrorCode, summarizeProviderBody } from "./provider-error-diagnostics";

export const GROQ_BOSS_MODEL = "openai/gpt-oss-120b";
export const GROQ_BOSS_FALLBACK_MODELS = ["openai/gpt-oss-20b"] as const;
export const GROQ_BOSS_MODELS_API = "https://api.groq.com/openai/v1/models";
export const GROQ_BOSS_CHAT_API = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_BOSS_MODEL_PENDING = "groq-boss-pending";

export type GroqBossModelSelection = {
  model: string;
  status: "resolved" | "pending" | "unavailable";
  inspectedKeyCount: number;
  candidateCount: number;
  candidateModels?: string[];
  keyName?: string;
};

export type GroqBossAttemptDiagnostic = {
  model: string;
  keyName: string;
  httpStatus: number | null;
  providerErrorCode: string | null;
  failureClass: string | null;
};

export type GroqBossTextGenerationResult = {
  model: string;
  raw: string | null;
  error: string | null;
  attempts: GroqBossAttemptDiagnostic[];
};

export type GroqBossStatus = {
  configured: boolean;
  model: string;
  fallbackModels: string[];
  role: "head_investigator";
  capability: "text_generation_and_case_planning";
  webSearchGrounding: false;
  provider: "groq";
};

export type GroqBossLatencyConfig = {
  requestTimeoutMs: number;
  overallTimeoutMs: number;
  maximumPromptChars: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 90_000;
const MAX_REQUEST_TIMEOUT_MS = 60_000;
const MAX_OVERALL_TIMEOUT_MS = 180_000;
const MAX_PROMPT_CHARS = 20_000;
const MODEL_CATALOG_TIMEOUT_MS = 5_000;
const MAX_MODEL_ATTEMPTS = 2;
const MAX_503_RETRIES_PER_MODEL = 1;
const MAX_429_RETRIES_PER_MODEL = 1;

function boundedEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function getGroqBossLatencyConfig(): GroqBossLatencyConfig {
  return {
    requestTimeoutMs: boundedEnv("APEX_GROQ_BOSS_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS, 5_000, MAX_REQUEST_TIMEOUT_MS),
    overallTimeoutMs: boundedEnv("APEX_GROQ_BOSS_OVERALL_TIMEOUT_MS", DEFAULT_OVERALL_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, MAX_OVERALL_TIMEOUT_MS),
    maximumPromptChars: boundedEnv("APEX_GROQ_BOSS_MAX_PROMPT_CHARS", MAX_PROMPT_CHARS, 8_000, MAX_PROMPT_CHARS),
  };
}

function keys(): Array<{ name: string; key: string }> {
  return [
    "GROQ_API_KEY",
    ...Array.from({ length: 10 }, (_, i) => `GROQ_API_KEY_${i + 1}`),
  ].map((name) => ({ name, key: process.env[name]?.trim() ?? "" })).filter((entry) => entry.key.length > 0);
}

function normalizeModelName(value: string): string {
  return value.replace(/^models\//, "").trim();
}

function candidateModelsFromCatalog(payload: unknown): string[] {
  const models = payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
    ? (payload as { data: Array<{ id?: unknown }> }).data
    : [];
  const available = models.map((entry) => typeof entry?.id === "string" ? normalizeModelName(entry.id) : "").filter(Boolean);
  return [GROQ_BOSS_MODEL, ...GROQ_BOSS_FALLBACK_MODELS].filter((model, index, list) => available.includes(model) && list.indexOf(model) === index);
}

const selectionCache = new Map<string, { expiresAt: number; selection: GroqBossModelSelection }>();

function cacheKey(key: string): string {
  // Do not persist or log credentials; this is only an in-process lookup key.
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return String(hash >>> 0);
}

export async function resolveGroqBossModel(preferredKeyName?: string): Promise<GroqBossModelSelection> {
  const configured = keys();
  const ordered = preferredKeyName
    ? [...configured.filter((entry) => entry.name === preferredKeyName), ...configured.filter((entry) => entry.name !== preferredKeyName)]
    : configured;

  if (ordered.length === 0) {
    return { model: GROQ_BOSS_MODEL_PENDING, status: "pending", inspectedKeyCount: 0, candidateCount: 0 };
  }

  for (const entry of ordered) {
    const cached = selectionCache.get(cacheKey(entry.key));
    if (cached && cached.expiresAt > Date.now()) return cached.selection;
    try {
      const response = await fetch(GROQ_BOSS_MODELS_API, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${entry.key}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const candidates = candidateModelsFromCatalog(await response.json());
      if (candidates.length === 0) continue;
      const selection: GroqBossModelSelection = {
        model: candidates[0]!,
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: candidates.length,
        candidateModels: candidates,
        keyName: entry.name,
      };
      selectionCache.set(cacheKey(entry.key), { expiresAt: Date.now() + 5 * 60_000, selection });
      return selection;
    } catch {
      // Fail closed and inspect the next configured Groq credential.
    }
  }

  return {
    model: GROQ_BOSS_MODEL_PENDING,
    status: "unavailable",
    inspectedKeyCount: ordered.length,
    candidateCount: 0,
  };
}

function groqResponseFormat(input?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!input) return undefined;
  if (input.type === "json_schema") return input;
  const schema = input.schema;
  if (!schema || typeof schema !== "object") return { type: "json_object" };
  return {
    type: "json_schema",
    json_schema: {
      name: "apex_atlas_boss_control",
      strict: true,
      schema,
    },
  };
}

function normalizeReasoningEffort(value?: string): "low" | "medium" | "high" {
  if (value === "high" || value === "medium" || value === "low") return value;
  // Gemini's former "minimal" control setting has no GPT-OSS equivalent.
  return "low";
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choice = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
  return typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
}

function retryAfterMs(response: Response, fallback: number): number {
  const raw = response.headers.get("retry-after")?.trim();
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(10_000, Math.floor(seconds * 1_000));
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(10_000, Math.max(0, date - Date.now())) : fallback;
}

function trimPrompt(prompt: string, maximum: number): string {
  if (prompt.length <= maximum) return prompt;
  const head = Math.floor(maximum * 0.62);
  const tail = maximum - head;
  return `${prompt.slice(0, head)}\n\n[APEX CONTROL-CONTEXT TRUNCATED TO FIT GROQ FREE-TIER BUDGET]\n\n${prompt.slice(-tail)}`;
}

export function formatGroqBossAttemptSummary(attempts: GroqBossAttemptDiagnostic[]): string {
  return attempts.map((attempt) => `${attempt.model}=HTTP ${attempt.httpStatus ?? "none"}${attempt.providerErrorCode ? ` (${attempt.providerErrorCode})` : ""}`).join(", ");
}

export async function generateGroqBossText(
  selection: GroqBossModelSelection,
  prompt: string,
  options?: {
    responseFormat?: Record<string, unknown>;
    maxOutputTokens?: number;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  },
): Promise<GroqBossTextGenerationResult> {
  const configured = keys();
  const primary = configured.find((entry) => entry.name === selection.keyName);
  const ordered = primary ? [primary, ...configured.filter((entry) => entry.name !== primary.name)] : configured;
  if (ordered.length === 0) return { model: selection.model, raw: null, error: "GROQ_API_KEY is not configured.", attempts: [] };

  const config = getGroqBossLatencyConfig();
  const deadline = Date.now() + config.overallTimeoutMs;
  const candidates = [selection.model, ...(selection.candidateModels ?? []), ...GROQ_BOSS_FALLBACK_MODELS]
    .filter((model, index, list) => model && list.indexOf(model) === index)
    .slice(0, MAX_MODEL_ATTEMPTS);
  const boundedPrompt = trimPrompt(prompt, config.maximumPromptChars);
  const responseFormat = groqResponseFormat(options?.responseFormat);
  const attempts: GroqBossAttemptDiagnostic[] = [];
  let lastError = "Groq Boss returned no usable response.";

  for (const entry of ordered) {
    for (const model of candidates) {
      if (Date.now() >= deadline) break;
      let transient503Retries = 0;
      let rateLimitRetries = 0;

      while (Date.now() < deadline) {
        const controller = new AbortController();
        const timeout = Math.min(config.requestTimeoutMs, Math.max(1_000, deadline - Date.now()));
        const timer = setTimeout(() => controller.abort(), timeout);
        const body = JSON.stringify({
          model,
          messages: [{ role: "user", content: boundedPrompt }],
          max_completion_tokens: Math.min(options?.maxOutputTokens ?? 1536, 2_048),
          reasoning_effort: normalizeReasoningEffort(options?.thinkingLevel),
          include_reasoning: false,
          temperature: 0.1,
          stream: false,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        });

        try {
          const response = await fetch(GROQ_BOSS_CHAT_API, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${entry.key}`,
            },
            body,
            signal: controller.signal,
          });
          const responseBody = await response.text();

          if (response.status === 503 && transient503Retries < MAX_503_RETRIES_PER_MODEL && Date.now() < deadline) {
            transient503Retries += 1;
            const delay = Math.min(retryAfterMs(response, 750), Math.max(0, deadline - Date.now()));
            if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (response.status === 429 && rateLimitRetries < MAX_429_RETRIES_PER_MODEL && Date.now() < deadline) {
            const delay = retryAfterMs(response, 0);
            // Do not burn the Atlas control-plane budget waiting through a daily quota reset.
            if (delay > 0 && delay <= 2_500) {
              rateLimitRetries += 1;
              await new Promise((resolve) => setTimeout(resolve, Math.min(delay, Math.max(0, deadline - Date.now()))));
              continue;
            }
          }

          if (!response.ok) {
            const failureClass = classifyProviderHttpStatus(response.status);
            const code = providerErrorCode(responseBody);
            attempts.push({ model, keyName: entry.name, httpStatus: response.status, providerErrorCode: code, failureClass });
            lastError = `Groq Boss ${model} returned HTTP ${response.status}${code ? ` (${code})` : ""}: ${summarizeProviderBody(responseBody)}`;
            break;
          }

          const raw = extractText(JSON.parse(responseBody));
          if (raw) return { model, raw, error: null, attempts };
          lastError = `Groq Boss ${model} returned an empty control response.`;
          break;
        } catch (error) {
          const isAbort = error instanceof Error && error.name === "AbortError";
          const failureClass = classifyThrownProviderError(error, false);
          attempts.push({ model, keyName: entry.name, httpStatus: null, providerErrorCode: null, failureClass });
          lastError = isAbort
            ? `Groq Boss ${model} request exceeded its bounded timeout.`
            : error instanceof Error ? `Groq Boss ${model} request failed: ${error.message}` : "Groq Boss request failed.";
          logger.warn({ role: "groq_boss", phase: "request_failed", model, keyName: entry.name, failureClass }, "Groq Boss request failed");
          break;
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }

  return {
    model: selection.model,
    raw: null,
    error: `Groq Boss unavailable after bounded model/key attempts. ${lastError}. Attempts: ${formatGroqBossAttemptSummary(attempts)}.`,
    attempts,
  };
}

export function getGroqBossStatus(): GroqBossStatus {
  return {
    configured: keys().length > 0,
    model: GROQ_BOSS_MODEL,
    fallbackModels: [...GROQ_BOSS_FALLBACK_MODELS],
    role: "head_investigator",
    capability: "text_generation_and_case_planning",
    webSearchGrounding: false,
    provider: "groq",
  };
}

export async function runGroqBossReadiness(): Promise<{
  provider: "groq";
  configured: boolean;
  status: "ready" | "pending" | "unavailable";
  model: string;
  candidateModels: string[];
  httpStatus: number | null;
  error: string | null;
}> {
  const configured = keys();
  if (configured.length === 0) {
    return { provider: "groq", configured: false, status: "pending", model: GROQ_BOSS_MODEL_PENDING, candidateModels: [], httpStatus: null, error: "GROQ_API_KEY is not configured." };
  }
  for (const entry of configured) {
    try {
      const response = await fetch(GROQ_BOSS_MODELS_API, {
        headers: { Accept: "application/json", Authorization: `Bearer ${entry.key}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
      });
      const body = await response.text();
      if (!response.ok) {
        return { provider: "groq", configured: true, status: "unavailable", model: GROQ_BOSS_MODEL_PENDING, candidateModels: [], httpStatus: response.status, error: `Groq model catalog returned HTTP ${response.status}: ${summarizeProviderBody(body)}` };
      }
      const candidates = candidateModelsFromCatalog(JSON.parse(body));
      if (candidates.length > 0) {
        return { provider: "groq", configured: true, status: "ready", model: candidates[0]!, candidateModels: candidates, httpStatus: response.status, error: null };
      }
      return { provider: "groq", configured: true, status: "unavailable", model: GROQ_BOSS_MODEL_PENDING, candidateModels: [], httpStatus: response.status, error: "Groq catalog is reachable but neither the configured primary nor fallback Boss model is available." };
    } catch (error) {
      return { provider: "groq", configured: true, status: "unavailable", model: GROQ_BOSS_MODEL_PENDING, candidateModels: [], httpStatus: null, error: error instanceof Error ? error.message : "Groq model catalog request failed." };
    }
  }
  return { provider: "groq", configured: true, status: "unavailable", model: GROQ_BOSS_MODEL_PENDING, candidateModels: [], httpStatus: null, error: "No configured Groq credential produced a usable model catalog." };
}
