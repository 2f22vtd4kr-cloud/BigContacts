import { describe, expect, it } from "vitest";
import { authorizePythonSandboxRequest, getPythonSandboxState } from "../lib/python-sandbox-contract";

describe("python sandbox contract", () => {
  it("is fail-closed without trusted runtime attestation", () => {
    const state = getPythonSandboxState();
    expect(state.state).toBe("unavailable");
    expect(state.attestation).toBeNull();
    expect(state.reason).toMatch(/sandbox/i);
  });

  it("does not accept an environment-style opt-in as authorization", () => {
    const result = authorizePythonSandboxRequest({ capability: "network_osint", timeoutMs: 30_000, maxOutputBytes: 1_000_000, destinationPolicy: "approved-public-web-only" });
    expect(result.allowed).toBe(false);
    expect(result.attestation).toBeNull();
  });

  it("honors cancellation before sandbox authorization", () => {
    const controller = new AbortController();
    controller.abort();
    const result = authorizePythonSandboxRequest({ capability: "network_osint", timeoutMs: 30_000, maxOutputBytes: 1_000_000, destinationPolicy: "approved-public-web-only", signal: controller.signal });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("cancelled");
  });
});
