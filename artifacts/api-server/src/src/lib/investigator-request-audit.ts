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

/** Explicit opt-in only; never emit provider request text in production. */
export function isInvestigatorProviderRequestAuditEnabled(
  env: AuditEnvironment = process.env,
): boolean {
  return env.NODE_ENV !== "production" &&
    env.APEX_CAPTURE_INVESTIGATOR_REQUESTS === "true";
}

/** The audit copy omits model-authored thought strings; the actual request is unchanged. */
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
