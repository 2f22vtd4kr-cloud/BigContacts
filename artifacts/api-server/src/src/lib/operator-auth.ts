import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response, RequestHandler } from "express";

export const OPERATOR_SESSION_COOKIE = "apex_operator_session";
export const OPERATOR_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const OPERATOR_AUTH_MIN_LENGTHS = { APEX_API_AUTH_TOKEN: 32, APEX_OPERATOR_PASSWORD: 16, APEX_SESSION_SECRET: 32 } as const;
export type OperatorAuthConfig = { apiToken: string; operatorPassword: string; sessionSecret: string };
const REQUIRED_NAMES = Object.keys(OPERATOR_AUTH_MIN_LENGTHS) as Array<keyof typeof OPERATOR_AUTH_MIN_LENGTHS>;

export function missingOperatorAuthNames(env: Record<string, string | undefined> = process.env): string[] {
  return REQUIRED_NAMES.filter((name) => (env[name]?.trim() ?? "").length < OPERATOR_AUTH_MIN_LENGTHS[name]);
}
export function readOperatorAuthConfig(env: Record<string, string | undefined> = process.env): OperatorAuthConfig | null {
  if (missingOperatorAuthNames(env).length) return null;
  return { apiToken: env.APEX_API_AUTH_TOKEN!.trim(), operatorPassword: env.APEX_OPERATOR_PASSWORD!.trim(), sessionSecret: env.APEX_SESSION_SECRET!.trim() };
}
export function safeSecretEqual(candidate: string, expected: string): boolean {
  const left = createHash("sha256").update(candidate, "utf8").digest();
  const right = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(left, right) && candidate.length === expected.length;
}
function sessionSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}
export function createOperatorSessionToken(config: OperatorAuthConfig, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const issuedAt = Math.floor(nowSeconds), expiresAt = issuedAt + OPERATOR_SESSION_TTL_SECONDS;
  const payload = "v1." + issuedAt + "." + expiresAt + "." + randomBytes(18).toString("base64url");
  return payload + "." + sessionSignature(payload, config.sessionSecret);
}
export function verifyOperatorSessionToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return false;
  const [version, issuedRaw, expiresRaw, nonce, suppliedSignature] = parts;
  if (!version || !issuedRaw || !expiresRaw || !nonce || !suppliedSignature) return false;
  if (!/^\d{1,12}$/.test(issuedRaw) || !/^\d{1,12}$/.test(expiresRaw)) return false;
  if (!/^[A-Za-z0-9_-]{20,32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(suppliedSignature)) return false;
  const issuedAt = Number(issuedRaw), expiresAt = Number(expiresRaw), now = Math.floor(nowSeconds);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return false;
  if (issuedAt > now + 30 || issuedAt < now - OPERATOR_SESSION_TTL_SECONDS - 30) return false;
  if (expiresAt <= now || expiresAt <= issuedAt || expiresAt - issuedAt > OPERATOR_SESSION_TTL_SECONDS) return false;
  const payload = "v1." + issuedAt + "." + expiresAt + "." + nonce;
  return safeSecretEqual(suppliedSignature, sessionSignature(payload, secret));
}
function firstHeaderValue(value: string | string[] | undefined): string { return Array.isArray(value) ? (value[0] ?? "") : (value ?? ""); }
function cookieValue(req: Request, name: string): string {
  for (const part of firstHeaderValue(req.headers.cookie).split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ""; }
  }
  return "";
}
export function isOperatorAuthorized(req: Request, config: OperatorAuthConfig, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const match = /^Bearer\s+([^\s]+)$/i.exec(firstHeaderValue(req.headers.authorization));
  if (match?.[1] && safeSecretEqual(match[1], config.apiToken)) return true;
  const session = cookieValue(req, OPERATOR_SESSION_COOKIE);
  return Boolean(session && verifyOperatorSessionToken(session, config.sessionSecret, nowSeconds));
}
type AuthErrorCode = "OPERATOR_AUTH_REQUIRED" | "OPERATOR_AUTH_NOT_CONFIGURED";
function authError(code: AuthErrorCode) {
  const notConfigured = code === "OPERATOR_AUTH_NOT_CONFIGURED";
  return {
    code, severity: "critical" as const,
    title: notConfigured ? "Operator sign-in is not configured" : "Operator authentication is required",
    message: notConfigured ? "This Apex API instance is missing its required operator authentication configuration." : "Sign in to Apex Atlas to access research, contacts, and system controls.",
    why: notConfigured ? "The API fails closed rather than exposing research data or actions without a valid operator boundary." : "This API request did not include a valid signed operator session or API bearer token.",
    nextSteps: notConfigured
      ? ["Configure APEX_OPERATOR_PASSWORD (at least 16 characters).", "Configure APEX_API_AUTH_TOKEN and APEX_SESSION_SECRET (at least 32 characters each).", "Restart the API and retry sign-in."]
      : ["Sign in again.", "For API clients, send the configured bearer token.", "If sign-in keeps failing, check operator configuration and API logs."],
    retryable: false,
  };
}
function publicRoute(req: Request): boolean {
  if (req.method === "OPTIONS") return true;
  return (req.method === "GET" && (req.path === "/healthz" || req.path === "/auth/session"))
    || (req.method === "POST" && (req.path === "/auth/login" || req.path === "/auth/logout"));
}

