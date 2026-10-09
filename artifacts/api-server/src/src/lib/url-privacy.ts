const SENSITIVE_URL_PARAMETER = /^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|apikey|key|auth|authorization|client[_-]?secret|secret|password|passwd|signature|sig|session(?:id|[_-]?id)?|jwt|code)$/i;

function redactParameters(input: URLSearchParams): URLSearchParams {
  const safe = new URLSearchParams();
  for (const [name, value] of input.entries()) {
    safe.append(name, SENSITIVE_URL_PARAMETER.test(name) ? "[REDACTED]" : value);
  }
  return safe;
}

/**
 * Sanitizes URL identity before it crosses into logs, model observations, or
 * durable evidence. Fetch callers keep their original URL in private execution
 * state; this helper is for the observable/displayed copy only.
 */
export function sanitizeUrlForEvidence(rawUrl: string, baseUrl?: string): string {
  try {
    const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "[non-http-url]";
    url.username = "";
    url.password = "";
    url.search = redactParameters(url.searchParams).toString();

    const fragment = url.hash.slice(1);
    if (fragment && /(?:^|[&#])(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|apikey|key|auth|authorization|client[_-]?secret|secret|password|passwd|signature|sig|session(?:id|[_-]?id)?|jwt|code)=/i.test(fragment)) {
      url.hash = redactParameters(new URLSearchParams(fragment)).toString();
    }
    return url.href;
  } catch {
    return "[invalid-url]";
  }
}

export function sanitizeUrlOccurrences(text: string, urls: readonly string[]): string {
  let safeText = text;
  for (const rawUrl of urls) {
    if (!rawUrl) continue;
    const safeUrl = sanitizeUrlForEvidence(rawUrl);
    if (safeUrl !== rawUrl) safeText = safeText.split(rawUrl).join(safeUrl);
  }
  return safeText;
}
