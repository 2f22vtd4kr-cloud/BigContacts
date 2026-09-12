import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";

const router = Router();
const COOKIE_NAME = "apex_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_ENV = "APEX_OPERATOR_PASSWORD";
const SECRET_ENV = "APEX_SESSION_SECRET";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_LIMIT = 8;
const MAX_LOGIN_TRACKERS = 4096;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

function requiredEnv(name: string, minimum: number): string | null {
  const value = process.env[name]?.trim() ?? "";
  return value.length >= minimum ? value : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeSession(secret: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `operator.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.header("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    const raw = rest.join("=");
    if (raw.length > 512) return undefined;
    try { return decodeURIComponent(raw); }
    catch { return undefined; }
  }
  return undefined;
}

function cookieSecure(req: Request): boolean {
  const forwarded = String(req.header("x-forwarded-proto") ?? "").split(",")[0]?.trim().toLowerCase();
  return req.secure || forwarded === "https";
}

function loginRateLimited(req: Request): boolean {
  const now = Date.now();
  const key = String(req.ip || "unknown");
  const current = loginFailures.get(key);
  if (!current || current.resetAt <= now) {
    if (loginFailures.size >= MAX_LOGIN_TRACKERS) {
      const oldest = loginFailures.keys().next().value;
      if (oldest) loginFailures.delete(oldest);
    }
    loginFailures.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return current.count >= LOGIN_FAILURE_LIMIT;
}

function recordLoginFailure(req: Request): void {
  const now = Date.now();
  const key = String(req.ip || "unknown");
  const current = loginFailures.get(key);
  if (!current || current.resetAt <= now) {
    loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

function clearLoginFailures(req: Request): void {
  loginFailures.delete(String(req.ip || "unknown"));
}

export function verifyOperatorSession(value: string | undefined): boolean {
  const secret = requiredEnv(SECRET_ENV, 32);
  if (!secret || !value || value.length > 512) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "operator") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  const provided = Buffer.from(parts[2]!, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return provided.length === expectedBytes.length && timingSafeEqual(provided, expectedBytes);
}

function setSessionCookie(res: Response, token: string, secure: boolean): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/api; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`);
}

router.post("/auth/login", (req, res): void => {
  if (loginRateLimited(req)) {
    res.status(429).json({ error: "Too many failed login attempts; try again later." });
    return;
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expected = requiredEnv(PASSWORD_ENV, 16);
  const secret = requiredEnv(SECRET_ENV, 32);
  if (!expected || !secret) {
    res.status(503).json({ error: "Operator authentication is not configured" });
    return;
  }
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    recordLoginFailure(req);
    res.status(401).json({ error: "Invalid operator credentials" });
    return;
  }
  clearLoginFailures(req);
  setSessionCookie(res, makeSession(secret), cookieSecure(req));
  res.json({ authenticated: true, expiresInSeconds: SESSION_TTL_SECONDS });
});

router.post("/auth/logout", (_req, res): void => {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/api; HttpOnly; SameSite=Strict`);
  res.json({ authenticated: false });
});

router.get("/auth/session", (req, res): void => {
  res.json({ authenticated: verifyOperatorSession(readCookie(req, COOKIE_NAME)) });
});

export default router;
