import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceCatalog = readFileSync(new URL("../pages/data-sources.tsx", import.meta.url), "utf8");

describe("data-source catalogue availability and privacy claims", () => {
  it("describes live ADS-B as coarse latest-status enrichment, not flight tracking", () => {
    expect(sourceCatalog).toContain("Latest public aircraft status only");
    expect(sourceCatalog).toContain("Exact positions, callsigns, track bearings and historical routes are not retained");
  });

  it("keeps historical flight traces explicitly disabled", () => {
    expect(sourceCatalog).toContain('label: "ADS-B Historical Flight Traces (disabled)"');
    expect(sourceCatalog).toContain("Disabled by privacy policy");
    expect(sourceCatalog).not.toContain("Available through the canonical Investigator when model-selected");
  });

  it("does not advertise the retired deterministic contact harvester as an active source", () => {
    expect(sourceCatalog).toContain('label: "Legacy In-House Contact Enricher (retired)"');
    expect(sourceCatalog).toContain("The API endpoint returns HTTP 410");
    expect(sourceCatalog).not.toContain("Run after Web OSINT Enrich for best coverage");
  });

  it("makes attested worker requirements explicit for identity-footprint actions", () => {
    expect(sourceCatalog).toContain("only after fresh signed worker attestation");
    expect(sourceCatalog).toContain("Not a direct canonical Investigator action in this deployment");
  });

  it("does not claim that retired bulk enrichment automatically reconciles offshore data", () => {
    expect(sourceCatalog).not.toContain("Runs automatically during in-house enrichment");
    expect(sourceCatalog).toContain("No dedicated ICIJ adapter is exposed");
  });

  it("keeps semantic embedding maintenance manual and unable to bypass its job lock", () => {
    expect(sourceCatalog).toContain("Manual operator-triggered maintenance only; no startup schedule is registered");
    expect(sourceCatalog).toContain("bodyParams: { batchSize: 50000, rebuild: true }");
    expect(sourceCatalog).not.toContain("Auto-triggered at 4 min and 32 min after boot");
    expect(sourceCatalog).not.toContain("force: true");
  });
});
