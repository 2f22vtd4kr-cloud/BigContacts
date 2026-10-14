import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const SAFE_REQUEST_KEYS = new Set([
  "include_reasoning",
  "max_completion_tokens",
  "max_tokens",
  "model",
  "reasoning_effort",
  "reasoning_format",
  "seed",
  "stop",
  "stream",
  "temperature",
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function summarizeResponseFormat(value: unknown): Record<string, unknown> | null {
  const format = asRecord(value);
  if (!format) return null;
  const schema = asRecord(format.json_schema);
  const schemaBody = asRecord(schema?.schema);
  const properties = asRecord(schemaBody?.properties);
  const rawType = format.type;
  return {
    type: rawType === "json_schema" || rawType === "json_object" || rawType === "text" ? rawType : "other",
    schemaName: typeof schema?.name === "string" ? schema.name.slice(0, 80) : null,
    hasSchema: Boolean(schemaBody),
    strict: typeof schema?.strict === "boolean" ? schema.strict : null,
    schemaPropertyCount: properties ? Object.keys(properties).length : null,
    requiredFieldCount: Array.isArray(schemaBody?.required) ? schemaBody.required.length : null,
    additionalProperties: typeof schemaBody?.additionalProperties === "boolean" ? schemaBody.additionalProperties : null,
  };
}

function summarizeTools(value: unknown): { toolCount: number | null; tools: Record<string, unknown>[]; toolsTruncated: boolean } {
  if (!Array.isArray(value)) return { toolCount: null, tools: [], toolsTruncated: false };
  const tools = value.slice(0, 16).map((item) => {
    const tool = asRecord(item);
    const fn = asRecord(tool?.function);
    const parameters = asRecord(fn?.parameters);
    const properties = asRecord(parameters?.properties);
    return {
      type: typeof tool?.type === "string" ? tool.type.slice(0, 40) : "other",
      functionName: typeof fn?.name === "string" ? fn.name.slice(0, 80) : null,
      parameterCount: properties ? Object.keys(properties).length : null,
    };
  });
  return { toolCount: value.length, tools, toolsTruncated: value.length > 16 };
}

/** Request shape only: never serialize message bodies, tools descriptions, or full schemas. */
function safeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const safe = Object.fromEntries(
    Object.entries(body).filter(([key, value]) =>
      SAFE_REQUEST_KEYS.has(key)
      && (value === null || typeof value === "boolean" || typeof value === "number"
        || (typeof value === "string" && value.length <= 128)),
    ),
  );
  const messages = Array.isArray(body.messages) ? body.messages : null;
  safe.messageCount = messages?.length ?? null;
  safe.messages = (messages ?? []).slice(0, 16).map((message) => {
    const record = asRecord(message);
    if (!record) {
      return {
        role: "other",
        contentKind: message === null ? "null" : Array.isArray(message) ? "array" : typeof message,
        contentChars: null,
        itemCount: Array.isArray(message) ? message.length : null,
      };
    }
    const rawRole = record.role;
    const role = typeof rawRole === "string" && SAFE_MESSAGE_ROLES.has(rawRole) ? rawRole : "other";
    const content = record.content;
    if (typeof content === "string") return { role, contentKind: "text", contentChars: content.length, itemCount: null };
    if (Array.isArray(content)) return { role, contentKind: "array", contentChars: null, itemCount: content.length };
    if (content && typeof content === "object") return { role, contentKind: "object", contentChars: null, itemCount: null };
    return { role, contentKind: content === null ? "null" : typeof content, contentChars: null, itemCount: null };
  });
  safe.messagesTruncated = Boolean(messages && messages.length > 16);
  safe.responseFormat = summarizeResponseFormat(body.response_format);
  Object.assign(safe, summarizeTools(body.tools));
  safe.toolChoiceKind = typeof body.tool_choice === "string"
    ? (["auto", "none", "required"].includes(body.tool_choice) ? body.tool_choice : "other-string")
    : body.tool_choice && typeof body.tool_choice === "object"
      ? "object"
      : body.tool_choice === null ? "null" : typeof body.tool_choice;
  return safe;
}
function longestBacktickRun(value: string): number {
  return Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
}

/**
 * Opt-in development trace of model request shape and sizing only. Raw message
 * content, source material, target details, contact values, tool descriptions,
 * and full JSON schemas are never serialized.
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
    requestSummary: safeRequestBody(input.requestBody),
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
    process.stderr.write("[atlas_model_prompt_audit] append failed; request shape was not written to logs.\n");
    return null;
  }
}
