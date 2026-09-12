import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { verifyOperatorSession } from "../routes/auth";

const PUBLIC_PATHS = new Set(["/healthz", "/auth/login", "/auth/session"]);
const TOKEN_ENV = "APEX_API_AUTH_TOKEN";
const SESSION_COOKIE = "apex_session";

function configuredToken(): string {
  const token = process.env[TOKEN_ENV];
  if (!token || token.length < 32) throw new Error(`${TOKEN_ENV} must be configured with at least 32 characters`);
  return token;
}

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
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

/** Public API authentication. There is deliberately no CI/loopback bypass. */
export function apiAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path) || req.method === "OPTIONS") {
    next();
    return;
  }

  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (match) {
    let expected: string;
    try { expected = configuredToken(); }
    catch { res.status(503).json({ error: "API authentication is not configured" }); return; }
    if (tokenMatches(match[1], expected)) { next(); return; }
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

  res.status(401).json({ error: "Unauthorized" });
}

export const apiAuthTokenEnvironment = TOKEN_ENV;
