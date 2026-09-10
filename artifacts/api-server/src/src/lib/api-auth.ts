import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { verifyOperatorSession } from "../routes/auth";

// Express strips the mount path (/api) before evaluating req.path inside
// app.use("/api", apiAuth, router). Public auth endpoints are intentionally
// available so a browser can establish the HttpOnly operator session.
const PUBLIC_PATHS = new Set(["/healthz", "/auth/login", "/auth/session"]);
const TOKEN_ENV = "APEX_API_AUTH_TOKEN";
const SESSION_COOKIE = "apex_session";

function configuredToken(): string {
  const token = process.env[TOKEN_ENV];
  if (!token || token.length < 32) {
    throw new Error(`${TOKEN_ENV} must be configured with at least 32 characters`);
  }
  return token;
}

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isLoopbackAddress(value: string | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "127.0.0.1"
    || normalized === "::1"
    || normalized === "::ffff:127.0.0.1";
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.header("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function sameOrigin(req: Request): boolean {
  const origin = req.header("origin");
  if (!origin) return false;
  const forwardedProto = String(req.header("x-forwarded-proto") ?? "").split(",")[0]?.trim();
  const proto = forwardedProto || (req.secure ? "https" : "http");
  const host = req.header("host");
  if (!host) return false;
  return origin === `${proto}://${host}`;
}

/**
 * Protect the public API with an operator-controlled bearer token or a
 * browser-safe HttpOnly operator session. Health and auth bootstrap remain
 * public; CORS preflight is allowed to complete without credentials.
 *
 * Browser sessions are accepted only with same-origin state-changing requests,
 * preventing a cross-site page from turning the HttpOnly cookie into a write
 * primitive. External automation can continue using the bearer token.
 *
 * GitHub Actions local proof services may rely on the CI bypass, but only
 * loopback callers are eligible. CI=true must never turn a publicly reachable
 * staging/API process into an unauthenticated API.
 */
export function apiAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path) || req.method === "OPTIONS") {
    next();
    return;
  }

  if (
    process.env.CI === "true"
    && process.env.NODE_ENV !== "production"
    && isLoopbackAddress(req.ip)
  ) {
    next();
    return;
  }

  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (match) {
    let expected: string;
    try {
      expected = configuredToken();
    } catch {
      res.status(503).json({ error: "API authentication is not configured" });
      return;
    }
    if (tokenMatches(match[1], expected)) {
      next();
      return;
    }
  }

  const session = readCookie(req, SESSION_COOKIE);
  if (verifyOperatorSession(session)) {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !sameOrigin(req)) {
      res.status(403).json({ error: "Cross-site mutation blocked" });
      return;
    }
    next();
    return;
  }

  // Preserve the old fail-closed behavior when neither credential form is valid.
  // A missing bearer token never becomes an implicit anonymous session.
  res.status(401).json({ error: "Unauthorized" });
}

export const apiAuthTokenEnvironment = TOKEN_ENV;
