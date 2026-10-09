const SENSITIVE_URL_PARAMETER_NAME = "(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|apikey|key|auth|authorization|client[_-]?secret|secret|password|passwd|signature|sig|session(?:id|[_-]?id)?|jwt|code)";
const SENSITIVE_URL_PARAMETER = new RegExp("^" + SENSITIVE_URL_PARAMETER_NAME + "$", "i");
const SENSITIVE_FRAGMENT_PARAMETER = new RegExp("(^|[&#?])(" + SENSITIVE_URL_PARAMETER_NAME + "=)[^&#]*", "gi");

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
    // OAuth-style fragments can contain a route before the query (for example
    // #/callback?access_token=...). Redact secret parameters in-place so the
    // route and non-sensitive fragment state are preserved.
    if (fragment) {
      url.hash = fragment.replace(SENSITIVE_FRAGMENT_PARAMETER, (_match, separator: string, parameter: string) => `${separator}${parameter}[REDACTED]`);
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
  // Also sanitize links echoed by page content, redirect messages, or model
  // output even when those links were not supplied as a separate URL field.
  return safeText.replace(/https?:\/\/[^\s<>"'`]+/gi, (rawUrl) => sanitizeUrlForEvidence(rawUrl));
}
