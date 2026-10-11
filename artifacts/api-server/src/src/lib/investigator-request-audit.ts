export type InvestigatorProviderRequestAuditInput = {
  model: string;
  cognitiveTask: string;
  attempt: number;
  jobId?: string | null;
  caseId?: number | null;
  requestBody: Record<string, unknown>;
};

type AuditEnvironment = { NODE_ENV?: string; APEX_CAPTURE_INVESTIGATOR_REQUESTS?: string };
type AuditWriter = (line: string) => unknown;

const SAFE_REQUEST_BODY_KEYS = new Set([
  "include_reasoning", "max_completion_tokens", "max_tokens", "messages", "model",
  "reasoning_format", "response_format", "seed", "stop", "stream", "temperature",
  "tool_choice", "tools", "top_p",
]);
const SAFE_MESSAGE_ROLES = new Set(["system", "user", "assistant", "tool"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function summarizeMessage(message: unknown): Record<string, unknown> {
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
}

function summarizeResponseFormat(value: unknown): Record<string, unknown> | null {
  const format = asRecord(value);
  if (!format) return null;
  const schema = asRecord(format.json_schema);
  const type = format.type === "json_schema" || format.type === "json_object" ? format.type : "other";
  return {
    type,
    hasSchema: Boolean(schema),
    strict: typeof schema?.strict === "boolean" ? schema.strict : null,
  };
}

function summarizeRequestShape(requestBody: Record<string, unknown>): Record<string, unknown> {
  const rawMessages = Array.isArray(requestBody.messages) ? requestBody.messages : null;
  return {
    requestKeys: Object.keys(requestBody).filter((key) => SAFE_REQUEST_BODY_KEYS.has(key)).sort(),
    messageCount: rawMessages?.length ?? null,
    messages: (rawMessages ?? []).slice(0, 16).map(summarizeMessage),
    messagesTruncated: Boolean(rawMessages && rawMessages.length > 16),
    responseFormat: summarizeResponseFormat(requestBody.response_format),
  };
}

/**
 * Optional developer diagnostics record request shape only. It deliberately
 * excludes requestBody/message content: research prompts can contain target
 * details, source material, contact values, notes, and model-authored reasoning.
 */
export function isInvestigatorProviderRequestAuditEnabled(
  env: AuditEnvironment = process.env,
): boolean {
  const safeEnvironment = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  return safeEnvironment && env.APEX_CAPTURE_INVESTIGATOR_REQUESTS === "true";
}

export function buildInvestigatorProviderRequestAuditRecord(
  input: InvestigatorProviderRequestAuditInput,
): Record<string, unknown> {
  return {
    event: "atlas_investigator_provider_request",
    recordedAt: new Date().toISOString(),
    model: input.model,
    cognitiveTask: input.cognitiveTask,
    attempt: input.attempt,
    jobId: input.jobId ?? null,
    caseId: input.caseId ?? null,
    requestSummary: summarizeRequestShape(input.requestBody),
  };
}

/** Opt-in stdout is visible when ordinary development application logging is silent. */
export function emitInvestigatorProviderRequestAudit(
  input: InvestigatorProviderRequestAuditInput,
  env: AuditEnvironment = process.env,
  write: AuditWriter = (line) => process.stdout.write(line),
): boolean {
  if (!isInvestigatorProviderRequestAuditEnabled(env)) return false;
  try {
    write(`[atlas_investigator_provider_request] ${JSON.stringify(buildInvestigatorProviderRequestAuditRecord(input))}\n`);
    return true;
  } catch {
    return false;
  }
}
