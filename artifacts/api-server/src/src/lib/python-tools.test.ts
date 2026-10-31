import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./python-osint-worker-client", () => ({
  executePythonOsintTool: vi.fn(),
  refreshPythonOsintToolAvailability: vi.fn(),
}));
import {
  executePythonOsintTool,
  refreshPythonOsintToolAvailability,
  type PythonOsintToolResponse,
} from "./python-osint-worker-client";
import { runHolehe, runMaigret, runSherlock, runSpiderFoot, runTheHarvester } from "./python-tools";

const mockedExecute = vi.mocked(executePythonOsintTool);
const mockedRefresh = vi.mocked(refreshPythonOsintToolAvailability);

function result(tool: PythonOsintToolResponse["tool"], status: PythonOsintToolResponse["status"], payload: Record<string, unknown> | null, error: string | null = null): PythonOsintToolResponse {
  return {
    requestId: "00000000-0000-4000-8000-000000000001",
    tool,
    status,
    toolVersion: "test-version",
    result: payload,
    error,
    startedAt: "2026-10-19T00:00:00.000Z",
    finishedAt: "2026-10-19T00:00:01.000Z",
  };
}

beforeEach(() => {
  mockedExecute.mockReset();
  mockedRefresh.mockReset();
  mockedRefresh.mockResolvedValue({
    holehe: false, maigret: false, sherlock: false, theharvester: false, spiderfoot: false,
  });
});

