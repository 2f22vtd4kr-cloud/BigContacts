import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllPermanentClients: vi.fn(),
  markClientExhausted: vi.fn(),
  invalidateActiveJobCache: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("../lib/redis", () => ({
  getAllPermanentClients: mocks.getAllPermanentClients,
  markClientExhausted: mocks.markClientExhausted,
}));
vi.mock("../lib/job-queue", () => ({ invalidateActiveJobCache: mocks.invalidateActiveJobCache }));
vi.mock("../lib/logger", () => ({
  logger: { warn: mocks.warn, error: mocks.error, info: mocks.info, debug: mocks.debug },
}));
vi.mock("@workspace/db", () => ({
  db: { update: vi.fn() },
  researchCasesTable: { id: {}, status: {}, caseFile: {}, currentAction: {}, updatedAt: {} },
}));

import { fenceStaleCanonicalJob, isCanonicalJobOwner } from "../lib/canonical-job-lock";

const canonicalRedis = { get: vi.fn(), eval: vi.fn() };

describe("canonical lease owner read retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canonicalRedis.get.mockReset();
    canonicalRedis.eval.mockReset();
    mocks.getAllPermanentClients.mockReturnValue([canonicalRedis]);
  });

  it("terminalizes an interrupted prior job only while the caller owns the current lease", async () => {
    canonicalRedis.eval.mockResolvedValueOnce(1);

    await expect(fenceStaleCanonicalJob("atlas-run", "old-job", "new-job")).resolves.toBe("fenced");
    expect(canonicalRedis.eval).toHaveBeenCalledTimes(1);
    const [script, keyCount, activeKey, staleJobKey, currentJobId, message, finishedAt] = canonicalRedis.eval.mock.calls[0]!;
    expect(script).toContain("owner~=ARGV[1]");
    expect(script).toContain("'status','failed'");
    expect(script).toContain("status=='done' or status=='failed' or status=='cancelled'");
    expect(keyCount).toBe(2);
    expect(activeKey).toBe("apex:activejob:atlas-run");
    expect(staleJobKey).toBe("apex:job:old-job");
    expect(currentJobId).toBe("new-job");
    expect(message).toContain("stale job fenced");
    expect(typeof finishedAt).toBe("string");
  });

  it("keeps a missing or already-terminal stale job distinct from a newly fenced job", async () => {
    canonicalRedis.eval.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    await expect(fenceStaleCanonicalJob("atlas-run", "missing-job", "new-job")).resolves.toBe("missing");
    await expect(fenceStaleCanonicalJob("atlas-run", "done-job", "new-job")).resolves.toBe("terminal");
    expect(canonicalRedis.eval).toHaveBeenCalledTimes(2);
  });

  it("refuses stale-job fencing when canonical lease ownership is uncertain or has changed", async () => {
    canonicalRedis.eval.mockResolvedValueOnce(-1);
    await expect(fenceStaleCanonicalJob("atlas-run", "old-job", "not-current-owner"))
      .rejects.toThrow("lease changed during stale-job reconciliation");
  });

  it("rejects an attempt to fence the current job as stale", async () => {
    await expect(fenceStaleCanonicalJob("atlas-run", "same-job", "same-job"))
      .rejects.toThrow("distinct job owners");
    expect(canonicalRedis.eval).not.toHaveBeenCalled();
  });

  it("retries a transient transport failure against the same canonical client", async () => {
    canonicalRedis.get
      .mockRejectedValueOnce(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce("job-17");

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).resolves.toBe(true);
    expect(canonicalRedis.get).toHaveBeenCalledTimes(2);
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(1, "apex:activejob:atlas-run");
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(2, "apex:activejob:atlas-run");
    expect(mocks.getAllPermanentClients).toHaveBeenCalledTimes(2);
  });

  it("retries the explicit NETWORK_ERROR transport code using the same authoritative client", async () => {
    canonicalRedis.get
      .mockRejectedValueOnce(Object.assign(new Error("network request failed"), { code: "NETWORK_ERROR" }))
      .mockResolvedValueOnce("job-17");

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).resolves.toBe(true);
    expect(canonicalRedis.get).toHaveBeenCalledTimes(2);
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(1, "apex:activejob:atlas-run");
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(2, "apex:activejob:atlas-run");
  });

  it("retries an uncoded fetch/network transport failure at the same owner-read boundary", async () => {
    canonicalRedis.get
      .mockRejectedValueOnce(new Error("fetch failed: network connection temporarily unavailable"))
      .mockResolvedValueOnce("job-17");

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).resolves.toBe(true);
    expect(canonicalRedis.get).toHaveBeenCalledTimes(2);
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(1, "apex:activejob:atlas-run");
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(2, "apex:activejob:atlas-run");
  });
  it("does not retry NETWORK_ERROR when the diagnostic identifies quota exhaustion", async () => {
    canonicalRedis.get.mockRejectedValueOnce(Object.assign(new Error("network error: monthly quota exceeded"), { code: "NETWORK_ERROR" }));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("monthly quota exceeded");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(1);
  });
  it("recovers when the first two bounded reads hit transient transport failures", async () => {
    canonicalRedis.get
      .mockRejectedValueOnce(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }))
      .mockRejectedValueOnce(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce("job-17");

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).resolves.toBe(true);
    expect(canonicalRedis.get).toHaveBeenCalledTimes(3);
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(1, "apex:activejob:atlas-run");
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(2, "apex:activejob:atlas-run");
    expect(canonicalRedis.get).toHaveBeenNthCalledWith(3, "apex:activejob:atlas-run");
  });

  it("keeps ownership unknown when the bounded transient retry budget is exhausted", async () => {
    canonicalRedis.get.mockRejectedValue(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("Canonical Atlas Redis lock command failed");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(3);
  });

  it("never retries canonical quota/capacity failures", async () => {
    canonicalRedis.get.mockRejectedValueOnce(new Error("max requests limit exceeded"));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("max requests limit exceeded");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(1);
    expect(mocks.markClientExhausted).toHaveBeenCalledWith(canonicalRedis);
  });

  it("does not retry network-worded command-policy failures", async () => {
    canonicalRedis.get.mockRejectedValueOnce(new Error("network command is not allowed by policy"));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("network command is not allowed by policy");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-transport command failures", async () => {
    canonicalRedis.get.mockRejectedValueOnce(new Error("WRONGTYPE command rejected"));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("WRONGTYPE command rejected");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(1);
  });
});
