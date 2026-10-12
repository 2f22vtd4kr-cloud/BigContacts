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

import { isCanonicalJobOwner } from "../lib/canonical-job-lock";

const canonicalRedis = { get: vi.fn() };

describe("canonical lease owner read retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canonicalRedis.get.mockReset();
    mocks.getAllPermanentClients.mockReturnValue([canonicalRedis]);
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

  it("does not retry non-transport command failures", async () => {
    canonicalRedis.get.mockRejectedValueOnce(new Error("WRONGTYPE command rejected"));

    await expect(isCanonicalJobOwner("atlas-run", "job-17")).rejects.toThrow("WRONGTYPE command rejected");
    expect(canonicalRedis.get).toHaveBeenCalledTimes(1);
  });
});
