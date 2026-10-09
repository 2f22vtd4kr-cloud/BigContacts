import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { safeOutboundFetchMock } = vi.hoisted(() => ({
  safeOutboundFetchMock: vi.fn(),
}));

vi.mock("../lib/ssrf-safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/ssrf-safe-fetch")>()),
  safeOutboundFetch: safeOutboundFetchMock,
}));

import { domainSurfaceExecutionStatus, lookupDomainSurface } from "../lib/domain-surface";
import { resetProviderGateForTests } from "../lib/provider-gate";

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

function rdapResponse(): Response {
  return new Response(JSON.stringify({
    events: [
      { eventAction: "registration", eventDate: "2024-03-01T00:00:00Z" },
      { eventAction: "expiration", eventDate: "2028-03-01T00:00:00Z" },
    ],
    entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "Example Registry"]]] }],
    status: ["active"],
  }), { status: 200, headers: { "content-type": "application/rdap+json" } });
}

function requestedUrls(): string[] {
  return safeOutboundFetchMock.mock.calls.map(([url]) => String(url));
}

beforeEach(() => {
  safeOutboundFetchMock.mockReset();
  resetProviderGateForTests();
  vi.stubEnv("APEX_PROVIDER_MAX_REQUESTS_RDAP", "32");
  vi.stubEnv("APEX_PROVIDER_MIN_INTERVAL_MS_RDAP", "0");
  vi.stubEnv("APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE", "128");
});

afterEach(() => {
  resetProviderGateForTests();
  vi.unstubAllEnvs();
});

describe("RDAP redirect correctness and provenance", () => {
  it("follows a bounded HTTPS redirect to the authoritative RDAP service and preserves its source URL", async () => {
    safeOutboundFetchMock
      .mockResolvedValueOnce(redirect("https://registry.example/rdap/domain/example.org"))
      .mockResolvedValueOnce(rdapResponse());

    const surface = await lookupDomainSurface("example.org", { provider: "rdap" });

    expect(requestedUrls()).toEqual([
      "https://rdap.org/domain/example.org",
      "https://registry.example/rdap/domain/example.org",
    ]);
    expect(surface.rdap).toMatchObject({
      ok: true,
      source: "rdap",
      sourceUrl: "https://registry.example/rdap/domain/example.org",
      registration: "2024-03-01T00:00:00Z",
      expiration: "2028-03-01T00:00:00Z",
      registrarName: "Example Registry",
      status: ["active"],
    });
    expect(surface.summary).toContain("status active");
    expect(domainSurfaceExecutionStatus(surface, "rdap")).toBe("success");
  });

  it("rejects an HTTPS-to-HTTP downgrade before requesting the redirect target", async () => {
    safeOutboundFetchMock.mockResolvedValueOnce(redirect("http://registry.example/rdap/domain/example.org"));

    const surface = await lookupDomainSurface("example.org", { provider: "rdap" });

    expect(surface.rdap.ok).toBe(false);
    expect(surface.rdap.error).toContain("target must use HTTPS");
    expect(requestedUrls()).toEqual(["https://rdap.org/domain/example.org"]);
    expect(domainSurfaceExecutionStatus(surface, "rdap")).toBe("error");
  });

  it("rejects redirect loops without making a duplicate request", async () => {
    const repeated = "https://registry.example/rdap/domain/example.org";
    safeOutboundFetchMock
      .mockResolvedValueOnce(redirect(repeated))
      .mockResolvedValueOnce(redirect(repeated));

    const surface = await lookupDomainSurface("example.org", { provider: "rdap" });

    expect(surface.rdap.ok).toBe(false);
    expect(surface.rdap.error).toContain("redirect loop");
    expect(requestedUrls()).toEqual(["https://rdap.org/domain/example.org", repeated]);
  });

  it("bounds redirect chains and never silently treats an HTTP failure as a successful lookup", async () => {
    safeOutboundFetchMock.mockImplementation(async (input: string | URL | Request) => {
      const previous = new URL(String(input));
      const next = new URL(previous.href);
      next.hostname = "rdap-hop-" + requestedUrls().length + ".example";
      return redirect(next.toString());
    });

    const chain = await lookupDomainSurface("example.net", { provider: "rdap" });

    expect(chain.rdap.ok).toBe(false);
    expect(chain.rdap.error).toContain("redirect limit exceeded");
    expect(requestedUrls()).toHaveLength(5);
    expect(domainSurfaceExecutionStatus(chain, "rdap")).toBe("error");

    safeOutboundFetchMock.mockReset();
    safeOutboundFetchMock.mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }));
    const failed = await lookupDomainSurface("example.org", { provider: "rdap" });
    expect(failed.rdap).toMatchObject({ ok: false, error: "rdap 503" });
    expect(domainSurfaceExecutionStatus(failed, "rdap")).toBe("error");
  });

  it("does not expose credential-bearing redirect URLs as source evidence", async () => {
    safeOutboundFetchMock
      .mockResolvedValueOnce(redirect("https://registry.example/rdap/domain/example.org?api_key=should-not-be-exposed"))
      .mockResolvedValueOnce(rdapResponse());

    const surface = await lookupDomainSurface("example.org", { provider: "rdap" });

    expect(surface.rdap.ok).toBe(true);
    expect(surface.rdap.sourceUrl).toBeUndefined();
    expect(requestedUrls()).toHaveLength(2);
  });

  it("reports a failed WhoisJSON provider result as an error rather than success", () => {
    const empty = {
      domain: "example.org",
      rdap: { ok: false, error: "not selected" },
      whoisjson: { ok: false, error: "HTTP 503" },
      summary: "Domain example.org: whoisjson returned no usable surface",
    };
    expect(domainSurfaceExecutionStatus(empty, "whoisjson")).toBe("error");
  });

  it("records provider status and source provenance on the Investigator action", () => {
    const coreSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"),
      "utf8",
    );
    const start = coreSource.indexOf('if (action.action === "domain_lookup")');
    const end = coreSource.indexOf('if (action.action === "registry_search")', start);
    const handler = coreSource.slice(start, end);
    expect(handler).toContain("domainSurfaceExecutionStatus(result, action.provider)");
    expect(handler).toContain("record.observedUrls = sourceUrl ? [sourceUrl] : []");
    expect(handler).toContain("PROVIDER_ERROR:");
  });
});
