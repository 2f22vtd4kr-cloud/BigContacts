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
      const fragmentParameters = new URLSearchParams(fragment);
      if ([...fragmentParameters.keys()].some(isSensitiveUrlParameter)) {
        url.hash = redactParameters(fragmentParameters).toString();
      }
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
