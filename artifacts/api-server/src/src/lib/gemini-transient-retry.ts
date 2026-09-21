const GEMINI_API_HOST = "generativelanguage.googleapis.com";
const MAX_RETRIES = 0;
const RETRY_BASE_MS = 1_000;

type RetryFetch = typeof fetch & { __apexGeminiTransientRetry?: boolean };

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" || input instanceof URL ? String(input) : input.url;
}

function isGeminiGenerationRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === GEMINI_API_HOST && /\/models\/[^/]+:(generateContent|streamGenerateContent)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isLikelyBossGeneration(init?: RequestInit): boolean {
  if (typeof init?.body !== "string") return false;
  try {
    const body = JSON.parse(init.body) as { generationConfig?: { maxOutputTokens?: number } };
    // Gemini callers own bounded model fallback at the role boundary.
    // Transport-level retries would multiply latency and quota consumption.
    return Number(body.generationConfig?.maxOutputTokens ?? 0) >= 4096;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini role boundaries own their bounded model fallback. Do not add a second
 * transport retry loop here: identical transport retries can consume the act
 * deadline before the next model is tried.
 */
export function installGeminiTransientRetry(): void {
  const current = globalThis.fetch as RetryFetch;
  if (current.__apexGeminiTransientRetry) return;

  const wrapped = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (!isGeminiGenerationRequest(url)) return current(input, init);

    const bossRequest = isLikelyBossGeneration(init);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await current(input, init);
      if (response.status !== 429 && response.status !== 503) return response;
      if (bossRequest) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`Gemini Boss capacity response ${response.status}; advance to the next compatible model.`);
      }
      if (attempt >= MAX_RETRIES) return response;
      await response.body?.cancel().catch(() => undefined);
      await delay(RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 250));
    }

    throw new Error("Gemini transient retry loop exhausted unexpectedly.");
  }) as RetryFetch;

  wrapped.__apexGeminiTransientRetry = true;
  globalThis.fetch = wrapped;
}
