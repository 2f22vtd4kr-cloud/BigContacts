import { request as httpsRequest } from "node:https";

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" || input instanceof URL ? String(input) : input.url;
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return false;
  const value = error as Error & { code?: unknown; cause?: unknown };
  const code = typeof value.code === "string" ? value.code : "";
  const cause = value.cause && typeof value.cause === "object" ? value.cause as { code?: unknown } : null;
  const causeCode = typeof cause?.code === "string" ? cause.code : "";
  const codes = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
    "UND_ERR_HEADERS_TIMEOUT",
  ]);
  return codes.has(code) || codes.has(causeCode);
}

/**
 * Gemini Interactions normally uses Node fetch/undici. If the pooled transport
 * fails before an HTTP response is received, retry the same request once through
 * a fresh native HTTPS connection. This is transport-only recovery: the Gemini
 * role still owns model selection, retry budgets, prompts, credentials, and all
 * research/control decisions.
 *
 * The native retry deliberately uses a fresh AbortController. Reusing the first
 * attempt's signal can leave the fresh socket with only the tail of the original
 * timeout budget after an undici connect/headers failure.
 */
export async function fetchGeminiInteractions(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (!isNetworkFailure(error) || init?.signal?.aborted) throw error;

    const url = new URL(requestUrl(input));
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    const body = typeof init?.body === "string" ? init.body : null;
    if (body === null) throw error;

    const fallbackController = new AbortController();
    const callerSignal = init?.signal;
    const relayAbort = () => fallbackController.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) throw error;
      callerSignal.addEventListener("abort", relayAbort, { once: true });
    }

    try {
      return await new Promise<Response>((resolve, reject) => {
        const request = httpsRequest(
          url,
          {
            method: init?.method ?? "GET",
            headers: Object.fromEntries(headers.entries()),
            signal: fallbackController.signal,
          },
          (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer | string) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            response.on("end", () => {
              const responseHeaders = new Headers();
              for (const [name, value] of Object.entries(response.headers)) {
                if (Array.isArray(value)) {
                  for (const item of value) responseHeaders.append(name, item);
                } else if (value != null) {
                  responseHeaders.set(name, value);
                }
              }
              resolve(new Response(Buffer.concat(chunks), {
                status: response.statusCode ?? 0,
                statusText: response.statusMessage ?? "",
                headers: responseHeaders,
              }));
            });
            response.on("error", reject);
          },
        );
        request.on("error", reject);
        request.end(body);
      });
    } finally {
      callerSignal?.removeEventListener("abort", relayAbort);
    }
  }
}
