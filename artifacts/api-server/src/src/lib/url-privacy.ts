const SENSITIVE_URL_PARAMETER = /^(?:accesstoken|refreshtoken|idtoken|token|apikey|key|auth|authorization|clientsecret|secret|password|passwd|signature|sig|sessionid|jwt|code|accesskey|secretkey|privatekey|oauthaccesstoken|oauthrefreshtoken|bearertoken|authkey|securitytoken|awsaccesskeyid|xamzsignature|xamzcredential|xamzsecuritytoken|xgoogsignature|xgoogcredential|googleaccessid)$/i;

function isSensitiveUrlParameter(name: string): boolean {
  // Treat separator/case variations identically (e.g. X-Amz-Signature,
  // x_amz_signature, and xAmzSignature).
  return SENSITIVE_URL_PARAMETER.test(name.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

function redactParameters(input: URLSearchParams): URLSearchParams {
  const safe = new URLSearchParams();
  for (const [name, value] of input.entries()) {
    safe.append(name, isSensitiveUrlParameter(name) ? "[REDACTED]" : value);
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
    if (fragment) {
      // OAuth callback fragments may include a route before the query, e.g.
      // #/callback?access_token=... . Redact key/value segments in-place so
      // route prefixes survive and secrets are redacted wherever they occur.
      url.hash = fragment.replace(/(^|[&#?])([^=&#?]+)=([^&#]*)/g, (match, separator: string, name: string) =>
        isSensitiveUrlParameter(name) ? `${separator}${name}=[REDACTED]` : match,
      );
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


/**
 * Redacts URL credentials from free-form telemetry, observations and model-authored
 * text without changing non-URL prose. Keeps trailing punctuation outside the URL.
 */
export function sanitizeUrlsInText(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"'`]+/gi, (candidate) => {
    const trailing = candidate.match(/[),.;!?\]}]+$/)?.[0] ?? "";
    const rawUrl = trailing ? candidate.slice(0, -trailing.length) : candidate;
    return sanitizeUrlForEvidence(rawUrl) + trailing;
  });
}

/** Recursively sanitizes a value before it becomes observable or durable. */
export function sanitizeObservableValue<T>(value: T): T {
  if (typeof value === "string") return sanitizeUrlsInText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeObservableValue(item)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeObservableValue(item);
    }
    return output as T;
  }
  return value;
}
