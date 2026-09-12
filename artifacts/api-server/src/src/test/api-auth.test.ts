import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { apiAuth } from "../lib/api-auth";

type TestResponse = Response & { statusCode: number; jsonBody: unknown };

function run(path: string, method: string, authorization?: string) {
  const req = { path, method, header(name: string) { return name.toLowerCase() === "authorization" ? authorization : undefined; } } as unknown as Request;
  const response = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    jsonBody: undefined as unknown,
    json(body: unknown) { this.jsonBody = body; return this; },
  } as unknown as TestResponse;
  let nextCalled = false;
  const next = (() => { nextCalled = true; }) as NextFunction;
  apiAuth(req, response, next);
  return { response, nextCalled };
}

beforeEach(() => { delete process.env.CI; process.env.NODE_ENV = "test"; });
afterEach(() => { delete process.env.APEX_API_AUTH_TOKEN; delete process.env.CI; delete process.env.NODE_ENV; });

describe("API authentication", () => {
  it("leaves health probes public", () => { expect(run("/api/healthz", "GET").nextCalled).toBe(true); });
  it("fails closed when the token is not configured", () => { const result = run("/api/entities", "GET"); expect(result.nextCalled).toBe(false); expect(result.response.statusCode).toBe(503); });
  it("rejects missing and incorrect credentials", () => { process.env.APEX_API_AUTH_TOKEN = "x".repeat(32); expect(run("/api/entities", "GET").response.statusCode).toBe(401); expect(run("/api/entities", "GET", "Bearer wrong").response.statusCode).toBe(401); });
  it("accepts the configured bearer token", () => { const token = "x".repeat(32); process.env.APEX_API_AUTH_TOKEN = token; expect(run("/api/entities", "GET", `Bearer ${token}`).nextCalled).toBe(true); });
  it("allows only the explicit non-production CI compatibility boundary", () => { process.env.CI = "true"; process.env.NODE_ENV = "development"; expect(run("/api/entities", "GET").nextCalled).toBe(true); process.env.NODE_ENV = "production"; expect(run("/api/entities", "GET").response.statusCode).toBe(503); });
});
