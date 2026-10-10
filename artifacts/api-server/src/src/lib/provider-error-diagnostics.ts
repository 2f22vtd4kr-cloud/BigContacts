import { createHash } from "node:crypto";

export type ProviderFailureClass =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "request_size"
  | "provider_unavailable"
  | "not_found"
  | "http_error"
  | "invalid_response"
  | "timeout"
  | "network_error"
  | "cancelled";

export function digestDiagnosticText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function classifyProviderHttpStatus(status: number): ProviderFailureClass {
  if (status === 400) return "invalid_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  // HTTP 413 is an explicit request-size rejection, not quota exhaustion.
  if (status === 413) return "request_size";
  if (status >= 500) return "provider_unavailable";
  return "http_error";
}

type ProviderBodyShape = {
  bodyKind: "empty" | "json" | "text";
  topLevelKeys: string[];
  errorKeys: string[];
  errorCode: string | null;
  errorType: string | null;
  errorMessageChars: number;
  errorParam: string | null;
  errorStatus: string | null;
  errorMessageDigest: string | null;
  quotaSignals: string[];
};

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null;
}

export function providerErrorCode(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const error = record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? record.error as Record<string, unknown>
      : null;
    const explicitCode = safeString(error?.code) ?? safeString(record.code);
    const message = safeString(error?.message) ?? safeString(record.message) ?? "";
    // A provider may label a daily-quota response with the generic 429 code
    // "too_many_requests". The human-readable message is more specific and must
    // take precedence so we do not retry or model-hop an exhausted daily quota.
    if (/daily quota|quota.*(?:per day|daily)|(?:requests|request)\s+per\s+day|(?:daily|per-day).*?(?:request|rate)\s+(?:limit|quota)|free\s+tier.*(?:quota|limit|request)/i.test(message)) {
      return "quota_exceeded";
    }
    if (explicitCode) return explicitCode;
    return null;
  } catch {
    return null;
  }
}

export function summarizeProviderBody(body: string): ProviderBodyShape {
  if (!body) {
    return {
      bodyKind: "empty",
      topLevelKeys: [],
      errorKeys: [],
      errorCode: null,
      errorType: null,
      errorMessageChars: 0,
      errorParam: null,
      errorStatus: null,
      errorMessageDigest: null,
      quotaSignals: [],
    };
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        bodyKind: "json",
        topLevelKeys: [],
        errorKeys: [],
        errorCode: null,
        errorType: null,
        errorMessageChars: 0,
        errorParam: null,
        errorStatus: null,
        errorMessageDigest: null,
        quotaSignals: [],
      };
    }
    const record = parsed as Record<string, unknown>;
    const error = record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? record.error as Record<string, unknown>
      : null;
    const message = safeString(error?.message) ?? safeString(record.message);
    const param = safeString(error?.param) ?? safeString(record.param);
    const status = safeString(error?.status) ?? safeString(record.status);
    const details = Array.isArray(error?.details) ? error.details : [];
    const quotaSignals = details
      .filter((detail): detail is Record<string, unknown> => Boolean(detail) && typeof detail === "object" && !Array.isArray(detail))
      .flatMap((detail) => {
        const metadata = detail.metadata && typeof detail.metadata === "object" && !Array.isArray(detail.metadata)
          ? detail.metadata as Record<string, unknown>
          : {};
        return [
          safeString(detail.reason),
          safeString(detail.domain),
          safeString(metadata.quotaMetric),
          safeString(metadata.quotaId),
          safeString(metadata.quotaLimit),
          safeString(metadata.quotaLimitValue),
          safeString(metadata.limit),
        ].filter((value): value is string => Boolean(value));
      })
      .slice(0, 12);
    return {
      bodyKind: "json",
      topLevelKeys: Object.keys(record).sort().slice(0, 20),
      errorKeys: error ? Object.keys(error).sort().slice(0, 20) : [],
      errorCode: safeString(error?.code) ?? safeString(record.code),
      errorType: safeString(error?.type) ?? safeString(record.type),
      errorMessageChars: message?.length ?? 0,
      errorParam: param,
      errorStatus: status,
      errorMessageDigest: message ? digestDiagnosticText(message) : null,
      quotaSignals,
    };
  } catch {
    return {
      bodyKind: "text",
      topLevelKeys: [],
      errorKeys: [],
      errorCode: null,
      errorType: null,
      errorMessageChars: 0,
      errorParam: null,
      errorStatus: null,
      errorMessageDigest: null,
      quotaSignals: [],
    };
  }
}

export type ProviderThrownDiagnostic = {
  errorName: string;
  errorCode: string | null;
  errorErrno: string | number | null;
  errorSyscall: string | null;
  errorHostname: string | null;
  causeName: string | null;
  causeCode: string | null;
  causeErrno: string | number | null;
  causeSyscall: string | null;
  causeHostname: string | null;
  messageDigest: string | null;
  messageChars: number;
};

function diagnosticPart(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

/**
 * Persist only the classified shape and digest of an unexpected exception.
 * Raw provider/network messages may contain request details, endpoints or
 * provider response text and must not cross into durable job/UI projections.
 */
export function safeThrownErrorSummary(prefix: string, error: unknown): string {
  const diagnostic = describeThrownProviderError(error);
  return `${prefix} (class=${diagnostic.errorName}; code=${diagnostic.errorCode ?? "none"}; digest=${diagnostic.messageDigest ?? "none"})`;
}

export function describeThrownProviderError(error: unknown): ProviderThrownDiagnostic {
  const top = diagnosticPart(error);
  const cause = diagnosticPart(top?.cause);
  const message = error instanceof Error ? error.message : typeof top?.message === "string" ? top.message : "";
  return {
    errorName: error instanceof Error ? error.name : typeof top?.name === "string" ? top.name : "unknown",
    errorCode: typeof top?.code === "string" ? top.code : null,
    errorErrno: typeof top?.errno === "string" || typeof top?.errno === "number" ? top.errno : null,
    errorSyscall: typeof top?.syscall === "string" ? top.syscall : null,
    errorHostname: typeof top?.hostname === "string" ? top.hostname : null,
    causeName: typeof cause?.name === "string" ? cause.name : null,
    causeCode: typeof cause?.code === "string" ? cause.code : null,
    causeErrno: typeof cause?.errno === "string" || typeof cause?.errno === "number" ? cause.errno : null,
    causeSyscall: typeof cause?.syscall === "string" ? cause.syscall : null,
    causeHostname: typeof cause?.hostname === "string" ? cause.hostname : null,
    messageDigest: message ? digestDiagnosticText(message) : null,
    messageChars: message.length,
  };
}

export function isLocalProviderQuotaError(error: unknown): boolean { return error instanceof Error && error.name === "ProviderQuotaError"; }

export function classifyThrownProviderError(error: unknown, aborted = false): ProviderFailureClass {
  // The provider quota gate throws this locally before another HTTP request can
  // be attempted. Treat it as rate limiting, never as a transport failure that
  // could accidentally advance to another same-role model.
  if (error instanceof Error && error.name === "ProviderQuotaError") return "rate_limited";
  if (aborted) return "cancelled";
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return "timeout";
  return "network_error";
}