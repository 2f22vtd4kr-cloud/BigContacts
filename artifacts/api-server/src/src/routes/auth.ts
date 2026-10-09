import { Router } from "express";
import {
  API_SESSION_TTL_SECONDS,
  apiSessionCookieHeader,
  clearApiSessionCookieHeader,
  createApiSessionToken,
  isAllowedLoginOrigin,
  isApiAuthRequired,
  isApiCredentialValid,
} from "../lib/api-auth";

const router = Router();

function originAllowed(req: Parameters<Parameters<typeof router.post>[1]>[0]): boolean {
  return isAllowedLoginOrigin({
    origin: req.get("origin"),
    host: req.get("host"),
    env: process.env,
  });
}

router.get("/auth/session", (req, res) => {
  const required = isApiAuthRequired(process.env);
  const configured = Boolean(process.env.APEX_API_AUTH_TOKEN?.trim());
  const authenticated = !required || isApiCredentialValid({
    authorization: req.get("authorization"),
    cookie: req.get("cookie"),
    env: process.env,
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ authenticated, required, configured, expiresInSeconds: authenticated && required ? API_SESSION_TTL_SECONDS : null });
});

router.post("/auth/login", (req, res) => {
  if (!originAllowed(req)) {
    res.status(403).json({ error: "Login origin is not allowed.", code: "API_AUTH_ORIGIN_REJECTED" });
    return;
  }
  const secret = process.env.APEX_API_AUTH_TOKEN?.trim() ?? "";
  if (!secret) {
    res.status(503).json({ error: "API operator authentication is not configured.", code: "API_AUTH_NOT_CONFIGURED" });
    return;
  }
  const supplied = typeof req.body?.token === "string" ? req.body.token : "";
  if (!isApiCredentialValid({ authorization: `Bearer ${supplied}`, env: process.env })) {
    res.status(401).json({ error: "Invalid operator credential.", code: "API_AUTH_INVALID_CREDENTIAL" });
    return;
  }
  const session = createApiSessionToken(secret);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", apiSessionCookieHeader(session, process.env));
  res.status(200).json({ authenticated: true, expiresInSeconds: API_SESSION_TTL_SECONDS });
});

router.post("/auth/logout", (req, res) => {
  if (!originAllowed(req)) {
    res.status(403).json({ error: "Logout origin is not allowed.", code: "API_AUTH_ORIGIN_REJECTED" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", clearApiSessionCookieHeader(process.env));
  res.status(200).json({ authenticated: false });
});

export default router;
