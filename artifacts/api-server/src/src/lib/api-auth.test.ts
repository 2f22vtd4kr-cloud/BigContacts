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
});
