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

function isLikelyBossGeneration(init?: RequestInit): boolean {
  if (typeof init?.body !== "string") return false;
  try {
    const body = JSON.parse(init.body) as { generationConfig?: { maxOutputTokens?: number } };
    // Boss requests currently reserve the larger output budget (8192); the
    // Right-hand is deliberately bounded to 2048. This keeps the transport
    // fallback independent of the Boss implementation while preserving the
    // Right-hand's own explicit model chain and returned model identity.
    return Number(body.generationConfig?.maxOutputTokens ?? 0) >= 4096;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Google documents 429/503 as transient Gemini capacity failures. Right-hand
 * requests use bounded retry. Boss requests deliberately fail-fast after the
 * first capacity response so the Boss catalog loop can select the next
 * compatible/lower Gemini model instead of spending the whole budget retrying
 * a globally busy model.
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
