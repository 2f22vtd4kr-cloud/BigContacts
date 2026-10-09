import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import {
  createOperatorSessionToken, createRequireOperatorAuth, isOperatorAuthorized,
  missingOperatorAuthNames, readOperatorAuthConfig, safeSecretEqual,
  verifyOperatorSessionToken, isTrustedOperatorOrigin, OPERATOR_SESSION_COOKIE, OPERATOR_SESSION_TTL_SECONDS,
  type OperatorAuthConfig,
} from "../lib/operator-auth";
const ENV: Record<string, string> = {
  APEX_API_AUTH_TOKEN: "a".repeat(40),
  APEX_OPERATOR_PASSWORD: "operator-password-long-enough",
  APEX_SESSION_SECRET: "s".repeat(40),
};
const config = readOperatorAuthConfig(ENV) as OperatorAuthConfig;
function request(input: { method?: string; path?: string; headers?: Record<string, string>; socket?: { remoteAddress?: string } } = {}) {
  return { method: input.method ?? "GET", path: input.path ?? "/entities", headers: input.headers ?? {}, socket: input.socket ?? { remoteAddress: "127.0.0.1" } } as unknown as Request;
}
function response() {
  const result: { statusCode: number; headers: Record<string, string>; body: unknown } = { statusCode: 200, headers: {}, body: null };
  const target = {
    setHeader(name: string, value: string) { result.headers[name.toLowerCase()] = value; return target; },
    status(code: number) { result.statusCode = code; return target; },
    json(body: unknown) { result.body = body; return target; },
  };
  return { result, value: target as unknown as Response };
}
describe("operator authentication boundary", () => {
  it("fails closed when a required secret is missing or too short", () => {
    expect(readOperatorAuthConfig({ ...ENV, APEX_API_AUTH_TOKEN: "short" })).toBeNull();
    expect(missingOperatorAuthNames({ ...ENV, APEX_SESSION_SECRET: "" })).toContain("APEX_SESSION_SECRET");
    expect(missingOperatorAuthNames(ENV)).toEqual([]);
  });
  it("compares secrets safely without accepting a different-length prefix", () => {
    expect(safeSecretEqual("same-secret", "same-secret")).toBe(true);
    expect(safeSecretEqual("same-secret", "same-secret-extra")).toBe(false);
    expect(safeSecretEqual("same-secret", "different")).toBe(false);
  });
  it("accepts a valid signed session until its 12-hour expiry and rejects tampering", () => {
    const now = 1_800_000_000, token = createOperatorSessionToken(config, now);
    expect(verifyOperatorSessionToken(token, config.sessionSecret, now + 5)).toBe(true);
    expect(verifyOperatorSessionToken(token, config.sessionSecret, now + OPERATOR_SESSION_TTL_SECONDS)).toBe(false);
    const last = token.at(-1) === "0" ? "1" : "0";
    expect(verifyOperatorSessionToken(token.slice(0, -1) + last, config.sessionSecret, now + 5)).toBe(false);
    expect(verifyOperatorSessionToken(token, "x".repeat(40), now + 5)).toBe(false);
    expect(verifyOperatorSessionToken("not-a-session", config.sessionSecret, now)).toBe(false);
  });
  it("accepts the exact API bearer token or an unexpired session cookie", () => {
    expect(isOperatorAuthorized(request({ headers: { authorization: "Bearer " + config.apiToken } }), config)).toBe(true);
    expect(isOperatorAuthorized(request({ headers: { authorization: "Bearer " + config.apiToken.slice(0, -1) + "x" } }), config)).toBe(false);
    const token = createOperatorSessionToken(config);
    expect(isOperatorAuthorized(request({ headers: { cookie: OPERATOR_SESSION_COOKIE + "=" + token } }), config)).toBe(true);
  });
  it("leaves health/session bootstrap public but fails closed on data routes", () => {
    const guard = createRequireOperatorAuth(() => ({}));
    const health = response(); let healthNext = 0;
    guard(request({ method: "GET", path: "/healthz" }), health.value, (() => { healthNext += 1; }) as never);
    expect(healthNext).toBe(1);
    const session = response(); let sessionNext = 0;
    guard(request({ method: "GET", path: "/auth/session" }), session.value, (() => { sessionNext += 1; }) as never);
    expect(sessionNext).toBe(1);
    const protectedResponse = response(); let protectedNext = 0;
    guard(request({ method: "GET", path: "/entities" }), protectedResponse.value, (() => { protectedNext += 1; }) as never);
    expect(protectedResponse.result.statusCode).toBe(503);
    expect((protectedResponse.result.body as { code: string }).code).toBe("OPERATOR_AUTH_NOT_CONFIGURED");
    expect(protectedNext).toBe(0);
  });
  it("rejects cookie-authenticated writes with absent or untrusted Origin", () => {
    const guard = createRequireOperatorAuth(() => ({ ...ENV, NODE_ENV: "test" }));
    const cookie = OPERATOR_SESSION_COOKIE + "=" + createOperatorSessionToken(config);
    for (const origin of ["", "http://evil.example.test"]) {
      const res = response(); let next = 0;
      guard(request({ method: "POST", headers: { cookie, host: "apex.example.test", ...(origin ? { origin } : {}) } }), res.value, (() => { next += 1; }) as never);
      expect(res.result.statusCode).toBe(403);
      expect((res.result.body as { code: string }).code).toBe("OPERATOR_ORIGIN_REJECTED");
      expect(next).toBe(0);
    }
  });
  it("accepts same-origin and explicitly allowlisted session writes", () => {
    const cookie = OPERATOR_SESSION_COOKIE + "=" + createOperatorSessionToken(config);
    const sameOrigin = createRequireOperatorAuth(() => ({ ...ENV, NODE_ENV: "test" }));
    const sameRes = response(); let sameNext = 0;
    sameOrigin(request({ method: "POST", headers: { cookie, origin: "http://apex.example.test", host: "apex.example.test" } }), sameRes.value, (() => { sameNext += 1; }) as never);
    expect(sameRes.result.statusCode).toBe(200);
    expect(sameNext).toBe(1);

    const allowlisted = createRequireOperatorAuth(() => ({ ...ENV, NODE_ENV: "production", APEX_ALLOWED_ORIGINS: "https://console.example.test" }));
    const allowedRes = response(); let allowedNext = 0;
    allowlisted(request({ method: "POST", headers: { cookie, origin: "https://console.example.test", host: "api.example.test" } }), allowedRes.value, (() => { allowedNext += 1; }) as never);
    expect(allowedRes.result.statusCode).toBe(200);
    expect(allowedNext).toBe(1);
  });
  it("does not apply the ambient-cookie Origin check to explicit bearer clients", () => {
    const guard = createRequireOperatorAuth(() => ({ ...ENV, NODE_ENV: "production" }));
    const res = response(); let next = 0;
    guard(request({ method: "POST", headers: { authorization: "Bearer " + config.apiToken, origin: "https://evil.example.test", host: "api.example.test" } }), res.value, (() => { next += 1; }) as never);
    expect(res.result.statusCode).toBe(200);
    expect(next).toBe(1);
  });
  it("validates only canonical HTTP(S) Origins and exact configured origins", () => {
    expect(isTrustedOperatorOrigin(request({ method: "POST", headers: { origin: "http://apex.example.test", host: "apex.example.test" } }), { ...ENV, NODE_ENV: "test" })).toBe(true);
    expect(isTrustedOperatorOrigin(request({ method: "POST", headers: { origin: "null", host: "apex.example.test" } }), { ...ENV, NODE_ENV: "test" })).toBe(false);
    expect(isTrustedOperatorOrigin(request({ method: "POST", headers: { origin: "http://apex.example.test.evil.test", host: "apex.example.test" } }), { ...ENV, NODE_ENV: "test" })).toBe(false);
    expect(isTrustedOperatorOrigin(request({ method: "POST", headers: { origin: "http://apex.example.test/path", host: "apex.example.test" } }), { ...ENV, NODE_ENV: "test" })).toBe(false);
  });
  it("rejects unsigned requests once required controls are configured", () => {
    const guard = createRequireOperatorAuth(() => ENV);
    const res = response(); let next = 0;
    guard(request(), res.value, (() => { next += 1; }) as never);
    expect(res.result.statusCode).toBe(401);
    expect((res.result.body as { userError: { code: string } }).userError.code).toBe("OPERATOR_AUTH_REQUIRED");
    expect(next).toBe(0);
  });
});
