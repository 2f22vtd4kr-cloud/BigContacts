import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";

const router = Router();
const COOKIE_NAME = "apex_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const PASSWORD_ENV = "APEX_OPERATOR_PASSWORD";
const SECRET_ENV = "APEX_SESSION_SECRET";

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

export function verifyOperatorSession(value: string | undefined): boolean {
  const secret = requiredEnv(SECRET_ENV, 32);
  if (!secret || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "operator") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  const provided = Buffer.from(parts[2]!, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return provided.length === expectedBytes.length && timingSafeEqual(provided, expectedBytes);
}

function cookieSecure(req: Parameters<Router["post"]>[0]): boolean {
  const forwarded = String(req.header("x-forwarded-proto") ?? "").split(",")[0]?.trim().toLowerCase();
  return req.secure || forwarded === "https";
}

function setSessionCookie(res: Parameters<Router["post"]>[1], token: string, secure: boolean): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/api; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`);
}

router.post("/auth/login", (req, res): void => {
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
    res.status(401).json({ error: "Invalid operator credentials" });
    return;
  }
  setSessionCookie(res, makeSession(secret), cookieSecure(req));
  res.json({ authenticated: true, expiresInSeconds: SESSION_TTL_SECONDS });
});

router.post("/auth/logout", (_req, res): void => {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/api; HttpOnly; SameSite=Strict`);
  res.json({ authenticated: false });
});

router.get("/auth/session", (req, res): void => {
  res.json({ authenticated: verifyOperatorSession(req.cookies?.[COOKIE_NAME]) });
});

export default router;
