import { Router, type Request, type Response } from "express";
import {
  createOperatorSessionToken, isOperatorAuthorized, missingOperatorAuthNames,
  OPERATOR_AUTH_MIN_LENGTHS, OPERATOR_SESSION_COOKIE, OPERATOR_SESSION_TTL_SECONDS,
  readOperatorAuthConfig, safeSecretEqual,
} from "../lib/operator-auth";

const router = Router();
const LOGIN_WINDOW_MS = 60_000, LOGIN_BLOCK_MS = 60_000, MAX_FAILED_LOGINS_PER_WINDOW = 8;
type LoginAttempt = { windowStartedAt: number; failures: number; blockedUntil: number };
const failedLogins = new Map<string, LoginAttempt>();
function noStore(res: Response): void { res.setHeader("Cache-Control", "no-store"); res.setHeader("Pragma", "no-cache"); }
function authProblem(code: "OPERATOR_AUTH_REQUIRED" | "OPERATOR_AUTH_NOT_CONFIGURED", missing: string[] = []) {
  const notConfigured = code === "OPERATOR_AUTH_NOT_CONFIGURED";
  return {
    code, severity: "critical" as const,
    title: notConfigured ? "Operator sign-in is not configured" : "Operator authentication is required",
    message: notConfigured ? "This Apex API instance is missing its required operator authentication configuration." : "The password was not accepted. Check it and try again.",
    why: notConfigured ? "The API fails closed rather than exposing research data or actions without a valid operator boundary." : "The sign-in endpoint could not establish a valid operator session.",
    nextSteps: notConfigured
      ? ["Configure APEX_OPERATOR_PASSWORD (at least " + OPERATOR_AUTH_MIN_LENGTHS.APEX_OPERATOR_PASSWORD + " characters).", "Configure APEX_API_AUTH_TOKEN and APEX_SESSION_SECRET (at least " + OPERATOR_AUTH_MIN_LENGTHS.APEX_API_AUTH_TOKEN + " characters each).", "Restart the API and retry sign-in."]
      : ["Check the operator password and try again.", "If repeated attempts are blocked, wait one minute.", "Ask the deployment operator to verify the auth configuration if the problem persists."],
    retryable: !notConfigured,
    ...(missing.length ? { missing } : {}),
  };
}
function missingConfigResponse(res: Response): void {
  const missing = missingOperatorAuthNames();
  res.status(503).json({ configured: false, authenticated: false, code: "OPERATOR_AUTH_NOT_CONFIGURED", error: "Operator authentication is not configured.", missing, userError: authProblem("OPERATOR_AUTH_NOT_CONFIGURED", missing) });
}
function requestAddress(req: Request): string { return req.socket.remoteAddress || "unknown"; }
function loginAttemptFor(address: string, now: number): LoginAttempt {
  let state = failedLogins.get(address);
  if (!state || now - state.windowStartedAt >= LOGIN_WINDOW_MS) {
    state = { windowStartedAt: now, failures: 0, blockedUntil: 0 };
    failedLogins.set(address, state);
  }
  while (failedLogins.size > 512) {
    const oldest = failedLogins.keys().next();
    if (oldest.done) break;
    failedLogins.delete(oldest.value);
  }
  return state;
}
function appendSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", OPERATOR_SESSION_COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + OPERATOR_SESSION_TTL_SECONDS + secure);
}
function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", OPERATOR_SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT" + secure);
}
router.get("/auth/session", (req: Request, res: Response): void => {
  noStore(res);
  const config = readOperatorAuthConfig();
  if (!config) { missingConfigResponse(res); return; }
  res.status(200).json({ configured: true, authenticated: isOperatorAuthorized(req, config) });
});
router.post("/auth/login", (req: Request, res: Response): void => {
  noStore(res);
  const config = readOperatorAuthConfig();
  if (!config) { missingConfigResponse(res); return; }
  const address = requestAddress(req), now = Date.now(), attempt = loginAttemptFor(address, now);
  if (attempt.blockedUntil > now) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000))));
    res.status(429).json({
      code: "OPERATOR_LOGIN_RATE_LIMITED", error: "Too many sign-in attempts. Wait one minute, then try again.",
      userError: { ...authProblem("OPERATOR_AUTH_REQUIRED"), code: "OPERATOR_LOGIN_RATE_LIMITED", title: "Sign-in temporarily paused", message: "Too many unsuccessful sign-in attempts were received from this connection.", why: "A short local limit helps slow password guessing.", nextSteps: ["Wait one minute.", "Check the password before trying again."], retryable: true },
    });
    return;
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const accepted = password.length > 0 && password.length <= 256 && safeSecretEqual(password, config.operatorPassword);
  if (!accepted) {
    attempt.failures += 1;
    if (attempt.failures >= MAX_FAILED_LOGINS_PER_WINDOW) attempt.blockedUntil = now + LOGIN_BLOCK_MS;
    res.status(401).json({ code: "OPERATOR_AUTH_REQUIRED", error: "The password was not accepted.", userError: authProblem("OPERATOR_AUTH_REQUIRED") });
    return;
  }
  failedLogins.delete(address);
  appendSessionCookie(res, createOperatorSessionToken(config));
  res.status(200).json({ configured: true, authenticated: true, expiresInSeconds: OPERATOR_SESSION_TTL_SECONDS });
});
router.post("/auth/logout", (_req: Request, res: Response): void => {
  noStore(res); clearSessionCookie(res);
  res.status(200).json({ configured: Boolean(readOperatorAuthConfig()), authenticated: false });
});
export default router;
