import { appendFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";

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
const SENSITIVE_AUDIT_KEY = /^(?:authorization|api[-_]?key|api[-_]?token|access[-_]?token|refresh[-_]?token|token|secret|password|credential|cookie|session|private[-_]?key)$/i;
const PRIVATE_REASONING_KEY = /^(?:thought|thoughts|reasoning|reasoning_content|analysis|chain_of_thought|private_reasoning|internal_reasoning|scratchpad)$/i;
const MAX_AUDIT_STRING_CHARS = 300_000;
const MAX_AUDIT_ARRAY_ITEMS = 128;
const AUDIT_SECRET_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(Bearer\s+)[A-Za-z0-9._~+/-=]{12,}/gi, "$1[REDACTED_SECRET]"],
  [/\b([A-Z0-9_.-]*(?:authorization|api[-_]?key|api[-_]?token|access[-_]?token|refresh[-_]?token|token|secret|password|credential|cookie|session|private[-_]?key)\s*[:=]\s*["']?)[^\s&"'<>]+/gi, "$1[REDACTED_SECRET]"],
  [/([?&](?:x[-_]?api[-_]?(?:key|token)|api[-_]?(?:key|token)|access[-_]?token|refresh[-_]?token|secret|password|token|session)=)[^&#\s"']+/gi, "$1[REDACTED_SECRET]"],
  [/\b(?:gsk|sk|rk|hf|ghp|gho|ghu|ghs|ghr|github_pat)[_-][A-Za-z0-9_-]{16,}\b/gi, "[REDACTED_SECRET]"],
[/\bAIza[A-Za-z0-9_-]{20,}\b/gi, "[REDACTED_SECRET]"],
  [/\b(redis|rediss|postgres|postgresql):\/\/[^\s/@]+:[^\s/@]+@/gi, "$1://[REDACTED_CREDENTIALS]@"],
];

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

/**
 * Resolve relative audit destinations from the workspace root, not the API
 * package's process.cwd(). Replit sets APEX_MODEL_AUDIT_FILE to "audits/…",
 * while its API process may run with artifacts/api-server as its working
 * directory. Anchoring to the workspace root avoids relying on a temporary
 * symlink inside that package.
 */
function workspaceRootFrom(startDirectory: string): string {
  const start = resolve(startDirectory);
  let current = start;
  while (true) {
    if (
      existsSync(join(current, "pnpm-workspace.yaml"))
      && existsSync(join(current, "pnpm-lock.yaml"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

export function resolveModelAuditFilePath(
  configuredPath: string,
  cwd: string = process.cwd(),
): string {
  if (isAbsolute(configuredPath)) return configuredPath;
  return resolve(workspaceRootFrom(cwd), configuredPath);
}

const AUDIT_CONTACT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/gi, "[REDACTED_EMAIL]"],
  [/(?<![A-Za-z0-9])(?:\\+\\d{1,3}[\\s.-]?)?(?:\\(\\d{3}\\)|\\d{3})[\\s.-]?\\d{3}[\\s.-]?\\d{4}(?!\\d)/g, "[REDACTED_PHONE]"],
  [/\\b(?:phone|telephone|mobile)\\s*[:=]\\s*\\+?\\d{7,15}\\b/gi, "[REDACTED_PHONE]"],
];
const CONTACT_AUDIT_KEY = /^(?:email|emails|emailAddress|emailAddresses|phone|phones|phoneNumber|phoneNumbers|mobile|telephone|contactEmail|contactPhone)$/i;

function isContactDataField(key: string, record: Record<string, unknown>): boolean {
  if (CONTACT_AUDIT_KEY.test(key)) return true;
  const vectorType = typeof record.vectorType === "string" ? record.vectorType.toLowerCase() : "";
  return key === "value" && (vectorType === "email" || vectorType === "phone");
}

function redactAuditSecrets(content: string): string {
  const credentialSafe = AUDIT_SECRET_REPLACEMENTS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    content,
  );
  return AUDIT_CONTACT_REPLACEMENTS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    credentialSafe,
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sanitizeAuditPayload(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    const bounded = value.length <= MAX_AUDIT_STRING_CHARS
      ? value
      : `${value.slice(0, MAX_AUDIT_STRING_CHARS)}\n[AUDIT STRING TRUNCATED: ${value.length - MAX_AUDIT_STRING_CHARS} characters omitted]`;
    return redactAuditSecrets(bounded);
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 16) return "[AUDIT DEPTH LIMIT]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_AUDIT_ARRAY_ITEMS).map((item) => sanitizeAuditPayload(item, depth + 1));
    if (value.length > MAX_AUDIT_ARRAY_ITEMS) {
      items.push(`[AUDIT ARRAY TRUNCATED: ${value.length - MAX_AUDIT_ARRAY_ITEMS} items omitted]`);
    }
    return items;
  }
  const record = asRecord(value);
  if (!record) return typeof value === "undefined" ? null : String(value);
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_AUDIT_ARRAY_ITEMS)
      .filter(([key]) => !SENSITIVE_AUDIT_KEY.test(key))
      .map(([key, item]) => [
        key,
        isContactDataField(key, record) && typeof item === "string"
          ? "[REDACTED_CONTACT_DATA]"
          : sanitizeAuditPayload(item, depth + 1),
      ]),
  );
}

function removePrivateReasoningFields(
  value: unknown,
  omitted: { count: number },
  depth = 0,
): unknown {
  if (typeof value === "string") return redactAuditSecrets(value);
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 16) return "[AUDIT DEPTH LIMIT]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_AUDIT_ARRAY_ITEMS).map((item) => removePrivateReasoningFields(item, omitted, depth + 1));
  }
  const record = asRecord(value);
  if (!record) return null;
  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_AUDIT_ARRAY_ITEMS)
      .filter(([key]) => {
        if (PRIVATE_REASONING_KEY.test(key)) {
          omitted.count += 1;
          return false;
        }
        return !SENSITIVE_AUDIT_KEY.test(key);
      })
      .map(([key, item]) => [
        key,
        isContactDataField(key, record) && typeof item === "string"
          ? "[REDACTED_CONTACT_DATA]"
          : removePrivateReasoningFields(item, omitted, depth + 1),
      ]),
  );
}

