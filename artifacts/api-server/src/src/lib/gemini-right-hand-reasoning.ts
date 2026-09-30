import { createHash } from "node:crypto";
import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { installGeminiTransientRetry } from "./gemini-transient-retry";
import { logger } from "./logger";
import { fetchGeminiInteractions } from "./gemini-interactions-transport";
import {
  classifyProviderHttpStatus,
  classifyThrownProviderError,
  describeThrownProviderError,
  summarizeProviderBody,
  providerErrorCode,
} from "./provider-error-diagnostics";

installGeminiTransientRetry();

/**
 * Right-hand model selection is capability-driven. We deliberately do not encode
 * a chronological Gemini fallback ladder here: Google's live model catalog is
 * the source of truth for what this credential can currently use.
 */
export const GEMINI_RIGHT_HAND_MODEL = "gemini-3.1-flash-lite";
export const GEMINI_RIGHT_HAND_FALLBACK_MODELS: readonly string[] = ["gemini-3.8-flash"];
const GEMINI_CHAT_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_INTERACTIONS_API = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 120_000;
const MIN_REQUEST_TIMEOUT_MS = 10_000;
const MAX_REQUEST_TIMEOUT_MS = 60_000;
const MIN_OVERALL_TIMEOUT_MS = 20_000;
const MAX_OVERALL_TIMEOUT_MS = 180_000;
const MAX_MODEL_ATTEMPTS = 2;
const MAX_TRANSIENT_TRANSPORT_RETRIES = 1;
const TRANSIENT_TRANSPORT_RETRY_DELAY_MS = 600;
const MAX_RATE_LIMIT_RETRIES = 1;
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 10_000;
const MAX_RATE_LIMIT_RETRY_DELAY_MS = 30_000;
const MIN_RATE_LIMIT_RETRY_DELAY_MS = 10;
function configuredRateLimitRetryDelayMs(): number {
  const parsed = Number(process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS);
  return Number.isFinite(parsed) ? Math.min(MAX_RATE_LIMIT_RETRY_DELAY_MS, Math.max(MIN_RATE_LIMIT_RETRY_DELAY_MS, Math.floor(parsed))) : DEFAULT_RATE_LIMIT_RETRY_DELAY_MS;
}
const MODEL_CATALOG_TIMEOUT_MS = 6_000;
const MODEL_CATALOG_CACHE_MS = 5 * 60_000;

type GeminiCatalogEntry = { name?: string; supportedGenerationMethods?: string[] };
let cachedModelChain: { expiresAt: number; models: string[]; credentialFingerprint: string } | null = null;

function credentialFingerprint(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

function boundedTimeoutEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function requestTimeoutMs(): number {
  return boundedTimeoutEnv("APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS, MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS);
}

function overallTimeoutMs(): number {
  const requestMs = requestTimeoutMs();
  return boundedTimeoutEnv("APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS", DEFAULT_OVERALL_TIMEOUT_MS, Math.max(MIN_OVERALL_TIMEOUT_MS, requestMs), MAX_OVERALL_TIMEOUT_MS);
}

export function getGeminiRightHandLatencyConfig(): { requestTimeoutMs: number; overallTimeoutMs: number } {
  return { requestTimeoutMs: requestTimeoutMs(), overallTimeoutMs: overallTimeoutMs() };
}

type GeminiRequestResult = { raw: string; error: string | null; model: string };
export type GeminiRightHandStatus = { configured: boolean; model: string; fallbackModels: string[]; endpoint: string; role: "right_hand_advisor"; capability: "case_file_reasoning_only" };
export type GeminiRightHandCaseReasoningResult = { status: "completed" | "unavailable"; model: string; actionId: string | null; decision: string | null; reason: string | null; confidence: number | null; error: string | null };
export type GeminiRightHandDiscoveryAdviceResult = { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null };
const RIGHT_HAND_KEY_ENV = "GEMINI_RIGHT_HAND_API_KEY";
function key(): string | null { return process.env[RIGHT_HAND_KEY_ENV]?.trim() || null; }

function modelVersion(name: string): [number, number] {
  const match = name.match(/gemini-(\d+)(?:\.(\d+))?/i);
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0)];
}