describe("canonical Python tool adapters", () => {
  it("keeps a completed zero-result SpiderFoot scan distinct from an execution failure", async () => {
    mockedExecute.mockResolvedValueOnce(result("spiderfoot", "completed", { observations: [], eventsReceived: 0, partial: false }));

    const outcome = await runSpiderFoot("example.com", "domain", "domain-infrastructure");

    expect(outcome.available).toBe(true);
    expect(outcome.observations).toEqual([]);
    expect(outcome.eventsReceived).toBe(0);
    expect(outcome.execution).toMatchObject({ requestId: "00000000-0000-4000-8000-000000000001", status: "completed", toolVersion: "test-version" });
  });

  it("passes a grounded public phone seed to SpiderFoot without making the tool globally available", async () => {
    mockedExecute.mockResolvedValueOnce(result("spiderfoot", "completed", {
      observations: [], eventsReceived: 0, partial: false,
    }));

    const outcome = await runSpiderFoot("+12125550198", "phone", "contact-adjacent");

    expect(mockedExecute).toHaveBeenCalledWith(expect.objectContaining({
      tool: "spiderfoot",
      args: { target: "+12125550198", targetType: "phone", profile: "contact-adjacent" },
    }));
    expect(outcome.targetType).toBe("phone");
    expect(outcome.available).toBe(true);
  });

  it("does not label an empty partial SpiderFoot scan as successful research", async () => {
    mockedExecute.mockResolvedValueOnce(result("spiderfoot", "partial", { observations: [], eventsReceived: 0, partial: true }, "scan ended early"));

    const outcome = await runSpiderFoot("example.com", "domain", "domain-infrastructure");

    expect(outcome.available).toBe(false);
    expect(outcome.partial).toBe(true);
    expect(outcome.error).toBe("scan ended early");
    expect(outcome.execution?.status).toBe("partial");
  });

  it("preserves partial Maigret results and their execution metadata", async () => {
    mockedExecute.mockResolvedValueOnce(result("maigret", "partial", {
      found: [{ siteName: "Example", url: "https://example.test/alice", status: "found" }],
      totalSitesChecked: 5,
    }, "some sites timed out"));

    const outcome = await runMaigret("alice");

    expect(outcome.available).toBe(true);
    expect(outcome.error).toBe("some sites timed out");
    expect(outcome.found[0]).toMatchObject({ siteName: "Example", status: "found", url: "https://example.test/alice" });
    expect(outcome.execution?.status).toBe("partial");
  });

  it("does not convert an empty partial theHarvester report into a successful result", async () => {
    mockedExecute.mockResolvedValueOnce(result("theharvester", "partial", {
      emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0,
    }, "report could not be parsed"));

    const outcome = await runTheHarvester("example.com");

    expect(outcome.available).toBe(false);
    expect(outcome.error).toBe("report could not be parsed");
  });

  it("preserves Holehe platform results as leads, including per-platform uncertainty", async () => {
    mockedExecute.mockResolvedValueOnce(result("holehe", "completed", {
      found: [{ name: "Example", domain: "example.test", exists: true, error: false, rateLimit: false }],
      totalChecked: 1, totalFound: 1,
    }));

    const outcome = await runHolehe("Alice@Example.test");

    expect(outcome.available).toBe(true);
    expect(outcome.email).toBe("alice@example.test");
    expect(outcome.found).toMatchObject([{ name: "Example", exists: true }]);
    expect(outcome.execution?.status).toBe("completed");
  });

  it("preserves per-service Holehe errors and rate limits as inconclusive, not negative, results", async () => {
    mockedExecute.mockResolvedValueOnce(result("holehe", "partial", {
      found: [
        { name: "Positive Service", domain: "positive.example", exists: true, error: false, rateLimit: false },
        { name: "Rate Limited Service", domain: "limited.example", exists: false, error: false, rateLimit: true },
        { name: "Errored Service", domain: "error.example", exists: false, error: true, rateLimit: false },
        { name: "Negative Service", domain: "negative.example", exists: false, error: false, rateLimit: false },
      ],
      totalChecked: 4,
      totalFound: 1,
    }, "Holehe returned 1 service error and 1 rate-limit event."));

    const outcome = await runHolehe("research@example.test");

    expect(outcome.execution?.status).toBe("partial");
    expect(outcome.found).toMatchObject([
      { name: "Positive Service", exists: true },
      { name: "Rate Limited Service", exists: false, error: true, rateLimit: true },
      { name: "Errored Service", exists: false, error: true },
      { name: "Negative Service", exists: false },
    ]);
    // The canonical ReAct summary uses error to distinguish an inconclusive
    // service response from a genuine negative/unknown platform result.
    expect(outcome.found[1]?.error).toBe(true);
    expect(outcome.found[2]?.error).toBe(true);
    expect(outcome.found[3]?.error).toBeUndefined();
  });

  it("preserves the worker's full bounded Holehe result set", async () => {
    const platforms = Array.from({ length: 150 }, (_, index) => ({
      name: "Service " + index, domain: "service-" + index + ".test", exists: false, error: false, rateLimit: false,
    }));
    mockedExecute.mockResolvedValueOnce(result("holehe", "completed", {
      found: platforms, totalChecked: 250, totalFound: 0, truncated: false,
    }));

    const outcome = await runHolehe("research@example.test");

    expect(outcome.found).toHaveLength(150);
    expect(outcome.found[0]?.name).toBe("Service 0");
    expect(outcome.found[149]?.name).toBe("Service 149");
    expect(outcome.totalChecked).toBe(250);
    expect(outcome.execution?.status).toBe("completed");
  });

  it("normalizes SpiderFoot lineage and strips URL secrets while keeping URLs as leads", async () => {
    mockedExecute.mockResolvedValueOnce(result("spiderfoot", "completed", {
      scanId: "scan-123", target: "example.test", targetType: "domain", profile: "domain-infrastructure",
      eventsReceived: 2, partial: false,
      observations: [
        { scanId: "scan-123", value: "https://example.test/profile", eventType: "URL", sourceModule: "sfp_googlesearch",
          observedAt: "2026-10-19T09:00:00Z", sourceUrl: "https://example.test/?token=secret-value", parentEventId: "event-parent-1" },
        { scanId: "scan-123", value: "bad-url", eventType: "URL", sourceModule: "sfp_googlesearch",
          observedAt: "2026-10-19T09:00:01Z", sourceUrl: "javascript:alert(1)" },
      ],
    }));

    const outcome = await runSpiderFoot("example.test", "domain", "domain-infrastructure");

    expect(outcome.scanId).toBe("scan-123");
    expect(outcome.observations).toHaveLength(2);
    expect(outcome.observations[0]).toMatchObject({ scanId: "scan-123", parentEventId: "event-parent-1", sourceModule: "sfp_googlesearch" });
    expect(outcome.observations[0]?.sourceUrl).not.toContain("secret-value");
    expect(outcome.observations[1]?.sourceUrl).toBeUndefined();
    expect(outcome.available).toBe(true);
  });

  it("strips credentials and sensitive query parameters from account-profile candidate URLs", async () => {
    mockedExecute.mockResolvedValueOnce(result("sherlock", "completed", {
      found: [{ siteName: "Example", url: "https://alice:password@social.example/alice?token=secret&view=public" }],
      totalSitesChecked: 1,
    }));
    const sherlock = await runSherlock("alice");
    expect(sherlock.found[0]?.url).not.toContain("password");
    expect(sherlock.found[0]?.url).not.toContain("secret");
    expect(sherlock.found[0]?.url).toContain("view=public");

    mockedExecute.mockResolvedValueOnce(result("maigret", "completed", {
      found: [{ siteName: "Example", url: "javascript:alert(1)", status: "found", profileData: { biography: "See https://example.test/?api_key=hidden" } }],
      totalSitesChecked: 1,
    }));
    const maigret = await runMaigret("alice");
    expect(maigret.found[0]?.url).toBeUndefined();
    expect(maigret.found[0]?.profileData?.biography).not.toContain("hidden");
  });

  it("preserves positive Sherlock profile URLs as review-only profile candidates", async () => {
    mockedExecute.mockResolvedValueOnce(result("sherlock", "completed", {
      found: [{ siteName: "Example", url: "https://social.example/alice" }],
      totalSitesChecked: 10,
    }));

    const outcome = await runSherlock("alice");

    expect(outcome.available).toBe(true);
    expect(outcome.reviewOnly).toBe(true);
    expect(outcome.found).toEqual([{ siteName: "Example", url: "https://social.example/alice", status: "found" }]);
    expect(outcome.execution?.toolVersion).toBe("test-version");
  });
});
