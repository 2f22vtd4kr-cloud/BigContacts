import { afterEach, describe, expect, it } from "vitest";
import {
  API_SESSION_COOKIE_NAME,
  API_SESSION_TTL_SECONDS,
  apiSessionCookieHeader,
  clearApiSessionCookieHeader,
  createApiSessionToken,
  isAllowedLoginOrigin,
  isApiAuthRequired,
  isApiCredentialValid,
  isPublicApiPath,
  verifyApiSessionToken,
} from "../lib/api-auth";

const SECRET = "test-only-operator-token-that-is-never-shipped-to-the-browser";

afterEach(() => {
  // These pure-function tests use explicit environments; leave process env untouched.
});

describe("operator API authentication", () => {
  it("requires authentication in production and whenever a server token is configured", () => {
    expect(isApiAuthRequired({ NODE_ENV: "production" })).toBe(true);
    expect(isApiAuthRequired({ NODE_ENV: "development", APEX_API_AUTH_TOKEN: SECRET })).toBe(true);
    expect(isApiAuthRequired({ NODE_ENV: "development" })).toBe(false);
  });

  it("accepts an exact bearer token without accepting lookalikes", () => {
    expect(isApiCredentialValid({ authorization: `Bearer ${SECRET}`, env: { APEX_API_AUTH_TOKEN: SECRET } })).toBe(true);
    expect(isApiCredentialValid({ authorization: `Bearer ${SECRET}x`, env: { APEX_API_AUTH_TOKEN: SECRET } })).toBe(false);
    expect(isApiCredentialValid({ authorization: SECRET, env: { APEX_API_AUTH_TOKEN: SECRET } })).toBe(false);
    expect(isApiCredentialValid({ authorization: `Bearer ${SECRET}`, env: {} })).toBe(false);
  });

  it("issues time-bounded, signed sessions and rejects tampering or expiry", () => {
    const now = Date.UTC(2026, 9, 9, 8, 0, 0);
    const session = createApiSessionToken(SECRET, now);
    expect(verifyApiSessionToken(session, SECRET, now)).toBe(true);
    expect(verifyApiSessionToken(session, `${SECRET}-wrong`, now)).toBe(false);
    expect(verifyApiSessionToken(`${session}x`, SECRET, now)).toBe(false);
    expect(verifyApiSessionToken(session, SECRET, now + (API_SESSION_TTL_SECONDS + 1) * 1_000)).toBe(false);
    expect(verifyApiSessionToken("not-a-session", SECRET, now)).toBe(false);
    expect(verifyApiSessionToken(session, "", now)).toBe(false);
  });

  it("authenticates from the HttpOnly cookie and ignores other cookies", () => {
    const now = Date.UTC(2026, 9, 9, 8, 0, 0);
    const session = createApiSessionToken(SECRET, now);
    expect(isApiCredentialValid({ cookie: `theme=dark; ${API_SESSION_COOKIE_NAME}=${session}`, env: { APEX_API_AUTH_TOKEN: SECRET }, nowMs: now })).toBe(true);
    expect(isApiCredentialValid({ cookie: "theme=dark", env: { APEX_API_AUTH_TOKEN: SECRET }, nowMs: now })).toBe(false);
  });

  it("marks only health and auth bootstrap routes public", () => {
    expect(isPublicApiPath("/healthz")).toBe(true);
    expect(isPublicApiPath("/auth/session")).toBe(true);
    expect(isPublicApiPath("/auth/login")).toBe(true);
    expect(isPublicApiPath("/auth/logout")).toBe(true);
    expect(isPublicApiPath("/healthz/details")).toBe(false);
    expect(isPublicApiPath("/system/status")).toBe(false);
    expect(isPublicApiPath("/entities")).toBe(false);
    expect(isPublicApiPath("/ingest/atlas-run")).toBe(false);
  });

  it("sets HttpOnly, SameSite, scoped, and expiring session cookies", () => {
    const header = apiSessionCookieHeader("signed.session", { NODE_ENV: "production" });
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Strict");
    expect(header).toContain("Path=/api");
    expect(header).toContain(`Max-Age=${API_SESSION_TTL_SECONDS}`);
    expect(header).toContain("Secure");
    expect(clearApiSessionCookieHeader({ NODE_ENV: "production" })).toContain("Max-Age=0");
  });

  it("requires a same-origin or explicitly configured login origin", () => {
    expect(isAllowedLoginOrigin({ origin: "https://apex.example", host: "apex.example", env: {} })).toBe(true);
    expect(isAllowedLoginOrigin({ origin: "https://evil.example", host: "apex.example", env: {} })).toBe(false);
    expect(isAllowedLoginOrigin({ origin: "https://desk.example", host: "apex.example", env: { APEX_ALLOWED_ORIGINS: "https://desk.example" } })).toBe(true);
    expect(isAllowedLoginOrigin({ env: {} })).toBe(true);
  });
});