function sanitizeVisibleCompletion(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    const credentialSafe = redactAuditSecrets(value);
    try {
      const parsed = JSON.parse(credentialSafe) as unknown;
      const omitted = { count: 0 };
      return {
        format: "json",
        content: removePrivateReasoningFields(parsed, omitted),
        privateReasoningFieldsOmitted: omitted.count,
      };
    } catch {
      return {
        format: "unstructured",
        content: null,
        contentOmitted: "Unstructured model output is not copied because it may contain private reasoning.",
        outputChars: value.length,
      };
    }
  }
  const omitted = { count: 0 };
  return {
    format: "structured",
    content: removePrivateReasoningFields(value, omitted),
    privateReasoningFieldsOmitted: omitted.count,
  };
}

function sanitizeVisibleToolCalls(value: unknown): unknown {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 16).map((rawCall) => {
    const call = asRecord(rawCall);
    const fn = asRecord(call?.function);
    return {
      id: typeof call?.id === "string" ? redactAuditSecrets(call.id) : null,
      type: typeof call?.type === "string" ? call.type : null,
      function: fn
        ? {
            name: typeof fn.name === "string" ? redactAuditSecrets(fn.name) : null,
            arguments: typeof fn.arguments === "string"
              ? sanitizeVisibleCompletion(fn.arguments)
              : sanitizeVisibleCompletion(fn.arguments ?? null),
          }
        : null,
    };
  });
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

