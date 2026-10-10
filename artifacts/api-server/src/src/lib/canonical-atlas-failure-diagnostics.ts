/**
 * Safe, finite diagnostics for the canonical Atlas execution boundary.
 *
 * These labels describe the last named execution boundary and a bounded failure
 * kind. They must never include request bodies, raw URLs, provider messages,
 * credentials, cookies, or model reasoning.
 */
export type AtlasFailureDomain =
  | "model_provider"
  | "model_action"
  | "tool_execution"
  | "external_page_fetch"
  | "persistence_database"
  | "lease_job_state"
  | "unexpected_programming_error";

export type AtlasFailureKind =
  | "request_failure"
  | "invalid_contract"
  | "pdf_unsupported"
  | "response_size_limit"
  | "http_error"
  | "provider_unavailable"
  | "timeout"
  | "cancelled"
  | "job_missing"
  | "job_state_unavailable"
  | "job_state_mismatch"
  | "lease_lost"
  | "unexpected_exception";

export type AtlasFailureStage =
  | "boss_opening_request"
  | "right_hand_opening_review"
  | "oversight_control_decision"
  | "investigator_episode"
  | "model_action_validation"
  | "tool_execution"
  | "external_page_fetch"
  | "case_persistence"
  | "candidate_admission_persistence"
  | "control_event_persistence"
  | "terminal_persistence"
  | "job_state_or_lease"
  | "orchestration";

export function atlasFailureDomainForStage(stage: AtlasFailureStage): AtlasFailureDomain {
  switch (stage) {
    case "boss_opening_request":
    case "right_hand_opening_review":
    case "oversight_control_decision":
      return "model_provider";
    case "model_action_validation":
      return "model_action";
    case "tool_execution":
      return "tool_execution";
    case "external_page_fetch":
      return "external_page_fetch";
    case "case_persistence":
    case "candidate_admission_persistence":
    case "control_event_persistence":
    case "terminal_persistence":
      return "persistence_database";
    case "job_state_or_lease":
      return "lease_job_state";
    default:
      return "unexpected_programming_error";
  }
}

function safeErrorShape(error: unknown): { name: string; message: string; code: string } {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const cause = value.cause && typeof value.cause === "object" ? value.cause as Record<string, unknown> : {};
  const name = error instanceof Error ? error.name : typeof value.name === "string" ? value.name : "unknown";
  const message = error instanceof Error ? error.message : typeof value.message === "string" ? value.message : "";
  const code = typeof value.code === "string" ? value.code : typeof cause.code === "string" ? cause.code : "";
  return { name, message, code };
}

/** Return only stable category labels; never return the raw error text. */
export function classifyCanonicalAtlasFailure(input: {
  stage: AtlasFailureStage;
  error: unknown;
  cancelled?: boolean;
  jobStateUnavailable?: boolean;
  jobMissing?: boolean;
  jobStateMismatch?: boolean;
  leaseLost?: boolean;
}): { domain: AtlasFailureDomain; kind: AtlasFailureKind } {
  const error = safeErrorShape(input.error);
  if (input.cancelled) return { domain: "lease_job_state", kind: "cancelled" };
  if (input.jobStateUnavailable) return { domain: "lease_job_state", kind: "job_state_unavailable" };
  if (input.jobMissing) return { domain: "lease_job_state", kind: "job_missing" };
  if (input.jobStateMismatch) return { domain: "lease_job_state", kind: "job_state_mismatch" };
  if (input.leaseLost || /canonical atlas lease (?:was )?lost|lease ownership.*lost/i.test(error.message)) {
    return { domain: "lease_job_state", kind: "lease_lost" };
  }
  if (error.name === "AbortError" || /timeout|timed out|deadline exceeded|aborted/i.test(error.message)) {
    return { domain: atlasFailureDomainForStage(input.stage), kind: "timeout" };
  }
  if (input.stage === "model_action_validation") {
    return { domain: "model_action", kind: "invalid_contract" };
  }
  if (input.stage === "external_page_fetch") {
    if (/(?:outbound|browser) response exceeds \d+ byte limit/i.test(error.message)) {
      return { domain: "external_page_fetch", kind: "response_size_limit" };
    }
    if (/HTTP\s+[45]\d\d/i.test(error.message)) {
      return { domain: "external_page_fetch", kind: "http_error" };
    }
    return { domain: "external_page_fetch", kind: "request_failure" };
  }
  if (input.stage === "tool_execution") {
    return { domain: "tool_execution", kind: "request_failure" };
  }
  if (input.stage === "boss_opening_request" || input.stage === "right_hand_opening_review" || input.stage === "oversight_control_decision") {
    return { domain: "model_provider", kind: "request_failure" };
  }
  if (input.stage === "job_state_or_lease") {
    return { domain: "lease_job_state", kind: "unexpected_exception" };
  }
  if (input.stage === "case_persistence" || input.stage === "candidate_admission_persistence" || input.stage === "control_event_persistence" || input.stage === "terminal_persistence") {
    return { domain: "persistence_database", kind: "unexpected_exception" };
  }
  if (/provider unavailable|HTTP\s+5\d\d/i.test(error.message) && /provider|groq|model/i.test(error.message)) {
    return { domain: "model_provider", kind: "provider_unavailable" };
  }
  if (error.code && /^(ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)/i.test(error.code)) {
    return { domain: atlasFailureDomainForStage(input.stage), kind: "request_failure" };
  }
  return { domain: atlasFailureDomainForStage(input.stage), kind: "unexpected_exception" };
}
