import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { atlasApiAuth } from "../lib/api-auth";

describe("Atlas API authentication", () => {
  const original = process.env.APEX_API_AUTH_TOKEN;
  beforeEach(() => { process.env.APEX_API_AUTH_TOKEN = "test-token-123"; });
  afterEach(() => {
    if (original === undefined) delete process.env.APEX_API_AUTH_TOKEN;
    else process.env.APEX_API_AUTH_TOKEN = original;
  });
  const response = () => ({ status: vi.fn().mockReturnValue({ json: vi.fn() }) });
  it("rejects missing and invalid bearer tokens", () => {
    const next = vi.fn();
    atlasApiAuth({ get: vi.fn().mockReturnValue(undefined) } as any, response() as any, next);
    expect(next).not.toHaveBeenCalled();
    const invalidNext = vi.fn();
    atlasApiAuth({ get: vi.fn().mockReturnValue("Bearer wrong") } as any, response() as any, invalidNext);
    expect(invalidNext).not.toHaveBeenCalled();
  });
  it("accepts the configured bearer token", () => {
    const next = vi.fn();
    atlasApiAuth({ get: vi.fn().mockReturnValue("Bearer test-token-123") } as any, response() as any, next);
    expect(next).toHaveBeenCalledOnce();
  });
  it("fails open only when no deployment token is configured", () => {
    delete process.env.APEX_API_AUTH_TOKEN;
    const next = vi.fn();
    atlasApiAuth({ get: vi.fn() } as any, response() as any, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