/** Capture the actual model-visible payload while excluding credential-shaped values. */
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
  safe.messages = sanitizeAuditPayload(messages ?? []);
  safe.messageSummary = (messages ?? []).slice(0, 64).map((message) => {
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
  safe.messageSummaryTruncated = Boolean(messages && messages.length > 64);
  safe.messagesTruncated = Boolean(messages && messages.length > MAX_AUDIT_ARRAY_ITEMS);
  safe.responseFormat = summarizeResponseFormat(body.response_format);
  safe.responseFormatPayload = sanitizeAuditPayload(body.response_format ?? null);
  Object.assign(safe, summarizeTools(body.tools));
  safe.toolDefinitions = sanitizeAuditPayload(body.tools ?? []);
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
 * Opt-in development trace of model-visible requests and responses. E-mail/phone
 * values and credentials are redacted; provider-only reasoning fields are omitted.
 */
export function emitModelPromptAudit(
  input: AuditInput,
  env: AuditEnvironment = process.env,
  write: AuditWriter = appendFileSync,
  cwd: string = process.cwd(),
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
    providerPrivateReasoningCaptured: false,
  };
  const serialized = JSON.stringify(record, null, 2);
  const fence = "`".repeat(Math.max(3, longestBacktickRun(serialized) + 1));
  try {
    write(
      resolveModelAuditFilePath(env.APEX_MODEL_AUDIT_FILE, cwd),
      `\n\n### Model request ${requestId}\n\n${fence}json\n${serialized}\n${fence}\n`,
    );
    return requestId;
  } catch {
    process.stderr.write("[atlas_model_prompt_audit] append failed; model request was not written to the audit file.\n");
    return null;
  }
}

type AuditResponseInput = {
  requestId: string | null;
  provider: string;
  role: AuditInput["role"];
  model: string;
  httpStatus?: number | null;
  responseBody?: string;
  latencyMs?: number;
  transportFailure?: string;
};

function visibleProviderResponse(responseBody: string, httpStatus: number | null | undefined): Record<string, unknown> {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = asRecord(JSON.parse(responseBody));
  } catch {}
  if (!payload) {
    return {
      jsonParsed: false,
      responseChars: responseBody.length,
    };
  }

  if (httpStatus != null && (httpStatus < 200 || httpStatus >= 300)) {
    const error = asRecord(payload.error);
    return {
      jsonParsed: true,
      providerError: error
        ? {
            code: typeof error.code === "string" ? error.code : null,
            type: typeof error.type === "string" ? error.type : null,
            message: typeof error.message === "string" ? sanitizeAuditPayload(error.message) : null,
          }
        : null,
      responseChars: responseBody.length,
    };
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  return {
    jsonParsed: true,
    providerResponseId: typeof payload.id === "string" ? payload.id : null,
    model: typeof payload.model === "string" ? payload.model : null,
    usage: sanitizeAuditPayload(payload.usage ?? null),
    choices: choices.slice(0, 16).map((rawChoice) => {
      const choice = asRecord(rawChoice);
      const message = asRecord(choice?.message);
      return {
        index: typeof choice?.index === "number" ? choice.index : null,
        finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
        visibleMessage: message
          ? {
              role: typeof message.role === "string" ? message.role : null,
              content: sanitizeVisibleCompletion(message.content ?? null),
              toolCalls: sanitizeVisibleToolCalls(message.tool_calls),
              functionCall: sanitizeVisibleToolCalls(message.function_call ? [message.function_call] : null),
              refusal: sanitizeAuditPayload(message.refusal ?? null),
            }
          : null,
      };
    }),
    providerPrivateReasoningCaptured: false,
  };
}

/** Append the provider's visible completion, never its separate reasoning fields. */
export function emitModelPromptAuditResponse(
  input: AuditResponseInput,
  env: AuditEnvironment = process.env,
  write: AuditWriter = appendFileSync,
  cwd: string = process.cwd(),
): void {
  if (
    !input.requestId
    || (env.NODE_ENV !== "development" && env.NODE_ENV !== "test")
    || env.APEX_CAPTURE_MODEL_PROMPTS !== "true"
    || !env.APEX_MODEL_AUDIT_FILE?.trim()
  ) return;

  const responseBody = input.responseBody ?? "";
  const record = {
    event: "atlas_model_response",
    recordedAt: new Date().toISOString(),
    requestId: input.requestId,
    provider: input.provider,
    role: input.role,
    model: input.model,
    httpStatus: input.httpStatus ?? null,
    latencyMs: input.latencyMs ?? null,
    transportFailure: input.transportFailure ?? null,
    response: responseBody
      ? visibleProviderResponse(responseBody, input.httpStatus)
      : null,
  };
  const serialized = JSON.stringify(record, null, 2);
  const fence = "`".repeat(Math.max(3, longestBacktickRun(serialized) + 1));
  try {
    write(
      resolveModelAuditFilePath(env.APEX_MODEL_AUDIT_FILE, cwd),
      `\n\n### Model response ${input.requestId}\n\n${fence}json\n${serialized}\n${fence}\n`,
    );
  } catch {
    process.stderr.write("[atlas_model_prompt_audit] append failed; model response was not written to the audit file.\n");
  }
}
