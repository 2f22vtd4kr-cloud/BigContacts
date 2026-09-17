const GEMINI_API_HOST = "generativelanguage.googleapis.com";
const MAX_RETRIES = 2;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Google documents 429/503 as transient Gemini capacity failures and recommends
 * bounded exponential backoff. This wrapper keeps that transport concern out of
 * Bureau reasoning logic; it never changes prompts, models, providers, or the
 * research decision. Non-transient responses pass through untouched.
 */
export function installGeminiTransientRetry(): void {
  const current = globalThis.fetch as RetryFetch;
  if (current.__apexGeminiTransientRetry) return;

  const wrapped = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (!isGeminiGenerationRequest(url)) return current(input, init);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await current(input, init);
      if ((response.status !== 429 && response.status !== 503) || attempt >= MAX_RETRIES) return response;
      await response.body?.cancel().catch(() => undefined);
      await delay(RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 250));
    }

    throw new Error("Gemini transient retry loop exhausted unexpectedly.");
  }) as RetryFetch;

  wrapped.__apexGeminiTransientRetry = true;
  globalThis.fetch = wrapped;
}
