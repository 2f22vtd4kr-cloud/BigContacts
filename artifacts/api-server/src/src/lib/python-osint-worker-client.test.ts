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
    workerImageDigest: "sha256:" + "a".repeat(64),
    egressProxyImageDigest: "sha256:" + "b".repeat(64),
    isolationProofIssuedAt: new Date(Date.now() - 60_000).toISOString(),
    isolationProofExpiresAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
    issuedAt: new Date(Date.now() - 1_000).toISOString(),
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
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(validAttestation()));
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
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    vi.stubGlobal("fetch", vi.fn(async () => response(validAttestation(), 200, false)));

    const available = await refreshPythonOsintToolAvailability();

    expect(Object.values(available).some(Boolean)).toBe(false);
    expect(getAvailablePythonOsintActions()).toEqual([]);
  });

  it("fails closed on expired proof and on an unexpected network boundary", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
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
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/v1/attestation")) return response(validAttestation());
      const body = JSON.parse(String(init?.body)) as { requestId: string; tool: string; args: Record<string, unknown>; correlation?: Record<string, unknown> };
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
        startedAt: new Date(Date.now() - 1_000).toISOString(),
        finishedAt: new Date().toISOString(),
        executorId: "unit-test-worker", workerImageDigest: "sha256:" + "a".repeat(64),
        egressProxyImageDigest: "sha256:" + "b".repeat(64),
        isolationProofIssuedAt: new Date(Date.now() - 60_000).toISOString(),
        isolationProofExpiresAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
        correlation: body.correlation ?? {},
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await executePythonOsintTool({ tool: "maigret", args: { username: "alice" } });

    expect(result.status).toBe("completed");
    expect(result.tool).toBe("maigret");
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.result?.totalSitesChecked).toBe(1);
    expect(result.workerImageDigest).toBe("sha256:" + "a".repeat(64));
    expect(result.egressProxyImageDigest).toBe("sha256:" + "b".repeat(64));
    expect(requests.map((request) => request.url)).toEqual([
      "https://worker.example.test/v1/attestation",
      "https://worker.example.test/v1/execute",
    ]);
  });

  it("does not accept a signed response correlated to another request", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
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
        executorId: "unit-test-worker", workerImageDigest: "sha256:" + "a".repeat(64),
        egressProxyImageDigest: "sha256:" + "b".repeat(64),
        isolationProofIssuedAt: new Date(Date.now() - 60_000).toISOString(),
        isolationProofExpiresAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
        correlation: {},
      });
    }));

    const result = await executePythonOsintTool({ tool: "maigret", args: { username: "alice" } });

    expect(result.status).toBe("failed");
    expect(result.result).toBeNull();
    expect(result.error).toMatch(/did not match the requested operation/i);
  });
  it("maps all five canonical actions only from the signed worker tool list", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    vi.stubGlobal("fetch", vi.fn(async () => response(validAttestation({
      availableTools: ["holehe", "maigret", "sherlock", "theharvester", "spiderfoot"],
      toolVersions: { holehe: "pinned", maigret: "0.6.6", sherlock: "0.16.2", theharvester: "4.11.1", spiderfoot: "4.0" },
    }))));
    const available = await refreshPythonOsintToolAvailability();
    expect(Object.values(available).every(Boolean)).toBe(true);
    expect(getAvailablePythonOsintActions()).toEqual([
      "footprint_email", "footprint_username_maigret", "footprint_username_sherlock", "harvest_domain", "footprint_spiderfoot",
    ]);
  });

  it("fails closed when API-side immutable image pins are absent", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn(async () => response(validAttestation())));
    expect(Object.values(await refreshPythonOsintToolAvailability()).some(Boolean)).toBe(false);
  });

  it("fails closed when a signed attestation advertises a mutable proxy image", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    vi.stubGlobal("fetch", vi.fn(async () => response(validAttestation({ egressProxyImageDigest: "replace-before-apply" }))));
    expect(Object.values(await refreshPythonOsintToolAvailability()).some(Boolean)).toBe(false);
  });

  it("requests remote cancellation when the API-side execution deadline expires", async () => {
    vi.useFakeTimers();
    try {
      vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
      vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
      vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
      vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
      const urls: string[] = [];
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        if (url.endsWith("/v1/attestation")) return response(validAttestation());
        if (url.endsWith("/v1/cancel")) {
          const payload = JSON.parse(String(init?.body)) as { requestId: string };
          return response({ requestId: payload.requestId, status: "cancelled" });
        }
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("Sandbox worker request timed out.")), { once: true });
        });
      });
      vi.stubGlobal("fetch", fetchMock);
      const pending = executePythonOsintTool({
        tool: "maigret", args: { username: "alice" }, timeoutMs: 1_000,
      });
      await vi.waitFor(() => expect(urls).toContain("https://worker.example.test/v1/execute"));
      await vi.advanceTimersByTimeAsync(3_000);
      const outcome = await pending;
      expect(outcome.status).toBe("timeout");
      expect(outcome.remoteCancellationConfirmed).toBe(true);
      expect(urls).toContain("https://worker.example.test/v1/cancel");
    } finally {
      vi.useRealTimers();
    }
  });

  it("requests and validates remote cancellation when an in-flight action is aborted", async () => {
    vi.stubEnv("APEX_PYTHON_SANDBOX_URL", "https://worker.example.test");
    vi.stubEnv("APEX_PYTHON_SANDBOX_TOKEN", TOKEN);
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST", "sha256:" + "a".repeat(64));
    vi.stubEnv("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST", "sha256:" + "b".repeat(64));
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("/v1/attestation")) return response(validAttestation());
      if (url.endsWith("/v1/cancel")) {
        const payload = JSON.parse(String(init?.body)) as { requestId: string };
        return response({ requestId: payload.requestId, status: "cancelled" });
      }
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const pending = executePythonOsintTool({ tool: "maigret", args: { username: "alice" }, signal: controller.signal });
    await vi.waitFor(() => expect(urls).toContain("https://worker.example.test/v1/execute"));
    controller.abort();
    const outcome = await pending;
    expect(outcome.status).toBe("cancelled");
    expect(outcome.remoteCancellationConfirmed).toBe(true);
    expect(urls).toContain("https://worker.example.test/v1/cancel");
  });

});
