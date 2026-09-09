import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Express strips the mount path (/api) before evaluating req.path inside
// app.use("/api", apiAuth, router). The health router therefore appears as
// /healthz here, not /api/healthz.
const PUBLIC_PATHS = new Set(["/healthz"]);
const TOKEN_ENV = "APEX_API_AUTH_TOKEN";

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

/**
 * Protect the public API with an operator-controlled bearer token.
 * Health remains public for deployment probes; CORS preflight is allowed to
 * complete without credentials. Everything else fails closed when the token
 * is absent or invalid.
 *
 * GitHub Actions runs local proof services on an isolated runner and already
 * sets CI=true. Those non-production probes retain their existing localhost
 * contract without introducing a reusable credential into workflow files.
 */
export function apiAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path) || req.method === "OPTIONS") {
    next();
    return;
  }

  if (process.env.CI === "true" && process.env.NODE_ENV !== "production") {
    next();
    return;
  }

  let expected: string;
  try {
    expected = configuredToken();
  } catch {
    res.status(503).json({ error: "API authentication is not configured" });
    return;
  }

  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !tokenMatches(match[1], expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export const apiAuthTokenEnvironment = TOKEN_ENV;
