export type InvestigatorProviderRequestAuditInput = {
  model: string;
  cognitiveTask: string;
  attempt: number;
  jobId?: string | null;
  caseId?: number | null;
  requestBody: Record<string, unknown>;
};

type AuditEnvironment = Pick<NodeJS.ProcessEnv, "NODE_ENV" | "APEX_CAPTURE_INVESTIGATOR_REQUESTS">;
type AuditWriter = (line: string) => unknown;

/** Capture is explicitly opt-in and never enabled for production requests. */
export function isInvestigatorProviderRequestAuditEnabled(
  env: AuditEnvironment = process.env,
): boolean {
  return env.NODE_ENV !== "production" &&
    env.APEX_CAPTURE_INVESTIGATOR_REQUESTS === "true";
}

/**
 * Remove model-authored "thought" string values from the audit projection while
 * leaving the actual outbound request untouched. This protects private reasoning
 * from being copied into workflow logs.
 */
export function redactModelThoughtFieldsForAudit(prompt: string): string {
  return prompt.replace(
    /("thought"\s*:\s*)"(?:\\.|[^"\\])*"/g,
    '$1"[REDACTED_MODEL_THOUGHT]"',
  );
}

export function buildInvestigatorProviderRequestAuditRecord(
  input: InvestigatorProviderRequestAuditInput,
): Record<string, unknown> {
  const messages = Array.isArray(input.requestBody.messages)
    ? input.requestBody.messages.map((message) => {
        if (!message || typeof message !== "object" || Array.isArray(message)) return message;
        const record = message as Record<string, unknown>;
        return {
          ...record,
          content: typeof record.content === "string"
            ? redactModelThoughtFieldsForAudit(record.content)
            : record.content,
        };
      })
    : input.requestBody.messages;

  return {
    event: "atlas_investigator_provider_request",
    recordedAt: new Date().toISOString(),
    model: input.model,
    cognitiveTask: input.cognitiveTask,
    attempt: input.attempt,
    jobId: input.jobId ?? null,
    caseId: input.caseId ?? null,
    requestBody: { ...input.requestBody, messages },
  };
}

/**
 * Emits only the sanitized outbound request body, never the Authorization header
 * or response payload. A dedicated stdout sink keeps this available in opted-in
 * development runs where the normal application logger is intentionally silent.
 */
export function emitInvestigatorProviderRequestAudit(
  input: InvestigatorProviderRequestAuditInput,
  env: AuditEnvironment = process.env,
  write: AuditWriter = (line) => process.stdout.write(line),
): boolean {
  if (!isInvestigatorProviderRequestAuditEnabled(env)) return false;
  try {
    const record = buildInvestigatorProviderRequestAuditRecord(input);
    write(`[atlas_investigator_provider_request] ${JSON.stringify(record)}\n`);
    return true;
  } catch {
    // Audit capture is observability-only and must never break a research action.
    return false;
  }
}