function modelRank(name: string): [number, number, number, number, string] {
  const normalized = name.toLowerCase();
  const [major, minor] = modelVersion(normalized);
  const family = normalized.includes("flash") && !normalized.includes("flash-lite") ? 0 : normalized.includes("flash-lite") ? 1 : 2;
  const lifecycle = normalized.includes("preview") || normalized.includes("experimental") ? 1 : 0;
  const specialized = /image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa/i.test(normalized) ? 1 : 0;
  return [family, specialized, lifecycle, major * 100 + minor, normalized];
}

function chooseRightHandModels(entries: GeminiCatalogEntry[]): string[] {
  const compatible = [...new Set(entries
    .filter((entry) => entry.name)
    .map((entry) => entry.name!.replace(/^models\//, ""))
    .filter((name) => /^gemini-/i.test(name))
    .filter((name) => /flash(?:-lite)?/i.test(name))
    .filter((name) => /^gemini-\d+(?:\.\d+)?-flash(?:-lite)?$/i.test(name))
    .filter((name) => !/image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa|preview|experimental/i.test(name))
    .sort((a, b) => {
      const left = modelRank(a); const right = modelRank(b);
      return left[0] - right[0] || left[1] - right[1] || left[2] - right[2] || right[3] - left[3] || left[4].localeCompare(right[4]);
    }))];

  // Flash-Lite remains the preferred low-cost control model. A stable
  // standard Flash model is allowed as a same-role Gemini fallback because
  // Gemini quotas are model-specific; Live/audio models are intentionally
  // excluded because Right-hand is a text/structured-output control role.
  const preferred = [
    GEMINI_RIGHT_HAND_MODEL,
    ...GEMINI_RIGHT_HAND_FALLBACK_MODELS,
  ];
  return [
    ...preferred.filter((model) => compatible.includes(model)),
    ...compatible.filter((model) => !preferred.includes(model)),
  ].slice(0, MAX_MODEL_ATTEMPTS);
}

async function resolveModelChain(): Promise<string[]> {
  const apiKey = key();
  if (!apiKey) return [];

  const fingerprint = credentialFingerprint(apiKey);
  if (cachedModelChain && cachedModelChain.credentialFingerprint === fingerprint && cachedModelChain.expiresAt > Date.now()) {
    return cachedModelChain.models.slice(0, MAX_MODEL_ATTEMPTS);
  }

  try {
    const response = await fetch(GEMINI_CHAT_API_BASE, {
      headers: { Accept: "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({
        role: "gemini_right_hand",
        phase: "model_catalog_failed",
        httpStatus: response.status,
      }, "Gemini Right-hand model catalog unavailable; failing closed because the live catalog is unavailable");
      return [];
    }
    const payload = await response.json() as { models?: GeminiCatalogEntry[] };
    const catalogModels = chooseRightHandModels(Array.isArray(payload.models) ? payload.models : []);
    if (catalogModels.length) {
      cachedModelChain = { expiresAt: Date.now() + MODEL_CATALOG_CACHE_MS, models: catalogModels, credentialFingerprint: fingerprint };
      logger.info({ role: "gemini_right_hand", phase: "model_catalog_resolved", preferredModel: GEMINI_RIGHT_HAND_MODEL, candidateCount: catalogModels.length, models: catalogModels }, "Gemini Right-hand model catalog resolved");
      return catalogModels.slice(0, MAX_MODEL_ATTEMPTS);
    }
    logger.warn({
      role: "gemini_right_hand",
      phase: "model_catalog_empty",
    }, "Gemini Right-hand model catalog returned no usable stable Flash-Lite candidates");
    return [];
  } catch (error) {
    logger.warn({
      role: "gemini_right_hand",
      phase: "model_catalog_rejected",
      errorName: error instanceof Error ? error.name : "unknown",
    }, "Gemini Right-hand model catalog request failed; failing closed without a hardcoded model ladder");
    return [];
  }
}
function extractJson(raw: string): Record<string, unknown> | null { const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(); const source = fenced || raw.trim(); const start = source.indexOf("{"), end = source.lastIndexOf("}"); if (start < 0 || end <= start) return null; try { const value = JSON.parse(source.slice(start, end + 1)); return value && typeof value === "object" ? value as Record<string, unknown> : null; } catch { return null; } }
function shouldFallback(status: number): boolean { return status === 403 || status === 404 || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504; }
function rateLimitRetryDelayMs(response: Response, remainingMs: number, errorCode: string | null): number {
  const retryAfter = response.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_RATE_LIMIT_RETRY_DELAY_MS, Math.max(0, Math.ceil(seconds * 1000)), remainingMs);
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) return Math.min(MAX_RATE_LIMIT_RETRY_DELAY_MS, Math.max(0, dateMs - Date.now()), remainingMs);
  }

  // Gemini documents too_many_requests as a short-period burst condition.
  // Give that subtype a longer bounded recovery window than the generic
  // rate-limit case so the retry does not immediately reproduce the burst.
  const fallbackDelayMs = errorCode === "too_many_requests"
    ? MAX_RATE_LIMIT_RETRY_DELAY_MS
    : configuredRateLimitRetryDelayMs();
  return Math.min(fallbackDelayMs, MAX_RATE_LIMIT_RETRY_DELAY_MS, Math.max(0, remainingMs));
}
function shouldRetry429(errorCode: string | null): boolean {
  // Gemini Interactions distinguishes burst/rate exhaustion from daily quota
  // exhaustion. Only the former is worth a bounded same-model retry.
  return errorCode !== "quota_exceeded";
}

