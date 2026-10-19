import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executePythonOsintTool,
  getAvailablePythonOsintActions,
  refreshPythonOsintToolAvailability,
  resetPythonOsintWorkerCacheForTests,
} from "./python-osint-worker-client";

const TOKEN = "test-worker-secret-which-is-not-a-production-key";

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableJson(record[key])).join(",") + "}";
}
function envelope(payload: unknown, secret = TOKEN) {
  const signature = createHmac("sha256", secret).update(stableJson(payload)).digest("hex");
  return { payload, signature };
}
function validAttestation(overrides: Record<string, unknown> = {}) {
  return {
    state: "attested",
    executorId: "unit-test-worker",
    networkNamespace: "kubernetes-egress-policy-apex-osint-v1",
    egressBroker: "apex-public-egress-proxy-v1",
    filesystemMode: "ephemeral-isolated",
    maxOutputBytes: 1_000_000,
    maxRuntimeMs: 120_000,
    allowedCapabilities: ["network_osint"],
    availableTools: ["maigret", "sherlock"],
    toolVersions: { maigret: "0.6.6", sherlock: "0.16.2" },
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    ...overrides,
  };
}
function response(payload: unknown, status = 200, sign = true): Response {
  return new Response(JSON.stringify(sign ? envelope(payload) : { payload, signature: "0".repeat(64) }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetPythonOsintWorkerCacheForTests();
});

describe("signed Python OSINT worker client", () => {
  it("advertises only tool actions attested by a valid signed worker", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    const fetchMock = vi.fn(async () => response(validAttestation()));
    vi.stubGlobal("fetch", fetchMock);

    const available = await refreshPythonOsintToolAvailability();

    expect(available.maigret).toBe(true);
    expect(available.sherlock).toBe(true);
    expect(available.holehe).toBe(false);
    expect(available.theharvester).toBe(false);
    expect(available.spiderfoot).toBe(false);
    expect(getAvailablePythonOsintActions()).toEqual([
      "footprint_username_maigret",
      "footprint_username_sherlock",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://worker.example.test/v1/attestation");
  });

  it("does not expose any tool when the signed attestation is invalid", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn(async () => response(validAttestation(), 200, false)));

    const available = await refreshPythonOsintToolAvailability();

    expect(Object.values(available).some(Boolean)).toBe(false);
    expect(getAvailablePythonOsintActions()).toEqual([]);
  });

  it("fails closed on expired proof and on an unexpected network boundary", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    const expired = validAttestation({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    vi.stubGlobal("fetch", vi.fn(async () => response(expired)));

    expect(Object.values(await refreshPythonOsintToolAvailability()).some(Boolean)).toBe(false);

    resetPythonOsintWorkerCacheForTests();
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "http://untrusted.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(Object.values(await refreshPythonOsintToolAvailability()).some(Boolean)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("authenticates execution requests and verifies the returned request/tool identity", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/v1/attestation")) return response(validAttestation());
      const body = JSON.parse(String(init?.body)) as { requestId: string; tool: string; args: Record<string, unknown> };
      const signature = String(new Headers(init?.headers).get("X-Apex-Request-Signature"));
      const expected = createHmac("sha256", TOKEN).update(stableJson(body)).digest("hex");
      expect(signature).toBe(expected);
      return response({
        requestId: body.requestId,
        tool: body.tool,
        status: "completed",
        toolVersion: "0.6.6",
        result: { found: [{ siteName: "Example", url: "https://example.test/alice", status: "found" }], totalSitesChecked: 1 },
        error: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await executePythonOsintTool({ tool: "maigret", args: { username: "alice" } });

    expect(result.status).toBe("completed");
    expect(result.tool).toBe("maigret");
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.result?.totalSitesChecked).toBe(1);
    expect(requests.map((request) => request.url)).toEqual([
      "https://worker.example.test/v1/attestation",
      "https://worker.example.test/v1/execute",
    ]);
  });

  it("does not accept a signed response correlated to another request", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/attestation")) return response(validAttestation());
      const body = JSON.parse(String(init?.body)) as { requestId: string; tool: string };
      return response({
        requestId: "wrong-request-id",
        tool: body.tool,
        status: "completed",
        toolVersion: "0.6.6",
        result: { found: [] },
        error: null,
        startedAt: null,
        finishedAt: null,
      });
    }));

    const result = await executePythonOsintTool({ tool: "maigret", args: { username: "alice" } });

    expect(result.status).toBe("failed");
    expect(result.result).toBeNull();
    expect(result.error).toMatch(/did not match the requested operation/i);
  });
});
