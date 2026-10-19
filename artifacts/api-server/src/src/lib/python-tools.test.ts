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
import { runMaigret, runSherlock, runSpiderFoot, runTheHarvester } from "./python-tools";

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
