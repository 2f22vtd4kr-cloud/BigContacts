import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const discoverSource = readFileSync(new URL("../pages/board-discover.tsx", import.meta.url), "utf8");

describe("board Discover source availability", () => {
  it("does not treat unknown provider states as configured", () => {
    expect(discoverSource).toContain('slot.state === "active"');
    expect(discoverSource).toContain('slot.state === "rate_limited" || slot.state === "exhausted"');
    expect(discoverSource).toContain('return "Unavailable"');
  });

  it("requires a production-reviewed registry with an implemented runtime adapter", () => {
    expect(discoverSource).toContain('reviewedRegistries.filter((source) => source.runtimeAdapterImplemented === true)');
    expect(discoverSource).toContain("const registryAdapterReady = availableRegistries.length > 0");
    expect(discoverSource).toContain("Production reviewed; runtime adapter unavailable");
    expect(discoverSource).toContain('status: webConfigured ? "Configured" : rateLimitedProviders.length > 0 ? "Rate-limited" : "Unavailable"');
    expect(discoverSource).toContain("All configured providers are rate-limited");
    expect(discoverSource).toContain('status: registryAdapterReady ? "Adapter ready" : "Unavailable"');
    expect(discoverSource).toContain('status: footprintAvailable ? "Available" : "Unavailable"');
  });
});
