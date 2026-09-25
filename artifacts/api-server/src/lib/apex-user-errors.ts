export type ApexErrorSeverity = "info" | "warning" | "degraded" | "error" | "critical";

export type ApexUserError = {
  code: string;
  severity: ApexErrorSeverity;
  title: string;
  message: string;
  why: string;
  nextSteps: string[];
  retryable: boolean;
  provider?: string;
};

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 700);

export function classifyApexError(input: unknown, status?: number): ApexUserError {
  const raw = clean(input);
  const lower = raw.toLowerCase();

  if (lower.includes("gemini boss") || (lower.includes("gemini") && (lower.includes("503") || lower.includes("high demand") || lower.includes("unavailable")))) {
    return {
      code: "GEMINI_BOSS_UNAVAILABLE",
      severity: "degraded",
      title: "Apex is waiting on Gemini Boss",
      message: "The planning model is temporarily unavailable. Apex stopped before research so it would not produce unsupported results.",
      why: "Gemini returned a temporary service-unavailable response or the selected model is under heavy demand. This is an external provider condition, not a research result.",
      nextSteps: ["Wait a little and retry the same run.", "Check System Status if the problem persists.", "Do not change Investigator providers to work around this control-plane failure."],
      retryable: true,
      provider: "Gemini",
    };
  }

  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("authentication")) {
    return { code: "AUTH_REQUIRED", severity: "critical", title: "Operator authentication is required", message: "Apex could not authorize this action.", why: "The session may have expired or the API rejected the current credentials.", nextSteps: ["Sign in again.", "If sign-in keeps failing, check the operator authentication configuration and restart the API."], retryable: true };
  }

  if (status === 409 || lower.includes("already running") || lower.includes("active run")) {
    return { code: "RUN_ALREADY_ACTIVE", severity: "warning", title: "Apex is already researching", message: "Another Atlas run is active, so this launch was not started.", why: "Apex allows only one canonical Atlas run at a time to protect research state and provider quotas.", nextSteps: ["Open Reactor to follow the active run.", "Wait for it to finish, then launch again if needed."], retryable: false };
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline")) {
    return { code: "PROVIDER_TIMEOUT", severity: "warning", title: "A research service took too long", message: "Apex stopped or skipped the affected step rather than waiting indefinitely.", why: "External providers and web sources can become slow or unreachable.", nextSteps: ["Retry the run.", "Try a lighter research depth if repeated timeouts occur.", "Check System Status for provider health."], retryable: true };
  }

  if (status === 429 || lower.includes("rate limit") || lower.includes("quota") || lower.includes("too many requests")) {
    return { code: "PROVIDER_RATE_LIMIT", severity: "warning", title: "A provider is rate-limited", message: "A research provider has temporarily limited requests.", why: "The provider quota or rate limit was reached. Apex should respect that limit instead of hammering the service.", nextSteps: ["Wait for the provider window to recover.", "Retry later.", "If it keeps happening, review provider quotas in System Status."], retryable: true };
  }

  if (lower.includes("missing") && (lower.includes("key") || lower.includes("secret") || lower.includes("credential"))) {
    return { code: "MISSING_CREDENTIAL", severity: "critical", title: "A required provider credential is missing", message: "Apex cannot complete this research step until the required provider is configured.", why: "The API started, but a required secret is not available to the runtime.", nextSteps: ["Open System Status to identify the missing provider.", "Add the required secret in the deployment environment.", "Restart the API and retry."], retryable: false };
  }

  if (lower.includes("redis") && (lower.includes("unavailable") || lower.includes("failed") || lower.includes("error"))) {
    return { code: "REDIS_UNAVAILABLE", severity: "critical", title: "Apex job state is unavailable", message: "Apex cannot safely continue while its job-state store is unavailable.", why: "Redis is used for authoritative live job state and coordination.", nextSteps: ["Check System Status.", "Restore Redis connectivity.", "Restart the API if the service recovered but Apex still reports this error."], retryable: true };
  }

  if (lower.includes("postgres") || lower.includes("database") || lower.includes("schema") || lower.includes("relation") && lower.includes("does not exist")) {
    return { code: "DATABASE_FAILURE", severity: "critical", title: "Apex could not access its database", message: "The research run cannot safely continue because durable storage is unavailable or incomplete.", why: "Apex requires its PostgreSQL schema for durable cases, evidence, and lifecycle state.", nextSteps: ["Check System Status and database connectivity.", "Verify the Apex schema is initialized.", "Retry only after the database is healthy."], retryable: true };
  }

  if (lower.includes("no evidence") || lower.includes("couldn't verify") || lower.includes("could not verify") || lower.includes("not enough evidence")) {
    return { code: "INSUFFICIENT_EVIDENCE", severity: "info", title: "Apex could not verify enough evidence", message: "No unsupported result was promoted. The run may finish without a trusted card.", why: "Apex only promotes findings that are grounded in observed, attributable evidence.", nextSteps: ["Review the research trail.", "Try a broader or more specific target.", "Retry later if important sources were temporarily unavailable."], retryable: true };
  }

  if (lower.includes("canceled") || lower.includes("cancelled") || lower.includes("stopped")) {
    return { code: "RUN_STOPPED", severity: "info", title: "Apex research was stopped", message: "The run ended without promoting unsupported partial results.", why: "The run was canceled before its remaining work could complete.", nextSteps: ["Launch a new run when ready.", "Review any evidence already recorded in the research trail."], retryable: true };
  }

  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("econn") || lower.includes("dns")) {
    return { code: "NETWORK_FAILURE", severity: "warning", title: "A research connection failed", message: "Apex could not reach one of the services or sources needed for this step.", why: "Internet services can fail temporarily or block automated requests.", nextSteps: ["Retry the run.", "If repeated, open System Status and check the affected provider.", "Apex will not turn an unreachable source into a fabricated result."], retryable: true };
  }

  if (lower.includes("pipeline crashed") || lower.includes("internal server error") || status === 500) {
    return { code: "INTERNAL_FAILURE", severity: "critical", title: "Apex hit an internal error", message: "The research run stopped because the application could not safely complete the current step.", why: "Apex failed closed rather than saving a result it could not validate.", nextSteps: ["Retry once.", "If it repeats, open System Status and record the run details for diagnosis.", "Do not treat the failed run as a completed research result."], retryable: true };
  }

  if (status && status >= 500) {
    return { code: "SERVICE_FAILURE", severity: "critical", title: "The Apex research service is unavailable", message: "The API could not complete the requested operation.", why: "The server returned a temporary or internal failure.", nextSteps: ["Wait briefly and retry.", "Check System Status.", "If it persists, restart the API and inspect the runtime logs."], retryable: true };
  }

  return {
    code: "UNKNOWN_ERROR",
    severity: "error",
    title: "Apex could not complete that action",
    message: raw || "The operation did not complete.",
    why: "Apex could not safely determine that the requested operation completed successfully.",
    nextSteps: ["Retry the action once.", "If it repeats, open System Status and review the latest run.", "No unsupported result should be treated as successful."],
    retryable: true,
  };
}
