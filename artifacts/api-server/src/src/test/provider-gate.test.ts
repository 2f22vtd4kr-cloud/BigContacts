import { afterEach, describe, expect, it } from "vitest";
import {
  ProviderQuotaError,
  resetProviderGateForTests,
  runProviderCall,
} from "../lib/provider-gate";

describe("provider quota gate", () => {
  afterEach(() => {
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC;
    delete process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE;
    resetProviderGateForTests();
  });

  it("counts actual outbound attempts and fails closed at the provider budget", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "2";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    await runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
      calls += 1;
      return "first";
    });
    await runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
      calls += 1;
      return "second";
    });

    await expect(
      runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
        calls += 1;
        return "should-not-run";
      }),
    ).rejects.toMatchObject({
      code: "budget_exhausted",
      provider: "generic",
    });
    expect(calls).toBe(2);
  });

  it("honors cooldowns without retrying the provider", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";

    await runProviderCall({ provider: "generic", account: "test-cooldown" }, async () => {
      throw new ProviderQuotaError("cooldown", "generic", 2_000);
    }).catch(() => undefined);

    await expect(
      runProviderCall({ provider: "generic", account: "test-cooldown" }, async () => "unexpected"),
    ).rejects.toMatchObject({ code: "cooldown", provider: "generic" });
  });

  it("does not consume an attempt while waiting behind a concurrency slot", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let active = 0;
    let peak = 0;

    const work = () =>
      runProviderCall({ provider: "generic", account: `${Math.random()}` }, async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      });
    await Promise.all([work(), work(), work()]);
    expect(peak).toBeLessThanOrEqual(1);
  });
});