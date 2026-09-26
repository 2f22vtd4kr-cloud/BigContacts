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

export function classifyThrownProviderError(error: unknown, aborted = false): ProviderFailureClass {
  if (aborted) return "cancelled";
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return "timeout";
  return "network_error";
}