import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const SAFE_REQUEST_KEYS = new Set([
  "include_reasoning",
  "max_completion_tokens",
  "max_tokens",
  "messages",
  "model",
  "reasoning_effort",
  "reasoning_format",
  "response_format",
  "seed",
  "stop",
  "stream",
  "temperature",
  "tool_choice",
  "tools",
  "top_p",
]);
const SAFE_MESSAGE_ROLES = new Set(["system", "user", "assistant", "tool"]);
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LABELED_PHONE = /(\b(?:phone|telephone|mobile|cell|fax|tel)(?:\s*(?:number|no\.?|#))?\b["']?\s*(?::|=|is)\s*["']?)(\+?[\d(][\d\s().-]{5,}\d)/gi;
const INTERNATIONAL_PHONE = /(?:\+|00)\d[\d().\s-]{5,}\d/g;
const NORTH_AMERICAN_PHONE = /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g;

type AuditEnvironment = {
  NODE_ENV?: string;
  APEX_CAPTURE_MODEL_PROMPTS?: string;
  APEX_MODEL_AUDIT_FILE?: string;
};

type AuditInput = {
  provider: string;
  role: "groq_boss" | "groq_right_hand" | "groq_investigator";
  model: string;
  attempt?: number;
  jobId?: string | null;
  caseId?: number | null;
  requestBody: Record<string, unknown>;
};

type AuditWriter = (path: string, contents: string) => unknown;

function redactContactDetails(content: string): string {
  return content
    .replace(EMAIL_ADDRESS, "[REDACTED_EMAIL]")
    .replace(LABELED_PHONE, "$1[REDACTED_PHONE]")
    .replace(INTERNATIONAL_PHONE, "[REDACTED_PHONE]")
    .replace(NORTH_AMERICAN_PHONE, "[REDACTED_PHONE]");
}

function safeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const safe = Object.fromEntries(
    Object.entries(body).filter(([key]) => SAFE_REQUEST_KEYS.has(key)),
  );
  if (Array.isArray(body.messages)) {
    safe.messages = body.messages.slice(0, 16).map((message) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return { role: "other", content: `[omitted ${typeof message}]` };
      }
      const record = message as Record<string, unknown>;
      const role = typeof record.role === "string" && SAFE_MESSAGE_ROLES.has(record.role)
        ? record.role
        : "other";
      return {
        role,
        content: typeof record.content === "string"
          ? redactContactDetails(record.content)
          : `[omitted non-text content: ${record.content === null ? "null" : typeof record.content}]`,
      };
    });
  }
  return safe;
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
}

/**
 * Opt-in development trace of the model request body, excluding HTTP headers,
 * non-allowlisted fields, and direct email/phone contact values. Reasoning
 * output remains disabled in the provider request and is not logged.
 */
export function emitModelPromptAudit(
  input: AuditInput,
  env: AuditEnvironment = process.env,
  write: AuditWriter = appendFileSync,
): string | null {
  if (
    (env.NODE_ENV !== "development" && env.NODE_ENV !== "test")
    || env.APEX_CAPTURE_MODEL_PROMPTS !== "true"
    || !env.APEX_MODEL_AUDIT_FILE?.trim()
  ) return null;

  const requestId = randomUUID();
  const record = {
    event: "atlas_model_request",
    recordedAt: new Date().toISOString(),
    requestId,
    provider: input.provider,
    role: input.role,
    model: input.model,
    attempt: input.attempt ?? 1,
    jobId: input.jobId ?? null,
    caseId: input.caseId ?? null,
    requestBody: safeRequestBody(input.requestBody),
  };
  const serialized = JSON.stringify(record, null, 2);
  const fence = "`".repeat(Math.max(3, longestBacktickRun(serialized) + 1));
  try {
    write(
      env.APEX_MODEL_AUDIT_FILE,
      `\n\n### Model request ${requestId}\n\n${fence}json\n${serialized}\n${fence}\n`,
    );
    return requestId;
  } catch {
    process.stderr.write("[atlas_model_prompt_audit] append failed; prompt text was not written to logs.\n");
    return null;
  }
}
