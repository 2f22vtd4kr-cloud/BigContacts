import { createHash } from "node:crypto";

export type ProviderFailureClass =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
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
};

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null;
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
      };
    }
    const record = parsed as Record<string, unknown>;
    const error = record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? record.error as Record<string, unknown>
      : null;
    const message = safeString(error?.message) ?? safeString(record.message);
    return {
      bodyKind: "json",
      topLevelKeys: Object.keys(record).sort().slice(0, 20),
      errorKeys: error ? Object.keys(error).sort().slice(0, 20) : [],
      errorCode: safeString(error?.code) ?? safeString(record.code),
      errorType: safeString(error?.type) ?? safeString(record.type),
      errorMessageChars: message?.length ?? 0,
    };
  } catch {
    return {
      bodyKind: "text",
      topLevelKeys: [],
      errorKeys: [],
      errorCode: null,
      errorType: null,
      errorMessageChars: 0,
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

export function classifyThrownProviderError(error: unknown, aborted = false): ProviderFailureClass {
  if (aborted) return "cancelled";
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return "timeout";
  return "network_error";
}