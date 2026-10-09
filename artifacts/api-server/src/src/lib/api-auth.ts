import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export const API_SESSION_COOKIE_NAME = "apex_operator_session";
export const API_SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface ApiAuthEnvironment {
  APEX_API_AUTH_TOKEN?: string;
  APEX_ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
}

function configuredSecret(env: ApiAuthEnvironment = process.env): string {
  return (env.APEX_API_AUTH_TOKEN ?? "").trim();
}

function constantTimeEqual(actual: string, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualDigest = createHmac("sha256", "apex-api-auth-compare").update(actual).digest();
  const expectedDigest = createHmac("sha256", "apex-api-auth-compare").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest) && actual.length === expected.length;
}

export function isApiAuthRequired(env: ApiAuthEnvironment = process.env): boolean {
  return env.NODE_ENV === "production" || Boolean(configuredSecret(env));
}

export function createApiSessionToken(secret: string, nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1_000) + API_SESSION_TTL_SECONDS;
  const signature = createHmac("sha256", secret).update(`apex-api-session:v1:${expiresAt}`).digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function verifyApiSessionToken(token: string, secret: string, nowMs = Date.now()): boolean {
  if (!token || !secret) return false;
  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return false;
  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  const nowSeconds = Math.floor(nowMs / 1_000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds || expiresAt > nowSeconds + API_SESSION_TTL_SECONDS + 1) return false;
  const expected = createHmac("sha256", secret).update(`apex-api-session:v1:${expiresAt}`).digest("base64url");
  return constantTimeEqual(signature, expected);
}

function cookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

export function isApiCredentialValid(input: {
  authorization?: string;
  cookie?: string;
  env?: ApiAuthEnvironment;
  nowMs?: number;
}): boolean {
  const env = input.env ?? process.env;
  const secret = configuredSecret(env);
  if (!secret) return false;
  const authorization = input.authorization ?? "";
  if (/^Bearer\s+/i.test(authorization)) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (constantTimeEqual(token, secret)) return true;
  }
  const session = cookieValue(input.cookie, API_SESSION_COOKIE_NAME);
  return session ? verifyApiSessionToken(session, secret, input.nowMs) : false;
}

export function isPublicApiPath(path: string): boolean {
  return path === "/healthz"
    || path === "/auth/session"
    || path === "/auth/login"
    || path === "/auth/logout";
}

export const apiAuthMiddleware: RequestHandler = (req, res, next) => {
  if (isPublicApiPath(req.path)) {
    next();
    return;
  }

  const env: ApiAuthEnvironment = process.env;
  const secret = configuredSecret(env);
  if (!secret && env.NODE_ENV !== "production") {
    next();
    return;
  }
  if (!secret) {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({
      error: "API operator authentication is not configured.",
      code: "API_AUTH_NOT_CONFIGURED",
    });
    return;
  }
  if (!isApiCredentialValid({ authorization: req.get("authorization"), cookie: req.get("cookie"), env })) {
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({
      error: "Operator authentication is required.",
      code: "API_AUTH_REQUIRED",
    });
    return;
  }
  next();
};

export function isAllowedLoginOrigin(input: {
  origin?: string;
  host?: string;
  env?: ApiAuthEnvironment;
}): boolean {
  if (!input.origin) return true;
  try {
    const origin = new URL(input.origin);
    if (input.host && origin.host.toLowerCase() === input.host.toLowerCase()) return true;
  } catch {
    return false;
  }
  const allowed = (input.env?.APEX_ALLOWED_ORIGINS ?? process.env.APEX_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(input.origin);
}

export function apiSessionCookieHeader(token: string, env: ApiAuthEnvironment = process.env): string {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return `${API_SESSION_COOKIE_NAME}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${API_SESSION_TTL_SECONDS}${secure}`;
}

export function clearApiSessionCookieHeader(env: ApiAuthEnvironment = process.env): string {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  return `${API_SESSION_COOKIE_NAME}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