/**
 * Browser session cookies are ambient credentials. Require a trustworthy Origin
 * for state-changing cookie-authenticated requests; CORS alone does not prevent
 * the server from processing cross-origin writes, and sibling subdomains can
 * be same-site for SameSite cookie purposes.
 */
export function isTrustedOperatorOrigin(
  req: Request,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const rawOrigin = firstHeaderValue(req.headers.origin).trim();
  if (!rawOrigin || rawOrigin === "null") return false;
  let parsed: URL;
  try { parsed = new URL(rawOrigin); } catch { return false; }
  if (parsed.origin !== rawOrigin || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) return false;
  if (env.NODE_ENV === "production" && parsed.protocol !== "https:") return false;

  const configuredOrigins = new Set((env.APEX_ALLOWED_ORIGINS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean));
  if (configuredOrigins.has(parsed.origin)) return true;

  const requestHost = firstHeaderValue(req.headers.host).trim().toLowerCase();
  if (!requestHost || parsed.host.toLowerCase() !== requestHost) return false;
  const requestScheme = env.NODE_ENV === "production"
    ? "https:"
    : (req.protocol === "https" ? "https:" : "http:");
  return parsed.protocol === requestScheme;
}

function hasValidBearerToken(req: Request, config: OperatorAuthConfig): boolean {
  const match = /^Bearer\\s+([^\\s]+)$/i.exec(firstHeaderValue(req.headers.authorization));
  return Boolean(match?.[1] && safeSecretEqual(match[1], config.apiToken));
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createRequireOperatorAuth(envProvider: () => Record<string, string | undefined> = () => process.env): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (publicRoute(req)) return next();
    res.setHeader("Cache-Control", "no-store");
    const env = envProvider();
    const config = readOperatorAuthConfig(env);
    if (!config) {
      return res.status(503).json({ code: "OPERATOR_AUTH_NOT_CONFIGURED", error: "Operator authentication is not configured.", userError: authError("OPERATOR_AUTH_NOT_CONFIGURED") });
    }
    // Bearer credentials are explicitly supplied by the caller, not attached by
    // the browser, so they do not use the ambient-cookie CSRF check.
    if (hasValidBearerToken(req, config)) return next();
    if (!SAFE_METHODS.has(req.method.toUpperCase()) && !isTrustedOperatorOrigin(req, env)) {
      return res.status(403).json({
        code: "OPERATOR_ORIGIN_REJECTED",
        error: "A trusted Origin is required for browser-session writes.",
        userError: {
          code: "OPERATOR_ORIGIN_REJECTED",
          severity: "critical",
          title: "Request origin was not accepted",
          message: "This state-changing request did not come from the configured Apex operator origin.",
          why: "Browser session cookies are ambient credentials and require an Origin check on state-changing requests.",
          nextSteps: ["Use the authenticated Apex desk origin.", "For a separate trusted frontend origin, configure APEX_ALLOWED_ORIGINS."],
          retryable: false,
        },
      });
    }
    if (!isOperatorAuthorized(req, config)) {
      return res.status(401).json({ code: "OPERATOR_AUTH_REQUIRED", error: "Operator authentication is required.", userError: authError("OPERATOR_AUTH_REQUIRED") });
    }
    return next();
  };
}
export const requireOperatorAuth = createRequireOperatorAuth();