function parseGeminiRightHandResponse(responseBody: string, model: string): GeminiRequestResult {
  try {
    const payload = JSON.parse(responseBody) as {
      output_text?: string;
      outputs?: Array<{ type?: string; text?: string | null }>;
      steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string | null }> }>;
    };
    const stepText = payload.steps
      ?.filter((step) => step.type === "model_output" || Array.isArray(step.content))
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === "text" || typeof part.text === "string")
      .map((part) => part.text ?? "")
      .join(" ")
      .trim();
    const raw = payload.output_text?.trim()
      || stepText
      || payload.outputs?.filter((output) => output.type === "text" || typeof output.text === "string")
        .map((output) => output.text ?? "").join(" ").trim()
      || "";
    if (raw) return { raw, error: null, model };
    return { raw: "", error: `Gemini Right-hand ${model} Interactions API returned an empty response.`, model };
  } catch {
    return { raw: "", error: `Gemini Right-hand ${model} Interactions API returned invalid JSON.`, model };
  }
}

async function request(system: string, user: string, responseFormat?: Record<string, unknown>): Promise<GeminiRequestResult> {
  const apiKey = key();
  if (!apiKey) return { raw: "", error: "GEMINI_RIGHT_HAND_API_KEY is not configured.", model: GEMINI_RIGHT_HAND_MODEL };
  // Right-hand is a text-only oversight role. One control turn must be one bounded
  // request to the configured model; model catalog probing and equivalent-model
  // fan-out consume free-tier request budget and are not research capabilities.
  // Resolve the live Gemini catalog for this credential. The preferred model
  // remains the low-cost Flash-Lite role; provider capacity/entitlement failures
  // may advance only through stable Flash-Lite candidates from the live catalog.
  // No Groq/Mistral substitution is permitted here.
  const resolvedChain = await resolveModelChain();
  const chain = resolvedChain.slice(0, MAX_MODEL_ATTEMPTS);
  if (chain.length === 0) {
    return { raw: "", error: "Gemini Right-hand has no compatible stable Flash-Lite model in the live catalog.", model: GEMINI_RIGHT_HAND_MODEL };
  }
  const failures: string[] = [];
  const configuredRequestTimeoutMs = requestTimeoutMs();
  const configuredOverallTimeoutMs = overallTimeoutMs();
  const deadline = Date.now() + configuredOverallTimeoutMs;
  const systemPrompt = `${apexOrientationCompact("right_hand")}\\n\\n${system}`;

  for (const model of chain) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return {
        raw: "",
        error: `Gemini Right-hand deadline exceeded after ${configuredOverallTimeoutMs}ms.`,
        model: chain[chain.length - 1] ?? GEMINI_RIGHT_HAND_MODEL,
      };
    }

    const body = JSON.stringify({
      model,
      input: `${systemPrompt}\\n\\nUSER REQUEST:\\n${user}`,
      generation_config: {
        max_output_tokens: 512,
        thinking_level: model === "gemini-3.8-flash" ? "low" : "minimal",
      },
      ...(responseFormat ? { response_format: responseFormat } : {}),
    });
    const requestPayloadBytes = Buffer.byteLength(body);
    const systemPromptBytes = Buffer.byteLength(systemPrompt);
    const userPromptBytes = Buffer.byteLength(user);
    const attemptStartedAt = Date.now();
    const attemptTimeoutMs = Math.min(configuredRequestTimeoutMs, remainingMs);
    let requestDeadlineFired = false;
    let overallDeadlineFired = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (remainingMs <= configuredRequestTimeoutMs) overallDeadlineFired = true;
      else requestDeadlineFired = true;
      controller.abort();
    }, attemptTimeoutMs);

    try {
      let response: Response;
      let transportRetry = 0;
      while (true) {
        try {
          response = await fetchGeminiInteractions(GEMINI_INTERACTIONS_API, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body,
            signal: controller.signal,
          });
          break;
        } catch (transportError) {
          const isAbort = transportError instanceof Error && transportError.name === "AbortError";
          const failureClass = classifyThrownProviderError(transportError, isAbort && !(requestDeadlineFired || overallDeadlineFired));
          const retryable = failureClass === "network_error"
            && transportRetry < MAX_TRANSIENT_TRANSPORT_RETRIES
            && Date.now() < deadline
            && !overallDeadlineFired;
          if (!retryable) throw transportError;
          transportRetry += 1;
          logger.warn({
            role: "gemini_right_hand",
            phase: "transient_transport_retry",
            model,
            retryNumber: transportRetry,
            maxRetries: MAX_TRANSIENT_TRANSPORT_RETRIES,
            failureClass,
            transportDiagnostic: describeThrownProviderError(transportError),
          }, "Gemini Right-hand retrying the same model after a transient transport failure");
          await new Promise<void>((resolve) => setTimeout(resolve, Math.min(TRANSIENT_TRANSPORT_RETRY_DELAY_MS, Math.max(0, deadline - Date.now()))));
          if (Date.now() >= deadline) throw transportError;
        }
      }
      const fetchElapsedMs = Date.now() - attemptStartedAt;
      let responseBody = await response.text();

      // Structured output is the primary JSON contract. If the provider returns
      // invalid_request on that contract, retry exactly once on the same model/key
      // with only response_format removed; local JSON validation remains mandatory.
      if (response.status === 400 && responseFormat && Date.now() < deadline) {
        const compatibilityBody = JSON.stringify({
          model,
          input: systemPrompt + "\n\nUSER REQUEST:\n" + user,
          generation_config: { max_output_tokens: 512, thinking_level: model === "gemini-3.8-flash" ? "low" : "minimal" },
        });
        const compatibilityController = new AbortController();
        const compatibilityTimeout = Math.min(requestTimeoutMs(), Math.max(1_000, deadline - Date.now()));
        const compatibilityTimer = setTimeout(() => compatibilityController.abort(), compatibilityTimeout);
        try {
          const compatibilityResponse = await fetchGeminiInteractions(GEMINI_INTERACTIONS_API, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: compatibilityBody,
            signal: compatibilityController.signal,
          });
          responseBody = await compatibilityResponse.text();
          logger.warn({
            role: "gemini_right_hand",
            phase: "structured_output_compatibility_retry",
            model,
            initialHttpStatus: 400,
            compatibilityHttpStatus: compatibilityResponse.status,
            compatibilityResponseShape: summarizeProviderBody(responseBody),
            compatibilityRequestPayloadBytes: Buffer.byteLength(compatibilityBody),
          }, "Gemini Right-hand retried same model without response_format after HTTP 400");
          if (compatibilityResponse.ok) return parseGeminiRightHandResponse(responseBody, model);
        } catch (compatibilityError) {
          logger.warn({
            role: "gemini_right_hand",
            phase: "structured_output_compatibility_retry_failed",
            model,
            errorName: compatibilityError instanceof Error ? compatibilityError.name : "unknown",
          }, "Gemini Right-hand compatibility retry failed");
        } finally {
          clearTimeout(compatibilityTimer);
        }
      }
      const totalElapsedMs = Date.now() - attemptStartedAt;
      const responseShape = summarizeProviderBody(responseBody);
      let providerErrorCodeValue = response.ok ? null : providerErrorCode(responseBody);
      let failureClass = response.ok ? null : classifyProviderHttpStatus(response.status);
      logger.info(
        {
          role: "gemini_right_hand",
          phase: "request_resolved",
          model,
          requestPayloadBytes,
          systemPromptBytes,
          userPromptBytes,
          configuredRequestTimeoutMs,
          configuredOverallTimeoutMs,
          attemptTimeoutMs,
          remainingMs,
          fetchElapsedMs,
          totalElapsedMs,
          httpStatus: response.status,
          responseBytes: Buffer.byteLength(responseBody),
          failureClass,
          providerErrorCode: providerErrorCodeValue,
          responseShape,
          requestDeadlineFired,
          overallDeadlineFired,
        },
        "Gemini Right-hand request resolved",
      );

      if (response.ok) return parseGeminiRightHandResponse(responseBody, model);

      if (response.status === 429) {
        // A burst/rate-limit 429 gets one bounded same-model retry first.
        // If that retry still fails, a different stable Gemini text model may
        // serve the same Right-hand role when the live catalog offers one.
        // Daily quota exhaustion never model-hops: another model cannot repair
        // a project/account quota condition.
        if (shouldRetry429(providerErrorCodeValue) && transportRetry < MAX_RATE_LIMIT_RETRIES && Date.now() < deadline) {
          const retryDelayMs = rateLimitRetryDelayMs(response, Math.max(0, deadline - Date.now()), providerErrorCodeValue);
          if (retryDelayMs > 0) {
            // The original request timer only bounds the original provider call.
            // It must not abort the bounded recovery sleep or the subsequent retry.
            clearTimeout(timer);
            transportRetry += 1;
            logger.warn(
              { role: "gemini_right_hand", phase: "rate_limit_backoff", model, retryNumber: transportRetry, maxRetries: MAX_RATE_LIMIT_RETRIES, retryDelayMs },
              "Gemini Right-hand rate limited; waiting before one bounded same-model retry",
            );
            await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
          }
          if (Date.now() < deadline) {
            const retryController = new AbortController();
            const retryAttemptTimeoutMs = Math.min(
              configuredRequestTimeoutMs,
              Math.max(1, deadline - Date.now()),
            );
            const retryTimer = setTimeout(() => retryController.abort(), retryAttemptTimeoutMs);
            try {
              response = await fetchGeminiInteractions(GEMINI_INTERACTIONS_API, {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey,
                },
                body,
                signal: retryController.signal,
              });
              responseBody = await response.text();
              providerErrorCodeValue = response.ok ? null : providerErrorCode(responseBody);
              failureClass = response.ok ? null : classifyProviderHttpStatus(response.status);
              logger.info({
                role: "gemini_right_hand",
                phase: "rate_limit_retry_resolved",
                model,
                httpStatus: response.status,
                providerErrorCode: providerErrorCodeValue,
              }, "Gemini Right-hand same-model rate-limit retry resolved");
            } catch (retryError) {
              const retryFailureClass = classifyThrownProviderError(
                retryError,
                retryError instanceof Error && retryError.name === "AbortError",
              );
              failures.push(`${model} rate_limit_retry_${retryFailureClass}`);
              return {
                raw: "",
                error: `Gemini Right-hand rate-limit retry failed: ${model} ${retryFailureClass}.`,
                model,
              };
            } finally {
              clearTimeout(retryTimer);
            }
          }
        }
        if (response.status === 429) {
          failures.push(`${model} rate_limited HTTP 429${providerErrorCodeValue ? ` ${providerErrorCodeValue}` : ""}`);
          const quotaNote = providerErrorCodeValue === "quota_exceeded"
            ? " Gemini reports daily quota exhaustion; model fallback would not repair a project quota."
            : "";
          if (providerErrorCodeValue === "quota_exceeded" || model !== chain[0]) {
            return {
              raw: "",
              error: `Gemini Right-hand rate limit persisted after bounded backoff: ${failures.join("; ")}.${quotaNote}`,
              model,
            };
          }
          failures.push(`${model} rate_limited HTTP 429${providerErrorCodeValue ? ` ${providerErrorCodeValue}` : ""}`);
          continue;
        }
      }
      failures.push(`${model} ${failureClass ?? "http_error"} HTTP ${response.status}`);
      if (!shouldFallback(response.status)) {
        return { raw: "", error: `Gemini API ${model} ${failureClass ?? "http_error"} HTTP ${response.status}.`, model };
      }
      if (response.status === 403) {
        logger.warn(
          { role: "gemini_right_hand", phase: "model_not_authorized", model, httpStatus: 403 },
          "Gemini Right-hand model is not authorized for this key; trying the next live catalog candidate",
        );
      }
      if (response.status === 404) cachedModelChain = null;
    } catch (error) {
      const fetchElapsedMs = Date.now() - attemptStartedAt;
      const isAbort = error instanceof Error && error.name === "AbortError";
      const deadlineTriggered = requestDeadlineFired || overallDeadlineFired;
      const failureClass = classifyThrownProviderError(error, isAbort && !deadlineTriggered);
      logger.warn(
        {
          role: "gemini_right_hand",
          phase: "request_rejected",
          model,
          requestPayloadBytes,
          systemPromptBytes,
          userPromptBytes,
          configuredRequestTimeoutMs,
          configuredOverallTimeoutMs,
          attemptTimeoutMs,
          remainingMs,
          fetchElapsedMs,
          httpStatus: null,
          responseBytes: 0,
          failureClass,
          requestDeadlineFired,
          overallDeadlineFired,
          abortReason: requestDeadlineFired ? "per_request_deadline" : overallDeadlineFired ? "overall_deadline" : null,
          errorName: error instanceof Error ? error.name : "unknown",
          transportDiagnostic: describeThrownProviderError(error),
        },
        "Gemini Right-hand request rejected",
      );
      failures.push(`${model} ${failureClass}`);
      if (failureClass !== "network_error" && failureClass !== "timeout") {
        return { raw: "", error: `Gemini Right-hand ${model} ${failureClass}.`, model };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (failures.some((failure) => /HTTP 404/.test(failure))) cachedModelChain = null;
  return {
    raw: "",
    error: chain.length
      ? `Gemini Right-hand exhausted bounded same-role model attempts: ${failures.join("; ")}`
      : "Gemini Right-hand has no compatible live catalog model available.",
    model: chain[chain.length - 1] ?? GEMINI_RIGHT_HAND_MODEL,
  };
}

function clip(value: string | null | undefined, maxChars = 360): string | null {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}
function clipStrings(values: readonly string[] | null | undefined, maxItems = 8, maxChars = 360): string[] {
  return (values ?? []).slice(0, maxItems).map((value) => clip(value, maxChars) ?? "");
}
function compactCase(file: ResearchCaseFile): string {
  const queued = file.actionQueue
    .filter((action) => action.status === "queued")
    .map((action) => ({
      id: action.id,
      title: action.title,
      purpose: clip(action.purpose, 280),
      specialistId: action.specialistId,
      priority: action.priority,
      rationale: clip(action.rationale, 280),
    }));
  const routes = file.contactRoutes.slice(0, 12).map((route) => ({
    rank: route.rank,
    vectorType: route.vectorType,
    value: clip(route.value, 180),
    personName: clip(route.personName, 120),
    role: clip(route.role, 120),
    state: route.state,
    sourceUrls: route.sourceUrls.slice(0, 2),
  }));
  const progress = file.investigationProgress
    ? {
        pendingVectors: file.investigationProgress.pendingVectors,
        foundPersonalCount: file.investigationProgress.foundPersonalCount,
        foundAnyCount: file.investigationProgress.foundAnyCount,
        coverageRatio: file.investigationProgress.coverageRatio,
        vectors: file.investigationProgress.vectors.map((vector) => ({
          id: vector.id,
          status: vector.status,
          values: vector.values.slice(0, 2).map((value) => clip(value, 140)),
          note: clip(vector.note, 180),
        })),
      }
    : null;
  const bossPlan = file.bossPlan
    ? {
        model: file.bossPlan.model,
        status: file.bossPlan.status,
        outcome: file.bossPlan.outcome,
        actionId: file.bossPlan.actionId,
        decision: clip(file.bossPlan.decision, 300),
        reason: clip(file.bossPlan.reason, 360),
        progressAssessment: clip(file.bossPlan.progressAssessment, 240),
        rightHandDisposition: file.bossPlan.rightHandDisposition,
        rightHandNote: clip(file.bossPlan.rightHandNote, 240),
      }
    : null;
  return JSON.stringify({
    target: file.target,
    hypotheses: clipStrings(file.hypotheses, 6),
    evidenceSummary: {
      sourceRegistries: clipStrings(file.evidenceSummary.sourceRegistries, 8, 180),
      discoveredPeople: clipStrings(file.evidenceSummary.discoveredPeople, 12, 180),
      relatedOrganizations: clipStrings(file.evidenceSummary.relatedOrganizations, 12, 180),
      evidenceCount: file.evidenceSummary.evidenceCount,
      searchGaps: clipStrings(file.evidenceSummary.searchGaps, 8),
      negativeFindings: clipStrings(file.evidenceSummary.negativeFindings, 8),
    },
    specialistRoster: file.specialistRoster.map((specialist) => ({
      id: specialist.id,
      title: specialist.title,
      status: specialist.status,
    })),
    actionQueue: queued,
    contactRoutes: routes,
    investigationProgress: progress,
    researchDepth: file.researchDepth,
    decisionLog: file.decisionLog.slice(-6).map((entry) => ({
      iteration: entry.iteration,
      decision: clip(entry.decision, 260),
      reason: clip(entry.reason, 320),
    })),
    rightHandAdvice: file.rightHandAdvice
      ? {
          status: file.rightHandAdvice.status,
          actionId: file.rightHandAdvice.actionId,
          decision: clip(file.rightHandAdvice.decision, 240),
          reason: clip(file.rightHandAdvice.reason, 300),
        }
      : null,
    bossPlan,
  }, null, 2);
}
function compactDiscovery(file: DiscoveryCaseFile): string {
  return JSON.stringify({
    humanBrief: {
      objective: clip(file.humanBrief.objective, 420),
      motivation: clip(file.humanBrief.motivation, 280),
      geography: clip(file.humanBrief.geography, 220),
      exclusions: clipStrings(file.humanBrief.exclusions, 8, 180),
    },
    bossPremise: clip(file.bossPremise, 420),
    investigationRules: clipStrings(file.investigationRules, 8, 240),
    candidateLanes: clipStrings(file.candidateLanes, 10, 180),
    initialResearch: {
      status: file.initialResearch.status,
      researchResponse: clip(file.initialResearch.researchResponse, 900),
      bossCommentary: clip(file.initialResearch.bossCommentary, 500),
      sourceUrls: file.initialResearch.sourceUrls.slice(0, 8),
    },
    investigatorReports: file.investigatorReports.slice(-6).map((report) => ({
      id: report.id,
      lane: report.lane,
      provider: report.provider,
      status: report.status,
      iteration: report.iteration,
      summary: clip(report.summary, 420),
      findings: clipStrings(report.findings, 8, 240),
      candidateNames: clipStrings(report.candidateNames, 8, 160),
      sourceUrls: report.sourceUrls.slice(0, 6),
      nextQuestions: clipStrings(report.nextQuestions, 6, 220),
      error: clip(report.error, 240),
    })),
    currentProgress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: clipStrings(file.currentProgress.completedLanes, 10, 120),
      openQuestions: clipStrings(file.currentProgress.openQuestions, 8, 240),
      lastReviewedBy: file.currentProgress.lastReviewedBy,
    },
    discoveredCandidates: file.discoveredCandidates.slice(0, 12).map((candidate) => ({
      name: candidate.name,
      type: candidate.type,
      relevance: clip(candidate.relevance, 280),
      reachability: clip(candidate.reachability, 220),
      sourceUrls: candidate.sourceUrls.slice(0, 3),
      state: candidate.state,
    })),
    orgFootprint: file.orgFootprint,
    decisionLog: file.decisionLog.slice(-6).map((entry) => ({
      iteration: entry.iteration,
      decision: clip(entry.decision, 260),
      reason: clip(entry.reason, 320),
    })),
  }, null, 2);
}
export function getGeminiRightHandStatus(): GeminiRightHandStatus { return { configured: Boolean(key()), model: GEMINI_RIGHT_HAND_MODEL, fallbackModels: [...GEMINI_RIGHT_HAND_FALLBACK_MODELS], endpoint: GEMINI_INTERACTIONS_API, role: "right_hand_advisor", capability: "case_file_reasoning_only" }; }
export async function runGeminiRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GeminiRightHandCaseReasoningResult> { const queued = input.file.actionQueue.filter((action) => action.status === "queued"); const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, use external research, or invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only."; const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nReturn {\"actionId\":\"exact queued action id\",\"decision\":\"short recommendation\",\"reason\":\"concrete case-file evidence-gap reason\",\"confidence\":0.0}.`; const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { actionId: { type: "string" }, decision: { type: "string" }, reason: { type: "string" }, confidence: { type: "number" } }, required: ["actionId", "decision", "reason", "confidence"] } }); if (result.error) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence: null, error: result.error }; const parsed = extractJson(result.raw); const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : ""; const action = queued.find((candidate) => candidate.id === actionId); const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : ""; const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : ""; const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null; if (!action || !decision || !reason) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence, error: `Gemini Right-hand ${result.model} returned an invalid or non-queued recommendation.` }; return { status: "completed", model: result.model, actionId: action.id, decision, reason, confidence, error: null }; }
export async function runGeminiRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GeminiRightHandDiscoveryAdviceResult> { const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied discovery case evidence. Never browse, use external research, or invent people, contacts, relationships, or URLs. Return JSON only."; const user = `Iteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {\"decision\":\"...\",\"reason\":\"...\",\"focusLanes\":[\"...\"],\"confidence\":0.0}.`; const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { decision: { type: "string" }, reason: { type: "string" }, focusLanes: { type: "array", items: { type: "string" } }, confidence: { type: "number" } }, required: ["decision", "reason", "focusLanes", "confidence"] } }); if (result.error) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error }; const parsed = extractJson(result.raw); if (!parsed) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: `Gemini Right-hand ${result.model} returned invalid discovery JSON.` }; return { status: "completed", model: result.model, decision: typeof parsed.decision === "string" ? parsed.decision : null, reason: typeof parsed.reason === "string" ? parsed.reason : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string") : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; }
export async function runGeminiRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs.", responseFormat?: Record<string, unknown>): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt, responseFormat ?? { type: "text", mime_type: "application/json", schema: { type: "object" } }); return result.raw ? { status: "completed", model: result.model, raw: result.raw, error: null } : { status: "unavailable", model: result.model, raw: null, error: result.error }; }
export async function runGeminiRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGeminiRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type GeminiRightHandResultAction = BureauAction;
