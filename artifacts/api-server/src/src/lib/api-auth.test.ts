import { describe, expect, it, vi, afterEach } from "vitest";
import { apiAuth } from "./api-auth";

describe("apiAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows /healthz because middleware runs under the /api mount", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APEX_API_AUTH_TOKEN", "a".repeat(32));
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    apiAuth({ path: "/healthz", method: "GET", header: vi.fn() } as any, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("still protects non-public API paths", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APEX_API_AUTH_TOKEN", "a".repeat(32));
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    apiAuth({ path: "/entities", method: "GET", header: vi.fn().mockReturnValue(undefined) } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("never lets CI=true bypass auth for a non-loopback caller", () => {
    vi.stubEnv("CI", "true");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APEX_API_AUTH_TOKEN", "a".repeat(32));
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    apiAuth({ path: "/entities", method: "GET", ip: "203.0.113.10", header: vi.fn().mockReturnValue(undefined) } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("allows CI proof traffic from loopback", () => {
    vi.stubEnv("CI", "true");
    vi.stubEnv("NODE_ENV", "test");
    const next = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    apiAuth({ path: "/entities", method: "GET", ip: "127.0.0.1", header: vi.fn() } as any, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
