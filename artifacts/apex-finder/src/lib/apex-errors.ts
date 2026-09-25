export type ApexErrorSeverity = "info" | "warning" | "degraded" | "error" | "critical";
export type ApexUserError = {
  code: string; severity: ApexErrorSeverity; title: string; message: string; why: string;
  nextSteps: string[]; retryable: boolean; provider?: string;
};

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 700);

export function classifyApexError(input: unknown, status?: number): ApexUserError {
  const raw = clean(input), lower = raw.toLowerCase();
  if (lower.includes("gemini boss") || (lower.includes("gemini") && (lower.includes("503") || lower.includes("high demand") || lower.includes("unavailable"))))
    return {code:"GEMINI_BOSS_UNAVAILABLE",severity:"degraded",title:"Apex is waiting on Gemini Boss",message:"The planning model is temporarily unavailable. Apex stopped before research so it would not produce unsupported results.",why:"Gemini returned a temporary service-unavailable response or the selected model is under heavy demand.",nextSteps:["Wait a little and retry the same run.","Check System Status if the problem persists.","No Investigator fallback is used here because Gemini Boss and Investigator have different roles."],retryable:true,provider:"Gemini"};
  if (status===401 || status===403 || /unauthorized|authentication/i.test(lower))
    return {code:"AUTH_REQUIRED",severity:"critical",title:"Operator authentication is required",message:"Apex could not authorize this action.",why:"The session may have expired or the API rejected the current credentials.",nextSteps:["Sign in again.","If sign-in keeps failing, check operator authentication and restart the API."],retryable:true};
  if (status===409 || /already running|active run/.test(lower))
    return {code:"RUN_ALREADY_ACTIVE",severity:"warning",title:"Apex is already researching",message:"Another Atlas run is active, so this launch was not started.",why:"Apex allows one canonical Atlas run at a time to protect research state and provider quotas.",nextSteps:["Open Reactor to follow the active run.","Wait for it to finish, then launch again if needed."],retryable:false};
  if (/timeout|timed out|deadline/.test(lower))
    return {code:"PROVIDER_TIMEOUT",severity:"warning",title:"A research service took too long",message:"Apex stopped or skipped the affected step rather than waiting indefinitely.",why:"External providers and web sources can become slow or unreachable.",nextSteps:["Retry the run.","Try a lighter research depth if repeated timeouts occur.","Check System Status for provider health."],retryable:true};
  if (status===429 || /rate limit|quota|too many requests/.test(lower))
    return {code:"PROVIDER_RATE_LIMIT",severity:"warning",title:"A provider is rate-limited",message:"A research provider has temporarily limited requests.",why:"The provider quota or rate limit was reached.",nextSteps:["Wait for the provider window to recover.","Retry later.","Review provider quotas in System Status if it keeps happening."],retryable:true};
  if (/missing/.test(lower) && /key|secret|credential/.test(lower))
    return {code:"MISSING_CREDENTIAL",severity:"critical",title:"A required provider credential is missing",message:"Apex cannot complete this research step until the required provider is configured.",why:"The API started, but a required secret is not available to the runtime.",nextSteps:["Open System Status to identify the missing provider.","Add the required secret in the deployment environment.","Restart the API and retry."],retryable:false};
  if (/redis/.test(lower) && /unavailable|failed|error/.test(lower))
    return {code:"REDIS_UNAVAILABLE",severity:"critical",title:"Apex job state is unavailable",message:"Apex cannot safely continue while its job-state store is unavailable.",why:"Redis is used for authoritative live job state and coordination.",nextSteps:["Check System Status.","Restore Redis connectivity.","Restart the API if needed."],retryable:true};
  if (/postgres|database|schema|relation.*does not exist/.test(lower))
    return {code:"DATABASE_FAILURE",severity:"critical",title:"Apex could not access its database",message:"The research run cannot safely continue because durable storage is unavailable or incomplete.",why:"Apex requires PostgreSQL for durable cases, evidence, and lifecycle state.",nextSteps:["Check System Status and database connectivity.","Verify the Apex schema is initialized.","Retry only after the database is healthy."],retryable:true};
  if (/no evidence|couldn't verify|could not verify|not enough evidence/.test(lower))
    return {code:"INSUFFICIENT_EVIDENCE",severity:"info",title:"Apex could not verify enough evidence",message:"No unsupported result was promoted. The run may finish without a trusted card.",why:"Apex only promotes findings grounded in observed, attributable evidence.",nextSteps:["Review the research trail.","Try a broader or more specific target.","Retry later if important sources were temporarily unavailable."],retryable:true};
  if (/canceled|cancelled|stopped/.test(lower))
    return {code:"RUN_STOPPED",severity:"info",title:"Apex research was stopped",message:"The run ended without promoting unsupported partial results.",why:"The run was canceled before its remaining work could complete.",nextSteps:["Launch a new run when ready.","Review any evidence already recorded in the research trail."],retryable:true};
  if (/network|fetch failed|econn|dns/.test(lower))
    return {code:"NETWORK_FAILURE",severity:"warning",title:"A research connection failed",message:"Apex could not reach one of the services or sources needed for this step.",why:"Internet services can fail temporarily or block automated requests.",nextSteps:["Retry the run.","If repeated, check the affected provider in System Status.","Apex will not turn an unreachable source into a fabricated result."],retryable:true};
  if (/pipeline crashed|internal server error/.test(lower) || status===500)
    return {code:"INTERNAL_FAILURE",severity:"critical",title:"Apex hit an internal error",message:"The research run stopped because the application could not safely complete the current step.",why:"Apex failed closed rather than saving a result it could not validate.",nextSteps:["Retry once.","If it repeats, open System Status and record the run details for diagnosis.","Do not treat the failed run as completed research."],retryable:true};
  if (status && status>=500)
    return {code:"SERVICE_FAILURE",severity:"critical",title:"The Apex research service is unavailable",message:"The API could not complete the requested operation.",why:"The server returned a temporary or internal failure.",nextSteps:["Wait briefly and retry.","Check System Status.","If it persists, restart the API and inspect runtime logs."],retryable:true};
  return {code:"UNKNOWN_ERROR",severity:"error",title:"Apex could not complete that action",message:raw||"The operation did not complete.",why:"Apex could not safely determine that the requested operation completed successfully.",nextSteps:["Retry the action once.","If it repeats, open System Status and review the latest run.","Do not treat the failed operation as successful."],retryable:true};
}

export function emitApexError(error: ApexUserError) {
  window.dispatchEvent(new CustomEvent("apex:error", { detail: error }));
}
